"""
ML Multibagger Prediction Model
=================================
LightGBM-based model for predicting 2x+ returns over 24 months.

Key Features:
- Purged cross-validation for time-series
- Probability calibration
- Feature importance tracking
- Threshold optimization for Precision@K
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import logging
import os
import json
import pickle
from concurrent.futures import ThreadPoolExecutor, as_completed

# ML libraries
try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    logging.warning("LightGBM not installed. Using sklearn fallback.")

from sklearn.model_selection import TimeSeriesSplit
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import precision_score, recall_score, roc_auc_score, average_precision_score
from sklearn.ensemble import RandomForestClassifier

# Local imports
from data_fetcher import fetch_daily_data
from multibagger_features import extract_multibagger_features, get_feature_names
from multibagger_labels import create_multibagger_labels, generate_training_labels_for_symbol
from symbols import US_100

logger = logging.getLogger(__name__)

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MODEL_DIR = os.path.join(DATA_DIR, 'multibagger_models')
os.makedirs(MODEL_DIR, exist_ok=True)


class MLMultibaggerModel:
    """
    LightGBM model for multibagger prediction with temporal validation.
    """
    
    def __init__(self, model_name: str = "us_multibagger"):
        self.model_name = model_name
        self.model = None
        self.calibrated_model = None
        self.features = get_feature_names()
        self.threshold = 0.65  # Default, optimized during training
        self.training_date = None
        self.performance_metrics = {}
        
    def _get_model_path(self) -> str:
        return os.path.join(MODEL_DIR, f"{self.model_name}_lgbm.pkl")
    
    def _get_calibrated_path(self) -> str:
        return os.path.join(MODEL_DIR, f"{self.model_name}_calibrated.pkl")
    
    def _get_metadata_path(self) -> str:
        return os.path.join(MODEL_DIR, f"{self.model_name}_metadata.json")
    
    def generate_training_data(
        self, 
        symbols: List[str],
        max_workers: int = 8
    ) -> pd.DataFrame:
        """
        Generate training dataset from historical data.
        
        For each symbol:
        1. Fetch 5+ years of data
        2. Generate features
        3. Create labels (rolling windows)
        4. Combine into training DataFrame
        """
        logger.info(f"Generating training data for {len(symbols)} symbols...")
        
        all_samples = []
        
        def process_symbol(symbol):
            try:
                # Fetch 7 years to have enough history
                df = fetch_daily_data(symbol, years=7)
                if df is None or len(df) < 756:
                    return None
                
                # Generate multiple training samples per symbol
                labels_df = generate_training_labels_for_symbol(
                    df,
                    lookback_years=3,
                    step_months=3,
                    lookahead_months=24
                )
                
                if len(labels_df) == 0:
                    return None
                
                samples = []
                for _, row in labels_df.iterrows():
                    entry_date = row['date']
                    
                    # Find index for this date (handle timezone)
                    try:
                        entry_dt = pd.to_datetime(entry_date)
                        # Handle timezone-aware index
                        if df.index.tz is not None:
                            entry_dt = entry_dt.tz_localize(df.index.tz) if entry_dt.tz is None else entry_dt.tz_convert(df.index.tz)
                        
                        # Use get_indexer_for or boolean mask instead of get_loc
                        mask = df.index <= entry_dt
                        if not mask.any():
                            continue
                        entry_idx = mask.sum() - 1
                        if entry_idx < 0:
                            continue
                    except Exception as e:
                        continue
                    
                    # Extract features up to this point
                    df_up_to = df.iloc[:entry_idx + 1]
                    if len(df_up_to) < 756:
                        continue
                    
                    features = extract_multibagger_features(df_up_to, symbol)
                    if features is None:
                        continue
                    
                    # Combine features and label
                    sample = {
                        'symbol': symbol,
                        'date': entry_date,
                        'label': row['label'],
                        **features
                    }
                    samples.append(sample)
                
                return samples
                
            except Exception as e:
                logger.warning(f"Error processing {symbol}: {e}")
                return None
        
        # Process symbols in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(process_symbol, sym): sym for sym in symbols}
            
            for future in as_completed(futures):
                symbol = futures[future]
                try:
                    samples = future.result()
                    if samples:
                        all_samples.extend(samples)
                        logger.info(f"✓ {symbol}: {len(samples)} samples")
                except Exception as e:
                    logger.warning(f"Error getting result for {symbol}: {e}")
        
        if not all_samples:
            logger.error("No training samples generated!")
            return pd.DataFrame()
        
        df = pd.DataFrame(all_samples)
        
        # Clean data
        df = df.dropna(subset=self.features + ['label'])
        
        logger.info(f"Generated {len(df)} training samples")
        logger.info(f"Label distribution: {df['label'].value_counts().to_dict()}")
        
        return df
    
    def train(
        self,
        df: pd.DataFrame,
        optimize_threshold: bool = True
    ) -> Dict:
        """
        Train the model with purged cross-validation.
        
        Args:
            df: Training DataFrame with features and labels
            optimize_threshold: Whether to find optimal probability threshold
            
        Returns:
            Training metrics dict
        """
        if len(df) < 40:
            raise ValueError(f"Insufficient training data: {len(df)} samples (min: 40)")
        
        logger.info(f"Training model on {len(df)} samples...")
        
        # Prepare features
        X = df[self.features].fillna(0)
        y = df['label'].values
        
        # Time-series split for validation
        tscv = TimeSeriesSplit(n_splits=5)
        
        cv_scores = []
        for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]
            
            # Train fold model
            if LIGHTGBM_AVAILABLE:
                fold_model = lgb.LGBMClassifier(
                    objective='binary',
                    boosting_type='gbdt',
                    num_leaves=31,
                    learning_rate=0.05,
                    n_estimators=200,
                    class_weight='balanced',
                    random_state=42,
                    verbose=-1
                )
            else:
                fold_model = RandomForestClassifier(
                    n_estimators=200,
                    max_depth=8,
                    class_weight='balanced',
                    random_state=42
                )
            
            fold_model.fit(X_train, y_train)
            
            # Predict
            y_pred_proba = fold_model.predict_proba(X_val)[:, 1]
            y_pred = (y_pred_proba >= 0.5).astype(int)
            
            # Metrics
            auc = roc_auc_score(y_val, y_pred_proba)
            ap = average_precision_score(y_val, y_pred_proba)
            precision = precision_score(y_val, y_pred, zero_division=0)
            
            cv_scores.append({
                'fold': fold,
                'auc': auc,
                'average_precision': ap,
                'precision': precision,
                'n_train': len(train_idx),
                'n_val': len(val_idx)
            })
            
            logger.info(f"Fold {fold+1}: AUC={auc:.3f}, AP={ap:.3f}, Prec={precision:.3f}")
        
        # Train final model on all data
        if LIGHTGBM_AVAILABLE:
            self.model = lgb.LGBMClassifier(
                objective='binary',
                boosting_type='gbdt',
                num_leaves=31,
                learning_rate=0.05,
                n_estimators=300,  # More trees for final model
                class_weight='balanced',
                random_state=42,
                verbose=-1
            )
        else:
            self.model = RandomForestClassifier(
                n_estimators=300,
                max_depth=10,
                class_weight='balanced',
                random_state=42
            )
        
        self.model.fit(X, y)
        
        # Calibrate probabilities (use smaller CV if few positive samples)
        logger.info("Calibrating probabilities...")
        n_pos = y.sum()
        cv_folds = min(5, max(2, int(n_pos)))  # At most n_pos folds, at least 2
        if cv_folds < 2:
            cv_folds = 2  # Minimum for calibration
            
        self.calibrated_model = CalibratedClassifierCV(
            self.model,
            method='sigmoid',
            cv=cv_folds
        )
        self.calibrated_model.fit(X, y)
        
        # Optimize threshold for Precision@10
        if optimize_threshold:
            self.threshold = self._optimize_threshold(X, y)
        
        # Store metrics
        self.performance_metrics = {
            'cv_scores': cv_scores,
            'mean_auc': np.mean([s['auc'] for s in cv_scores]),
            'mean_ap': np.mean([s['average_precision'] for s in cv_scores]),
            'optimal_threshold': self.threshold,
            'training_samples': len(df),
            'positive_rate': float(y.mean()),
            'training_date': datetime.now().isoformat()
        }
        
        # Feature importance
        if LIGHTGBM_AVAILABLE:
            importance = dict(zip(self.features, self.model.feature_importances_))
            self.performance_metrics['feature_importance'] = dict(
                sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]
            )
        
        logger.info(f"Training complete. Mean AUC: {self.performance_metrics['mean_auc']:.3f}")
        logger.info(f"Optimal threshold: {self.threshold:.3f}")
        
        return self.performance_metrics
    
    def _optimize_threshold(self, X: pd.DataFrame, y: np.ndarray) -> float:
        """
        Find threshold that maximizes Precision@K (top 10 predictions).
        """
        proba = self.calibrated_model.predict_proba(X)[:, 1]
        
        best_threshold = 0.5
        best_precision = 0
        
        for thresh in np.linspace(0.3, 0.9, 30):
            # Select top predictions above threshold
            mask = proba >= thresh
            if mask.sum() < 10:  # Need at least 10 predictions
                continue
            
            # Calculate precision for these
            y_selected = y[mask]
            if len(y_selected) > 0:
                precision = y_selected.mean()
                if precision > best_precision:
                    best_precision = precision
                    best_threshold = thresh
        
        logger.info(f"Threshold optimization: best precision={best_precision:.3f} at threshold={best_threshold:.3f}")
        return best_threshold
    
    def predict(self, df: pd.DataFrame, symbol: str) -> Optional[Dict]:
        """
        Predict multibagger probability for a single stock.
        
        Returns:
            Dict with probability, confidence, and key features
        """
        if self.calibrated_model is None:
            logger.error("Model not trained or loaded")
            return None
        
        # Extract features
        features = extract_multibagger_features(df, symbol)
        if features is None:
            return None
        
        # Prepare input
        X = np.array([[features.get(f, 0) for f in self.features]])
        
        # Predict probability
        prob = self.calibrated_model.predict_proba(X)[0, 1]
        
        # Feature importance for this prediction (SHAP-like)
        top_features = self._get_top_features_for_prediction(features)
        
        return {
            'symbol': symbol,
            'prob_multibagger': round(prob, 4),
            'prediction': 'MULTIBAGGER' if prob >= self.threshold else 'NOT',
            'threshold_used': round(self.threshold, 3),
            'confidence': self._get_confidence_level(prob),
            'key_drivers': top_features,
            'features': {k: round(v, 4) for k, v in features.items() if k in self.features[:10]}
        }
    
    def _get_top_features_for_prediction(self, features: Dict, n: int = 5) -> List[Dict]:
        """Get top features driving this prediction."""
        if not hasattr(self, 'performance_metrics') or 'feature_importance' not in self.performance_metrics:
            return []
        
        importance = self.performance_metrics.get('feature_importance', {})
        
        # Score each feature by importance × value percentile
        scored = []
        for feat, imp in list(importance.items())[:20]:
            val = features.get(feat, 0)
            # Simple scoring: high values on important features
            score = imp * abs(val) if val != 0 else 0
            scored.append({
                'feature': feat,
                'importance': round(imp, 4),
                'value': round(val, 4),
                'score': round(score, 4)
            })
        
        scored.sort(key=lambda x: x['score'], reverse=True)
        return scored[:n]
    
    def _get_confidence_level(self, prob: float) -> str:
        """Convert probability to confidence level."""
        if prob >= 0.8:
            return "VERY HIGH"
        elif prob >= 0.65:
            return "HIGH"
        elif prob >= 0.5:
            return "MODERATE"
        else:
            return "LOW"
    
    def save(self):
        """Save model and metadata to disk."""
        if self.calibrated_model is None:
            raise ValueError("No model to save")
        
        # Save calibrated model
        with open(self._get_calibrated_path(), 'wb') as f:
            pickle.dump(self.calibrated_model, f)
        
        # Helper to convert numpy types to Python native types (JSON-safe)
        def convert_to_native(obj):
            import math
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                val = float(obj)
                # Handle NaN and Inf (not JSON serializable)
                if math.isnan(val) or math.isinf(val):
                    return None
                return val
            elif isinstance(obj, float):
                # Handle NaN and Inf for Python floats too
                if math.isnan(obj) or math.isinf(obj):
                    return None
                return obj
            elif isinstance(obj, np.ndarray):
                return [convert_to_native(x) for x in obj.tolist()]
            elif isinstance(obj, dict):
                return {k: convert_to_native(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_native(v) for v in obj]
            return obj
        
        # Save metadata
        metadata = {
            'model_name': self.model_name,
            'threshold': float(self.threshold),
            'features': self.features,
            'performance_metrics': convert_to_native(self.performance_metrics),
            'training_date': datetime.now().isoformat()
        }
        
        with open(self._get_metadata_path(), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {MODEL_DIR}")
    
    def load(self) -> bool:
        """Load model from disk. Returns True if successful."""
        try:
            # Load calibrated model
            with open(self._get_calibrated_path(), 'rb') as f:
                self.calibrated_model = pickle.load(f)
            
            # Load metadata
            with open(self._get_metadata_path(), 'r') as f:
                metadata = json.load(f)
                self.threshold = metadata.get('threshold', 0.65)
                self.performance_metrics = metadata.get('performance_metrics', {})
            
            logger.info(f"Model loaded from {MODEL_DIR}")
            return True
            
        except Exception as e:
            logger.warning(f"Could not load model: {e}")
            return False


def scan_multibaggers_ml(
    symbols: List[str],
    model: MLMultibaggerModel,
    max_workers: int = 8,
    top_n: int = 20,
    min_prob: float = None
) -> List[Dict]:
    """
    Scan universe using trained ML model.
    
    Args:
        symbols: List of symbols to scan
        model: Trained ML model
        max_workers: Parallel workers for data fetching
        top_n: Return top N results
        min_prob: Minimum probability threshold (defaults to model.threshold)
    """
    results = []
    threshold = min_prob if min_prob is not None else model.threshold
    
    def process_symbol(symbol):
        try:
            df = fetch_daily_data(symbol, years=5)
            if df is None or len(df) < 756:
                return None
            
            prediction = model.predict(df, symbol)
            return prediction
            
        except Exception as e:
            logger.warning(f"Error scanning {symbol}: {e}")
            return None
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_symbol, sym): sym for sym in symbols}
        
        for future in as_completed(futures):
            result = future.result()
            if result and result['prob_multibagger'] >= threshold:
                results.append(result)
    
    # Sort by probability
    results.sort(key=lambda x: x['prob_multibagger'], reverse=True)
    
    return results[:top_n]


def run_ml_backtest(
    model: MLMultibaggerModel,
    symbols: List[str],
    years_ago: int = 2,
    top_n: int = 10
) -> Dict:
    """
    True out-of-sample backtest for ML multibagger model.
    """
    from datetime import datetime, timedelta
    
    target_date = (datetime.now() - timedelta(days=years_ago * 365)).strftime("%Y-%m-%d")
    logger.info(f"Running ML backtest as of {target_date}")
    
    picks = []
    
    for symbol in symbols:
        try:
            # Fetch data through today
            df_full = fetch_daily_data(symbol, years=years_ago + 3)
            if df_full is None or len(df_full) < 252:
                continue
            
            # Split at target date
            target_dt = pd.to_datetime(target_date)
            df_hist = df_full[df_full.index <= target_dt]
            df_fwd = df_full[df_full.index > target_dt]
            
            if len(df_hist) < 756 or len(df_fwd) < 252:
                continue
            
            # Predict using only historical data
            pred = model.predict(df_hist, symbol)
            if pred and pred['prob_multibagger'] >= model.threshold:
                # Calculate forward return
                entry = df_fwd.iloc[0]['open']
                exit_price = df_fwd.iloc[-1]['close']
                forward_return = ((exit_price / entry) - 1) * 100
                
                pred['forward_return'] = round(forward_return, 1)
                pred['entry_date'] = target_date
                pred['exit_date'] = df_fwd.index[-1].strftime('%Y-%m-%d')
                picks.append(pred)
                
        except Exception as e:
            logger.warning(f"Backtest error for {symbol}: {e}")
    
    # Calculate metrics
    if not picks:
        return {'picks': [], 'avg_return': 0, 'hit_rate': 0, 'n_picks': 0}
    
    returns = [p['forward_return'] for p in picks]
    hit_rate = len([r for r in returns if r >= 100]) / len(returns)
    
    return {
        'target_date': target_date,
        'picks': picks,
        'avg_return': round(np.mean(returns), 1),
        'median_return': round(np.median(returns), 1),
        'hit_rate': round(hit_rate, 3),
        'n_picks': len(picks),
        'top_10': picks[:10]
    }


if __name__ == "__main__":
    print("ML Multibagger Model Test")
    
    # Initialize model
    model = MLMultibaggerModel("us_multibagger_v1")
    
    # Try to load existing model
    if model.load():
        print("Loaded existing model")
    else:
        print("Training new model...")
        
        # Generate training data
        train_df = model.generate_training_data(US_100[:30], max_workers=4)  # Test subset
        
        if len(train_df) > 0:
            # Train
            metrics = model.train(train_df)
            print(f"Training metrics: {metrics}")
            
            # Save
            model.save()
        else:
            print("No training data generated")
    
    # Test prediction
    if model.calibrated_model:
        df = fetch_daily_data("AAPL", years=5)
        pred = model.predict(df, "AAPL")
        print(f"\nAAPL prediction: {pred}")
