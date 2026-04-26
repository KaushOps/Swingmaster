import pandas as pd
import ta
import numpy as np

# Use XGBoost with fallback to RandomForest if not installed
try:
    from xgboost import XGBClassifier
    _USE_XGB = True
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    _USE_XGB = False

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds technical indicators to the dataframe."""
    df = df.copy()

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
            'rsi', 'macd', 'macd_signal', 'macd_hist',
            'atr', 'volume_ratio', 'returns',
            'above_ema20', 'above_ema50', 'ema_spread',
            'bb_pct', 'adx', 'stoch_k', 'stoch_d',
            'roc5', 'roc10', 'pct_from_high'
        ]

    def train(self, df: pd.DataFrame):
        available = [f for f in self.features if f in df.columns]
        X = df[available].fillna(0)
        y = df['label']
        if not _USE_XGB:
            self.model.warm_start = True
        self.model.fit(X, y)
        self.features = available

    def incremental_train(self, df: pd.DataFrame):
        """Warm-starts the model with new data for online learning."""
        available = [f for f in self.features if f in df.columns]
        X = df[available].fillna(0)
        y = df['label']
        
        if _USE_XGB:
            try:
                booster = self.model.get_booster()
                self.model.fit(X, y, xgb_model=booster)
            except Exception:
                # If get_booster fails (e.g. not trained yet), just fit
                self.model.fit(X, y)
        else:
            self.model.n_estimators += 10
            self.model.fit(X, y)
            
        self.features = available

    def predict_proba(self, df: pd.DataFrame) -> pd.Series:
        X = df[self.features].fillna(0)
        probs = self.model.predict_proba(X)[:, 1]
        return pd.Series(index=df.index, data=probs)

    def predict_proba_walk_forward(self, df: pd.DataFrame, min_train: int = 50, gap: int = 20, stride: int = 1) -> pd.Series:
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

