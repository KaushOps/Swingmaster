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


def create_labels(df: pd.DataFrame, target_atr_mult=2.0, sl_atr_mult=1.5, lookahead=40) -> pd.DataFrame:
    """
    Look ahead logic: Does the price hit Target before Stoploss within lookahead window?
    """
    df = df.copy()
    df['label'] = 0

    closes = df['close'].values
    highs = df['high'].values
    lows = df['low'].values
    atrs = df['atr'].values

    labels = np.zeros(len(df))

    for i in range(len(df)):
        if np.isnan(atrs[i]):
            continue

        entry = closes[i]
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


def passes_quality_gates(row) -> bool:
    """
    Hard filter gates applied AFTER ML prediction to confirm signal quality.
    ALL gates must pass for a signal to be emitted.
    """
    # 1. MACD histogram must be positive (net bullish momentum)
    if row.get('macd_hist', 0) <= 0:
        return False

    # 2. RSI sweet spot: avoid oversold traps and overbought peaks
    rsi = row.get('rsi', 50)
    if not (45 <= rsi <= 78):
        return False

    # 3. Price must be above 20-day EMA (near-term uptrend bias)
    if row.get('above_ema20', 0) == 0:
        return False

    # 4. ADX must show a trending market (not choppy/sideways)
    if row.get('adx', 20) < 18:
        return False

    # 5. Stock must be within 40% of its 52-week high (avoid structural downtrends)
    if row.get('pct_from_high', 1.0) < 0.60:
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
        self.model.fit(X, y)
        self.features = available

    def predict_proba(self, df: pd.DataFrame) -> pd.Series:
        X = df[self.features].fillna(0)
        probs = self.model.predict_proba(X)[:, 1]
        return pd.Series(index=df.index, data=probs)

    def predict_latest(self, df: pd.DataFrame):
        latest = df.iloc[[-1]]
        X = latest[self.features].fillna(0)
        prob = self.model.predict_proba(X)[0][1]
        return prob
