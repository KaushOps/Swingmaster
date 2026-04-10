import inspect
import pandas as pd
import ta
import numpy as np
from typing import Optional

# Use XGBoost with fallback to RandomForest if not installed
try:
    from xgboost import XGBClassifier
    _USE_XGB = True
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    _USE_XGB = False

# Training labels aligned with live cards / vectorbt backtest (5R target, 2R stop)
LABEL_TARGET_ATR_MULT = 5.0
LABEL_SL_ATR_MULT = 2.0
DEFAULT_LOOKAHEAD = 60

WALK_FORWARD_MIN_TRAIN = 120
WALK_FORWARD_STRIDE = 10
WALK_FORWARD_RECENT_STRIDE = 2
WALK_FORWARD_HIGH_VOL_ATR_PCT = 0.03
WALK_FORWARD_EMBARGO_ROWS = DEFAULT_LOOKAHEAD

try:
    from sklearn.isotonic import IsotonicRegression
    _USE_ISOTONIC = True
except Exception:
    _USE_ISOTONIC = False


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


def create_labels(
    df: pd.DataFrame,
    target_atr_mult: float = LABEL_TARGET_ATR_MULT,
    sl_atr_mult: float = LABEL_SL_ATR_MULT,
    lookahead: int = DEFAULT_LOOKAHEAD,
) -> pd.DataFrame:
    """
    Look ahead logic: Does the price hit Target before Stoploss within lookahead window?
    Defaults match live TP/SL (5x / 2x ATR) and a ~60-session horizon.
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


def _xgb_classifier_kwargs() -> dict:
    """Build XGBClassifier kwargs; omit deprecated args not supported by installed XGBoost."""
    kw = dict(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        random_state=42,
        verbosity=0,
    )
    if _USE_XGB:
        params = inspect.signature(XGBClassifier.__init__).parameters
        if 'use_label_encoder' in params:
            kw['use_label_encoder'] = False
    return kw


class SwingModel:
    def __init__(self):
        if _USE_XGB:
            self.model = XGBClassifier(**_xgb_classifier_kwargs())
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


def predict_proba_walk_forward_stride(
    df: pd.DataFrame,
    min_train_rows: int = WALK_FORWARD_MIN_TRAIN,
    stride: int = WALK_FORWARD_STRIDE,
    embargo_rows: int = WALK_FORWARD_EMBARGO_ROWS,
) -> pd.Series:
    """
    Out-of-sample style probabilities: refit every `stride` bars; each bar i is predicted
    using a model trained only on rows [0:i). Leading bars are NaN (no entries).
    """
    n = len(df)
    probs = pd.Series(np.nan, index=df.index, dtype=float)
    if n <= min_train_rows:
        return probs

    model = None
    calibrator: Optional[object] = None
    for i in range(min_train_rows, n):
        adaptive_stride = stride
        if i > 30:
            recent = df.iloc[max(0, i - 30):i]
            recent_close = recent.get('close')
            recent_atr = recent.get('atr')
            if recent_close is not None and recent_atr is not None and len(recent) > 0:
                atr_pct = float((recent_atr / recent_close.replace(0, np.nan)).mean())
                if np.isfinite(atr_pct) and atr_pct >= WALK_FORWARD_HIGH_VOL_ATR_PCT:
                    adaptive_stride = WALK_FORWARD_RECENT_STRIDE

        if i == min_train_rows or (i - min_train_rows) % adaptive_stride == 0:
            # Purged walk-forward: remove the trailing embargo window to reduce
            # overlap leakage from label lookahead near the prediction timestamp.
            train_end = i - embargo_rows if i - embargo_rows > min_train_rows else i
            train_df = df.iloc[:train_end]
            model = SwingModel()
            calibrator = None
            try:
                # Keep a small holdout tail inside training slice for probability calibration.
                calib_rows = max(30, min(120, int(len(train_df) * 0.2)))
                if len(train_df) > (min_train_rows + calib_rows):
                    fit_df = train_df.iloc[:-calib_rows]
                    calib_df = train_df.iloc[-calib_rows:]
                else:
                    fit_df = train_df
                    calib_df = None

                model.train(fit_df)

                if _USE_ISOTONIC and calib_df is not None:
                    y_cal = calib_df['label'].astype(int).values
                    if len(np.unique(y_cal)) >= 2:
                        raw_cal = model.predict_proba(calib_df).astype(float).values
                        iso = IsotonicRegression(out_of_bounds='clip')
                        iso.fit(raw_cal, y_cal)
                        calibrator = iso
            except Exception:
                model = None
                calibrator = None
        if model is None:
            continue
        try:
            p = float(model.predict_proba(df.iloc[i : i + 1]).iloc[0])
            if calibrator is not None:
                p = float(calibrator.predict([p])[0])
            probs.iloc[i] = max(0.0, min(1.0, p))
        except Exception:
            pass
    return probs


# Backward-compatible alias
IntradayModel = SwingModel
