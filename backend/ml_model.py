import pandas as pd
import ta
import numpy as np
import os
import pickle
import logging
from typing import Optional

logger = logging.getLogger("ml_model")

# Model persistence directory
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Use XGBoost with fallback to RandomForest if not installed
try:
    from xgboost import XGBClassifier
    _USE_XGB = True
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    _USE_XGB = False

def add_features(df: pd.DataFrame, macro_df: pd.DataFrame = None) -> pd.DataFrame:
    """Adds technical indicators and macro features to the dataframe."""
    df = df.copy()
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)
        
    if macro_df is not None and not macro_df.empty:
        # Merge macro features using index (date)
        df = df.merge(macro_df, left_index=True, right_index=True, how='left')
        # Forward fill any missing macro data (e.g. holidays) and then backward fill the start
        df.ffill(inplace=True)
        df.bfill(inplace=True)

    # --- Existing features ---
    # RSI
    df['rsi'] = ta.momentum.rsi(df['close'], window=14)

    # MACD
    macd = ta.trend.MACD(close=df['close'])
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_hist'] = macd.macd_diff()  # histogram: +ve = bullish momentum

    # ATR
    atr = ta.volatility.AverageTrueRange(high=df['high'], low=df['low'], close=df['close'], window=14)
    df['atr'] = atr.average_true_range()

    # Volume Ratio
    df['volume_mean'] = df['volume'].rolling(20).mean()
    df['volume_ratio'] = np.where(df['volume_mean'] > 0, df['volume'] / df['volume_mean'], 1.0)

    # Returns
    df['returns'] = df['close'].pct_change()

    # --- New enhanced features ---

    # EMA Trend Bias: price position relative to 50-day and 20-day EMA
    df['ema20'] = ta.trend.ema_indicator(df['close'], window=20)
    df['ema50'] = ta.trend.ema_indicator(df['close'], window=50)
    df['above_ema20'] = (df['close'] > df['ema20']).astype(int)
    df['above_ema50'] = (df['close'] > df['ema50']).astype(int)
    df['ema_spread'] = (df['ema20'] - df['ema50']) / df['close']  # positive = uptrend

    # Bollinger Band position (is price breaking out of the upper band?)
    bb = ta.volatility.BollingerBands(close=df['close'], window=20, window_dev=2)
    df['bb_pct'] = bb.bollinger_pband()  # 0=at lower, 1=at upper band

    # ADX (trend strength) — only take signals in trending markets
    adx = ta.trend.ADXIndicator(high=df['high'], low=df['low'], close=df['close'], window=14)
    df['adx'] = adx.adx()

    # Stochastic — momentum confirmation
    stoch = ta.momentum.StochasticOscillator(high=df['high'], low=df['low'], close=df['close'])
    df['stoch_k'] = stoch.stoch()
    df['stoch_d'] = stoch.stoch_signal()

    # Rate of Change (short + medium)
    df['roc5']  = ta.momentum.roc(df['close'], window=5)
    df['roc10'] = ta.momentum.roc(df['close'], window=10)

    # 52-week high proximity (price strength gate)
    df['high_52w'] = df['high'].rolling(252).max()
    df['pct_from_high'] = (df['close'] / df['high_52w'])

    # ── Stationary / normalized features ──────────────────────────────────────
    # Normalise MACD by price so values are comparable across ₹50 and ₹5000 stocks
    df['macd_norm']        = df['macd']        / df['close'].replace(0, np.nan)
    df['macd_signal_norm'] = df['macd_signal'] / df['close'].replace(0, np.nan)
    # ATR as % of price (already computed in main but duplicate here for feature list)
    df['atr_pct'] = df['atr'] / df['close'].replace(0, np.nan)
    # Rolling z-score of RSI over 20 bars — captures RSI momentum relative to recent history
    df['rsi_zscore'] = (df['rsi'] - df['rsi'].rolling(20).mean()) / (df['rsi'].rolling(20).std() + 1e-9)

    return df.dropna()


def create_labels(df: pd.DataFrame, target_atr_mult=5.0, sl_atr_mult=2.0, lookahead=60) -> pd.DataFrame:
    """
    Look ahead logic: Does the price hit Target before Stoploss within lookahead window?
    """
    df = df.copy()
    df['label'] = 0

    closes = df['close'].values
    if 'open' in df.columns:
        opens = df['open'].values
    else:
        opens = closes # fallback if open is missing
        
    highs = df['high'].values
    lows = df['low'].values
    atrs = df['atr'].values

    labels = np.zeros(len(df))

    for i in range(len(df) - 1): # stop 1 bar early
        if np.isnan(atrs[i]):
            continue

        # Use next-bar open as realistic execution price
        entry = opens[i + 1]
        target = entry + (target_atr_mult * atrs[i])
        stoploss = entry - (sl_atr_mult * atrs[i])

        hit = 0
        end_idx = min(len(df), i + lookahead + 1)

        for j in range(i + 1, end_idx):
            if lows[j] <= stoploss:
                break
            if highs[j] >= target:
                hit = 1
                break

        labels[i] = hit

    df['label'] = labels
    return df


def passes_quality_gates(row, gates=None) -> bool:
    """
    Hard filter gates applied AFTER ML prediction to confirm signal quality.
    ALL gates must pass for a signal to be emitted.
    """
    if gates is None:
        gates = {
            'rsi_min': 45,
            'rsi_max': 78,
            'adx_min': 18,
            'macd_positive': True,
            'pct_from_high': 0.60
        }

    # 1. MACD histogram must be positive (net bullish momentum)
    if gates.get('macd_positive', True) and row.get('macd_hist', 0) <= 0:
        return False

    # 2. RSI sweet spot: avoid oversold traps and overbought peaks
    rsi = row.get('rsi', 50)
    if not (gates.get('rsi_min', 45) <= rsi <= gates.get('rsi_max', 78)):
        return False

    # 3. Price must be above 20-day EMA (near-term uptrend bias)
    if row.get('above_ema20', 0) == 0:
        return False

    # 4. ADX must show a trending market (not choppy/sideways)
    if row.get('adx', 20) < gates.get('adx_min', 18):
        return False

    # 5. Stock must be within 40% of its 52-week high (avoid structural downtrends)
    if row.get('pct_from_high', 1.0) < gates.get('pct_from_high', 0.60):
        return False

    return True


class IntradayModel:
    def __init__(self):
        if _USE_XGB:
            self.model = XGBClassifier(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                use_label_encoder=False,
                eval_metric='logloss',
                random_state=42,
                verbosity=0
            )
        else:
            from sklearn.ensemble import RandomForestClassifier
            self.model = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=42)

        self.features = [
            'rsi', 'rsi_zscore',
            'macd_norm', 'macd_signal_norm', 'macd_hist',  # normalised versions
            'atr_pct', 'volume_ratio', 'returns',           # atr_pct replaces raw atr
            'above_ema20', 'above_ema50', 'ema_spread',
            'bb_pct', 'adx', 'stoch_k', 'stoch_d',
            'roc5', 'roc10', 'pct_from_high',
            'macro_vix', 'macro_usdinr', 'macro_brent'
        ]

    def train(self, df: pd.DataFrame, sample_weights: np.ndarray = None):
        """
        Full (re)train on a DataFrame.
        Automatically corrects class imbalance via scale_pos_weight / class_weight.
        Optionally accepts sample_weights for regime-aware recentness bias.
        """
        available = [f for f in self.features if f in df.columns]
        X = df[available].fillna(0)
        y = df['label']

        # ── Class imbalance correction ─────────────────────────────────────────
        neg = int((y == 0).sum())
        pos = int((y == 1).sum())
        if pos == 0:
            return  # nothing to train on
        spw = neg / pos  # e.g. 4.0 for 80%/20% split

        if _USE_XGB:
            # Re-init with correct scale_pos_weight each time (avoids stale value)
            from xgboost import XGBClassifier
            self.model = XGBClassifier(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                eval_metric='logloss',
                scale_pos_weight=spw,   # ← corrects class imbalance
                random_state=42,
                verbosity=0,
            )
        else:
            from sklearn.ensemble import RandomForestClassifier
            self.model = RandomForestClassifier(
                n_estimators=200, max_depth=6,
                class_weight='balanced', random_state=42
            )

        self.model.fit(X, y, sample_weight=sample_weights)
        self.features = available

    def incremental_train(self, df: pd.DataFrame, regime: str = "UNKNOWN"):
        """
        Warm-start / incremental update with new data.
        Applies regime-aware sample weighting:
          - TRENDING  → weight recent bars 3× (momentum works, recency matters)
          - VOLATILE  → weight recent bars 0.5× (noisy, discount recent)
          - CHOPPY    → uniform weights (mean-reversion, no recency bias)
        """
        available = [f for f in self.features if f in df.columns]
        X = df[available].fillna(0)
        y = df['label']

        if len(np.unique(y)) <= 1:
            return  # can't train on single-class batch

        # ── Regime-aware temporal weighting ───────────────────────────────────
        n = len(df)
        if regime == "TRENDING":
            # Linearly increase weight toward recent bars (recency bonus)
            weights = np.linspace(1.0, 3.0, n)
        elif regime == "VOLATILE":
            # Discount recent noisy bars
            weights = np.linspace(1.0, 0.5, n)
        else:
            weights = np.ones(n)  # CHOPPY / UNKNOWN — uniform

        if _USE_XGB:
            try:
                booster = self.model.get_booster()
                neg = int((y == 0).sum())
                pos = int((y == 1).sum())
                spw = neg / pos if pos > 0 else 1.0
                self.model.set_params(scale_pos_weight=spw)
                self.model.fit(X, y, xgb_model=booster, sample_weight=weights)
            except Exception:
                self.train(df)  # full retrain as fallback
        else:
            self.model.n_estimators += 10
            self.model.fit(X, y, sample_weight=weights)

        self.features = available

    def predict_proba(self, df: pd.DataFrame) -> pd.Series:
        X = df[self.features].fillna(0)
        probs = self.model.predict_proba(X)[:, 1]
        return pd.Series(index=df.index, data=probs)

    def predict_proba_walk_forward(self, df: pd.DataFrame, min_train: int = 50, gap: int = 60, stride: int = 10) -> pd.Series:
        """
        Performs walk-forward out-of-sample predictions to avoid in-sample leakage.
        Trains on data up to (i - gap), predicts on bar i.
        """
        probs = pd.Series(index=df.index, data=0.0)
        available = [f for f in self.features if f in df.columns]
        X = df[available].fillna(0)
        y = df['label']
        
        if len(df) <= min_train + gap:
            return self.predict_proba(df) # fallback if not enough data
            
        for i in range(min_train + gap, len(df), stride):
            train_end = i - gap
            X_train = X.iloc[:train_end]
            y_train = y.iloc[:train_end]
            
            # Avoid single-class failure
            if len(np.unique(y_train)) <= 1:
                continue
                
            # Use a fresh, slightly smaller model to train quickly on expanding window
            if _USE_XGB:
                from xgboost import XGBClassifier
                temp_model = XGBClassifier(
                    n_estimators=100, max_depth=4, learning_rate=0.05,
                    use_label_encoder=False, eval_metric='logloss', verbosity=0, random_state=42
                )
            else:
                from sklearn.ensemble import RandomForestClassifier
                temp_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
                
            temp_model.fit(X_train, y_train)
            
            score_end = min(len(df), i + stride)
            X_test = X.iloc[i:score_end]
            preds = temp_model.predict_proba(X_test)[:, 1]
            probs.iloc[i:score_end] = preds
            
        return probs

    def save(self, symbol: str):
        """Persist this model to disk so the next scan cycle can warm-start from it."""
        path = os.path.join(MODEL_DIR, f"{symbol}.pkl")
        try:
            with open(path, "wb") as f:
                pickle.dump({"model": self.model, "features": self.features}, f)
            logger.debug(f"Model saved: {symbol}")
        except Exception as e:
            logger.warning(f"Model save failed for {symbol}: {e}")

    @classmethod
    def load(cls, symbol: str) -> Optional["IntradayModel"]:
        """
        Load a previously persisted model from disk.
        Returns None if no saved model exists or load fails.
        """
        path = os.path.join(MODEL_DIR, f"{symbol}.pkl")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "rb") as f:
                data = pickle.load(f)
            instance = cls()
            instance.model    = data["model"]
            instance.features = data["features"]
            logger.debug(f"Model loaded: {symbol}")
            return instance
        except Exception as e:
            logger.warning(f"Model load failed for {symbol}: {e}")
            return None

    def predict_latest(self, df: pd.DataFrame):
        latest = df.iloc[[-1]]
        X = latest[self.features].fillna(0)
        prob = self.model.predict_proba(X)[0][1]
        return prob

    def get_shap_importances(self, df: pd.DataFrame, top_n: int = 5) -> list:
        """
        Computes SHAP feature importances for the trained model.
        Returns a list of dicts: [{"feature": name, "importance": value}, ...]
        Returns empty list if SHAP is unavailable or computation fails.
        """
        try:
            import shap
        except ImportError:
            return []

        try:
            X = df[self.features].fillna(0)
            sample_X = X.sample(n=min(100, len(X))) if len(X) > 100 else X

            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(sample_X)

            # Handle multi-class output (RF returns list)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]

            mean_abs = np.abs(shap_values).mean(axis=0)
            feature_imp = sorted(
                zip(self.features, mean_abs),
                key=lambda x: x[1],
                reverse=True
            )[:top_n]

            return [{"feature": f, "importance": round(float(v), 4)} for f, v in feature_imp]
        except Exception:
            return []

