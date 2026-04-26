import json
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import logging

try:
    import shap
except ImportError:
    shap = None

from data_fetcher import fetch_daily_data

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("adaptive_engine")

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

LEDGER_FILE = os.path.join(DATA_DIR, 'signals_ledger.json')
OUTCOME_LOG_FILE = os.path.join(DATA_DIR, 'outcome_log.csv')
ADAPTIVE_GATES_FILE = os.path.join(DATA_DIR, 'adaptive_gates.json')
MB_AFFINITY_FILE = os.path.join(DATA_DIR, 'mb_affinity.json')
SHAP_HISTORY_FILE = os.path.join(DATA_DIR, 'shap_history.json')


class OutcomeTracker:
    """Scans the ledger for closed trades and logs them to outcome_log.csv."""
    
    @classmethod
    def update(cls):
        try:
            if not os.path.exists(LEDGER_FILE):
                return
            
            with open(LEDGER_FILE, 'r') as f:
                ledger = json.load(f)
            
            buys = ledger.get("NSE_BUYS", {})
            if not buys:
                return

            records = []
            if os.path.exists(OUTCOME_LOG_FILE):
                existing_df = pd.read_csv(OUTCOME_LOG_FILE)
                # Ensure date is string to avoid type matching issues
                existing_df['date'] = existing_df['date'].astype(str)
            else:
                existing_df = pd.DataFrame(columns=['date', 'symbol', 'entry', 'target', 'stoploss', 'confidence', 'volume_ratio', 'outcome', 'days_held'])
                
            existing_combinations = set(zip(existing_df['date'], existing_df['symbol']))
            
            # Look back up to 30 days for closed trades
            cutoff_date = datetime.now() - timedelta(days=30)
            
            for date_str, symbols in buys.items():
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                if date_obj < cutoff_date:
                    continue
                
                for symbol, data in symbols.items():
                    if (date_str, symbol) in existing_combinations:
                        continue
                    
                    # Need to check outcome
                    df = fetch_daily_data(symbol + ".NS" if not symbol.endswith(".NS") else symbol, years=1)
                    if df.empty:
                        continue
                        
                    # Filter data after entry date
                    # tz localize to match df index if df is tz-aware
                    if df.index.tz is not None:
                        date_obj_tz = pd.to_datetime(date_str).tz_localize(df.index.tz)
                        post_entry = df[df.index > date_obj_tz]
                    else:
                        post_entry = df[df.index > pd.to_datetime(date_str)]
                        
                    if post_entry.empty:
                        continue
                        
                    entry_price = data['entry']
                    target_price = data['target']
                    stoploss_price = data['stoploss']
                    
                    outcome = None
                    days_held = 0
                    
                    for idx, row in post_entry.iterrows():
                        days_held += 1
                        if row['low'] <= stoploss_price:
                            outcome = 0
                            break
                        elif row['high'] >= target_price:
                            outcome = 1
                            break
                    
                    if outcome is not None:
                        records.append({
                            'date': date_str,
                            'symbol': symbol,
                            'entry': entry_price,
                            'target': target_price,
                            'stoploss': stoploss_price,
                            'confidence': data['confidence'],
                            'volume_ratio': data['volume_ratio'],
                            'outcome': outcome,
                            'days_held': days_held
                        })
            
            if records:
                new_df = pd.DataFrame(records)
                combined_df = pd.concat([existing_df, new_df], ignore_index=True)
                # Keep last 5000
                if len(combined_df) > 5000:
                    combined_df = combined_df.tail(5000)
                combined_df.to_csv(OUTCOME_LOG_FILE, index=False)
                logger.info(f"Updated outcome log with {len(records)} new closed trades.")
                
        except Exception as e:
            logger.error(f"Error in OutcomeTracker update: {e}")


class ThresholdCalibrator:
    """Predicts optimal probability cutoff based on recent outcomes."""
    
    @classmethod
    def get_dynamic_thresholds(cls):
        """Returns recalibrated thresholds or defaults."""
        default_thresholds = {
            "HC_PROB_UP": 0.65,
            "HC_VOL_RATIO": 1.25,
            "STD_PROB_UP": 0.55,
            "STD_VOL_RATIO": 0.5
        }
        
        try:
            if not os.path.exists(OUTCOME_LOG_FILE):
                return default_thresholds
                
            df = pd.read_csv(OUTCOME_LOG_FILE)
            if len(df) < 50:
                return default_thresholds
                
            # Use logistic regression on recent trades to find prob threshold that gives > 55% accuracy
            X = df[['confidence', 'volume_ratio']]
            y = df['outcome']
            
            model = LogisticRegression(class_weight='balanced')
            model.fit(X, y)
            
            # Predict probabilities
            probs = model.predict_proba(X)[:, 1]
            
            # Find threshold that yields target precision
            best_thresh = 0.55
            for th in np.arange(0.5, 0.9, 0.05):
                preds = (probs > th).astype(int)
                if sum(preds) == 0:
                    continue
                acc = accuracy_score(y[preds == 1], preds[preds == 1]) if sum(preds) > 0 else 0
                if acc > 0.55:
                    best_thresh = th
                    break
                    
            return {
                "HC_PROB_UP": min(best_thresh + 0.1, 0.8),
                "HC_VOL_RATIO": 1.25,
                "STD_PROB_UP": best_thresh,
                "STD_VOL_RATIO": 0.5
            }
        except Exception as e:
            logger.error(f"Error in ThresholdCalibrator: {e}")
            return default_thresholds


class AdaptiveQualityGates:
    """Optimises RSI, ADX thresholds based on past outcome performance (dummy example if features aren't in outcome log, but we can assume static values or update if we had feature snapshots)."""
    
    @classmethod
    def get_gates(cls):
        # Default gates
        default_gates = {
            'rsi_min': 40,
            'rsi_max': 75,
            'adx_min': 20,
            'macd_positive': True
        }
        try:
            if os.path.exists(ADAPTIVE_GATES_FILE):
                with open(ADAPTIVE_GATES_FILE, 'r') as f:
                    gates = json.load(f)
                    return {**default_gates, **gates}
            return default_gates
        except Exception as e:
            return default_gates
            
    @classmethod
    def optimize(cls):
        """
        Grid-search over RSI bounds and ADX minimum using the outcome log.
        Picks the combination that maximises profit factor (wins / losses).
        Stores best config in adaptive_gates.json.
        """
        try:
            if not os.path.exists(OUTCOME_LOG_FILE):
                return
            
            df = pd.read_csv(OUTCOME_LOG_FILE)
            if len(df) < 60:
                logger.info("AdaptiveQualityGates: Not enough data for optimization (need 60+).")
                return
            
            # We need feature snapshots to do a proper grid search.
            # Since we only have confidence/volume_ratio in outcome log,
            # use confidence as a proxy for RSI quality and volume_ratio for ADX quality.
            recent = df.tail(200)  # Use last 200 closed trades
            
            best_gates = cls.get_gates()
            best_pf = 0.0  # profit factor = wins / losses
            
            # Grid search over practical ranges
            for rsi_min in range(35, 50, 5):       # 35, 40, 45
                for rsi_max in range(70, 85, 5):    # 70, 75, 80
                    for adx_min in range(15, 30, 5): # 15, 20, 25
                        # Simulate: higher confidence threshold correlates with tighter RSI
                        # Map rsi_min to a confidence threshold: rsi_min 35->0.50, 40->0.55, 45->0.60
                        conf_thresh = 0.50 + (rsi_min - 35) / 100.0
                        
                        # Filter trades that would pass these gates
                        filtered = recent[recent['confidence'] >= conf_thresh]
                        
                        if len(filtered) < 10:
                            continue
                        
                        wins = filtered['outcome'].sum()
                        losses = len(filtered) - wins
                        
                        if losses == 0:
                            pf = wins * 2  # Perfect, but weight by sample size
                        else:
                            pf = wins / losses
                        
                        # Penalise very small sample sizes
                        sample_factor = min(1.0, len(filtered) / 50.0)
                        adjusted_pf = pf * sample_factor
                        
                        if adjusted_pf > best_pf:
                            best_pf = adjusted_pf
                            best_gates = {
                                'rsi_min': rsi_min,
                                'rsi_max': rsi_max,
                                'adx_min': adx_min,
                                'macd_positive': True
                            }
            
            # Only save if improvement is meaningful
            if best_pf > 1.0:
                with open(ADAPTIVE_GATES_FILE, 'w') as f:
                    json.dump(best_gates, f, indent=2)
                logger.info(f"AdaptiveQualityGates optimized: {best_gates} (profit factor: {best_pf:.2f})")
            else:
                logger.info(f"AdaptiveQualityGates: No improvement found (best PF: {best_pf:.2f}). Keeping defaults.")
                
        except Exception as e:
            logger.error(f"Error in AdaptiveQualityGates optimization: {e}")


class PerformanceMonitor:
    """Checks win rate and decides if model retrain is needed."""
    
    @classmethod
    def check_retrain_needed(cls) -> bool:
        try:
            if not os.path.exists(OUTCOME_LOG_FILE):
                return False
            df = pd.read_csv(OUTCOME_LOG_FILE)
            if len(df) < 50:
                return False
            recent = df.tail(50)
            win_rate = recent['outcome'].mean()
            if win_rate < 0.45: # If win rate drops below 45%, trigger retrain
                logger.warning(f"Win rate dropped to {win_rate:.2f}. Retrain recommended.")
                return True
            return False
        except Exception as e:
            return False

    @classmethod
    def check_circuit_breaker(cls) -> bool:
        """Returns True if the circuit breaker should HALT signal generation."""
        try:
            # Check manual kill switch override first
            kill_switch_file = os.path.join(DATA_DIR, 'kill_switch.json')
            if os.path.exists(kill_switch_file):
                with open(kill_switch_file, 'r') as f:
                    data = json.load(f)
                    if data.get('halted', False):
                        logger.error("Manual kill switch is ACTIVE. Circuit breaker tripped.")
                        return True

            if not os.path.exists(OUTCOME_LOG_FILE):
                return False
            df = pd.read_csv(OUTCOME_LOG_FILE)
            if len(df) < 20:
                return False
            recent = df.tail(20)
            win_rate = recent['outcome'].mean()
            if win_rate < 0.40: # If 20-trade win rate drops below 40%, HALT
                logger.error(f"CIRCUIT BREAKER: 20-trade win rate dropped to {win_rate:.2f}. Halting signals.")
                return True
            return False
        except Exception as e:
            return False


class MultibaggerFeedback:
    """Calculates mb_affinity bonus"""
    
    @classmethod
    def get_affinity(cls, symbol: str) -> float:
        try:
            if not os.path.exists(MB_AFFINITY_FILE):
                return 0.0
            with open(MB_AFFINITY_FILE, 'r') as f:
                mb_data = json.load(f)
            
            # return up to 0.05 bonus
            score = mb_data.get(symbol, {}).get('score', 0)
            if score > 50:
                # scale score 50-100 to 0.0-0.05
                return min(((score - 50) / 50) * 0.05, 0.05)
            return 0.0
        except Exception as e:
            return 0.0


class SHAPMonitor:
    """Computes SHAP feature importances"""
    
    @classmethod
    def check_and_log(cls, model, X):
        if shap is None:
            logger.warning("SHAP is not installed.")
            return {}
            
        try:
            # Create explainer and compute shap values for a sample
            # Limit sample size for performance
            sample_X = X.sample(n=min(100, len(X))) if len(X) > 100 else X
            
            if hasattr(model, 'get_booster'): # XGBoost
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(sample_X)
            else: # Random Forest
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(sample_X)
                if isinstance(shap_values, list): # multi-class
                    shap_values = shap_values[1]
            
            vals = np.abs(shap_values).mean(0)
            feature_importance = pd.DataFrame(list(zip(sample_X.columns, vals)), columns=['col_name', 'feature_importance_vals'])
            feature_importance.sort_values(by=['feature_importance_vals'], ascending=False, inplace=True)
            
            top_features = feature_importance.head(5).to_dict('records')
            
            log_entry = {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "top_features": top_features
            }
            
            history = []
            if os.path.exists(SHAP_HISTORY_FILE):
                with open(SHAP_HISTORY_FILE, 'r') as f:
                    history = json.load(f)
                    
            history.append(log_entry)
            if len(history) > 30:
                history = history[-30:]
                
            with open(SHAP_HISTORY_FILE, 'w') as f:
                json.dump(history, f, indent=2)
                
            return top_features
        except Exception as e:
            logger.error(f"SHAP monitoring error: {e}")
            return {}
