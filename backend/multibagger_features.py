"""
ML Multibagger Feature Engineering
====================================
40+ long-term features for 24-month multibagger prediction.

Features focus on:
- Trend structure and persistence (not just momentum)
- Volatility regime and risk-adjusted returns
- Smart money/institutional footprints
- Macro context alignment
- Quality metrics (Sharpe, Sortino, consistency)
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)


def calculate_hurst_exponent(prices: np.ndarray, max_lag: int = 100) -> float:
    """
    Calculate Hurst exponent to measure trend persistence.
    H > 0.5: trending (persistent)
    H = 0.5: random walk
    H < 0.5: mean-reverting
    """
    lags = range(2, min(max_lag, len(prices) // 4))
    tau = [np.std(np.subtract(prices[lag:], prices[:-lag])) for lag in lags]
    
    # Use polyfit to estimate Hurst
    log_lags = np.log(list(lags))
    log_tau = np.log(tau)
    
    # Linear regression
    slope, _, _, _, _ = stats.linregress(log_lags, log_tau)
    hurst = slope / 2.0
    
    return hurst


def calculate_garch_volatility(returns: np.ndarray, omega: float = 0.01, 
                                alpha: float = 0.1, beta: float = 0.85) -> float:
    """
    Simple GARCH(1,1) volatility forecast.
    Returns next-day volatility forecast.
    """
    if len(returns) < 60:
        return np.std(returns) * np.sqrt(252)  # Annualized
    
    # Initialize variance
    var = np.var(returns)
    
    # Iterate through returns
    for r in returns[-252:]:  # Use last year
        var = omega + alpha * (r ** 2) + beta * var
    
    return np.sqrt(var) * np.sqrt(252)  # Annualized


def calculate_accumulation_ratio(df: pd.DataFrame, window: int = 252) -> float:
    """
    Volume accumulation ratio - institutional buying footprint.
    Ratio of up-volume to down-volume.
    """
    if len(df) < window:
        window = len(df)
    
    df_window = df.tail(window)
    price_changes = df_window['close'].diff().dropna()
    volumes = df_window['volume'].iloc[1:]
    
    up_mask = price_changes > 0
    down_mask = price_changes < 0
    
    up_volume = volumes[up_mask].sum()
    down_volume = volumes[down_mask].sum()
    
    if down_volume > 0:
        return up_volume / down_volume
    return 1.0


def calculate_consistency_score(returns: np.ndarray, window: int = 63) -> float:
    """
    Score for consistent positive returns.
    Counts consecutive positive months (21 trading days).
    """
    if len(returns) < window:
        return 0.5
    
    # Calculate monthly returns (21-day windows)
    monthly_returns = []
    for i in range(0, len(returns) - window, window):
        month_ret = np.prod(1 + returns[i:i+window]) - 1
        monthly_returns.append(month_ret)
    
    if not monthly_returns:
        return 0.5
    
    # Score: % of positive months weighted by recency
    weights = np.linspace(0.5, 1.0, len(monthly_returns))
    positive_mask = np.array(monthly_returns) > 0
    weighted_score = np.sum(weights[positive_mask]) / np.sum(weights)
    
    return weighted_score


def extract_multibagger_features(df: pd.DataFrame, symbol: str = "") -> Optional[Dict]:
    """
    Extract 40+ long-term features for multibagger prediction.
    
    Requires at least 3 years (756 trading days) of data.
    """
    if len(df) < 756:  # 3 years minimum
        return None
    
    # Ensure we have required columns
    required = ['open', 'high', 'low', 'close', 'volume']
    if not all(col in df.columns for col in required):
        return None
    
    # Clean data
    df = df.dropna(subset=required)
    if len(df) < 756:
        return None
    
    # Use 3-year window for feature calculation
    df_3y = df.tail(756).copy()
    df_1y = df.tail(252).copy()
    df_2y = df.tail(504).copy()
    
    closes_3y = df_3y['close'].values
    closes_1y = df_1y['close'].values
    volumes_3y = df_3y['volume'].values
    volumes_1y = df_1y['volume'].values
    
    # Calculate returns
    returns_3y = np.diff(closes_3y) / closes_3y[:-1]
    returns_1y = np.diff(closes_1y) / closes_1y[:-1]
    
    features = {}
    
    # === 1. TREND STRUCTURE (8 features) ===
    
    # 1.1 Log-linear regression on 3-year (trend smoothness)
    x = np.arange(len(closes_3y))
    log_prices = np.log(closes_3y)
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, log_prices)
    
    features['trend_r2_3y'] = r_value ** 2
    features['trend_slope_3y'] = slope
    features['trend_pvalue'] = p_value
    
    # 1.2 Annualized return
    total_return_3y = (closes_3y[-1] / closes_3y[0]) - 1
    features['annualized_return_3y'] = (1 + total_return_3y) ** (1/3) - 1
    
    # 1.3 Trend acceleration (2nd derivative)
    # Split into 3 1-year periods
    y1_return = (closes_3y[252] / closes_3y[0]) - 1 if len(closes_3y) > 252 else 0
    y2_return = (closes_3y[504] / closes_3y[252]) - 1 if len(closes_3y) > 504 else 0
    y3_return = (closes_3y[-1] / closes_3y[504]) - 1 if len(closes_3y) > 504 else 0
    features['trend_acceleration'] = y3_return - y2_return
    features['trend_consistency'] = 1 - np.std([y1_return, y2_return, y3_return])
    
    # 1.4 Hurst exponent (trend persistence)
    try:
        features['hurst_exponent'] = calculate_hurst_exponent(closes_3y)
    except:
        features['hurst_exponent'] = 0.5
    
    # === 2. VOLATILITY REGIME (6 features) ===
    
    # 2.1 Realized volatility (annualized)
    features['realized_vol_1y'] = np.std(returns_1y) * np.sqrt(252)
    features['realized_vol_3y'] = np.std(returns_3y) * np.sqrt(252)
    
    # 2.2 GARCH volatility forecast
    try:
        features['garch_vol_forecast'] = calculate_garch_volatility(returns_1y)
    except:
        features['garch_vol_forecast'] = features['realized_vol_1y']
    
    # 2.3 Volatility trend (decreasing = good)
    vol_y1 = np.std(returns_1y) * np.sqrt(252)
    returns_y2 = returns_3y[-252*2:-252]
    vol_y2 = np.std(returns_y2) * np.sqrt(252) if len(returns_y2) > 60 else vol_y1
    features['volatility_trend'] = (vol_y2 - vol_y1) / vol_y2 if vol_y2 > 0 else 0
    
    # 2.4 Vol of vol (clustering)
    rolling_vol = pd.Series(returns_1y).rolling(21).std().dropna()
    features['vol_of_vol'] = rolling_vol.std() * np.sqrt(252)
    
    # === 3. RISK-ADJUSTED RETURNS (6 features) ===
    
    # 3.1 Sharpe ratio (assuming 3% risk-free)
    risk_free = 0.03
    excess_return = features['annualized_return_3y'] - risk_free
    features['sharpe_ratio_3y'] = excess_return / features['realized_vol_3y'] if features['realized_vol_3y'] > 0 else 0
    
    # 3.2 Sortino ratio (downside only)
    downside_returns = returns_3y[returns_3y < 0]
    downside_std = np.std(downside_returns) * np.sqrt(252) if len(downside_returns) > 0 else 0.01
    features['sortino_ratio'] = excess_return / downside_std if downside_std > 0 else 0
    
    # 3.3 Calmar ratio (return / max drawdown)
    running_max = np.maximum.accumulate(closes_3y)
    drawdowns = (closes_3y - running_max) / running_max
    max_dd = abs(np.min(drawdowns))
    features['max_drawdown_3y'] = max_dd
    features['calmar_ratio'] = features['annualized_return_3y'] / max_dd if max_dd > 0 else 0
    
    # 3.4 Return to max DD ratio
    total_ret = (closes_3y[-1] / closes_3y[0]) - 1
    features['return_maxdd_ratio'] = total_ret / max_dd if max_dd > 0 else 0
    
    # === 4. SMART MONEY / VOLUME (6 features) ===
    
    # 4.1 Volume accumulation ratio
    features['volume_accumulation_1y'] = calculate_accumulation_ratio(df_1y)
    features['volume_accumulation_3y'] = calculate_accumulation_ratio(df_3y)
    
    # 4.2 Volume trend
    vol_1y_avg = volumes_1y.mean()
    vol_3y_avg = volumes_3y.mean()
    features['volume_trend'] = (vol_1y_avg - vol_3y_avg) / vol_3y_avg if vol_3y_avg > 0 else 0
    
    # 4.3 On-balance volume (OBV) trend
    obv = np.zeros(len(df_1y))
    for i in range(1, len(df_1y)):
        if closes_1y[i] > closes_1y[i-1]:
            obv[i] = obv[i-1] + volumes_1y[i]
        elif closes_1y[i] < closes_1y[i-1]:
            obv[i] = obv[i-1] - volumes_1y[i]
        else:
            obv[i] = obv[i-1]
    
    obv_slope, _, obv_r, _, _ = stats.linregress(range(len(obv)), obv)
    features['obv_trend'] = obv_slope
    features['obv_r2'] = obv_r ** 2
    
    # === 5. PRICE POSITION (4 features) ===
    
    # 5.1 Distance from 52-week high
    high_52w = np.max(closes_1y)
    features['pct_from_52w_high'] = (closes_1y[-1] / high_52w - 1) * 100
    
    # 5.2 Distance from all-time high (in 3y window)
    high_3y = np.max(closes_3y)
    features['pct_from_3y_high'] = (closes_3y[-1] / high_3y - 1) * 100
    
    # 5.3 vs moving averages
    sma_50 = np.mean(closes_1y[-50:])
    sma_200 = np.mean(closes_1y[-200:]) if len(closes_1y) >= 200 else np.mean(closes_1y)
    features['price_vs_sma50'] = (closes_1y[-1] / sma_50 - 1) * 100
    features['price_vs_sma200'] = (closes_1y[-1] / sma_200 - 1) * 100
    features['sma50_vs_sma200'] = (sma_50 / sma_200 - 1) * 100
    
    # === 6. QUALITY / CONSISTENCY (4 features) ===
    
    # 6.1 Consistency score (positive months)
    features['consistency_score'] = calculate_consistency_score(returns_1y)
    
    # 6.2 Consecutive up days max
    up_days = returns_1y > 0
    consecutive = []
    current = 0
    for up in up_days:
        if up:
            current += 1
        else:
            if current > 0:
                consecutive.append(current)
            current = 0
    if current > 0:
        consecutive.append(current)
    features['max_consecutive_up'] = max(consecutive) if consecutive else 0
    features['avg_consecutive_up'] = np.mean(consecutive) if consecutive else 0
    
    # 6.3 Win rate (% positive days)
    features['win_rate_1y'] = np.mean(up_days)
    
    # === 7. TECHNICAL PATTERNS (3 features) ===
    
    # 7.1 RSI (14-day)
    deltas = np.diff(closes_1y)
    gains = np.where(deltas > 0, deltas, 0)
    losses = np.where(deltas < 0, -deltas, 0)
    
    avg_gain = np.mean(gains[-14:])
    avg_loss = np.mean(losses[-14:])
    
    if avg_loss > 0:
        rs = avg_gain / avg_loss
        features['rsi_14'] = 100 - (100 / (1 + rs))
    else:
        features['rsi_14'] = 50
    
    # 7.2 Bollinger Band position
    sma_20 = np.mean(closes_1y[-20:])
    std_20 = np.std(closes_1y[-20:])
    if std_20 > 0:
        features['bb_position'] = (closes_1y[-1] - sma_20) / (2 * std_20)
    else:
        features['bb_position'] = 0
    
    # 7.3 MACD
    ema_12 = pd.Series(closes_1y).ewm(span=12).mean().iloc[-1]
    ema_26 = pd.Series(closes_1y).ewm(span=26).mean().iloc[-1]
    features['macd'] = ema_12 - ema_26
    
    # === 8. RECENCY / MOMENTUM SHIFT (3 features) ===
    
    # 8.1 Recent vs longer-term momentum
    mom_1m = (closes_1y[-1] / closes_1y[-21] - 1) if len(closes_1y) > 21 else 0
    mom_3m = (closes_1y[-1] / closes_1y[-63] - 1) if len(closes_1y) > 63 else 0
    mom_6m = (closes_1y[-1] / closes_1y[-126] - 1) if len(closes_1y) > 126 else 0
    
    features['momentum_1m'] = mom_1m
    features['momentum_3m'] = mom_3m
    features['momentum_6m'] = mom_6m
    features['momentum_shift_6m_to_1m'] = mom_1m - (mom_6m / 6)  # Acceleration
    
    # Clean up any NaN/inf values
    for key in features:
        if np.isnan(features[key]) or np.isinf(features[key]):
            features[key] = 0
    
    # Add symbol for reference
    features['symbol'] = symbol
    features['date'] = df.index[-1].strftime('%Y-%m-%d') if hasattr(df.index[-1], 'strftime') else str(df.index[-1])[:10]
    
    return features


def get_feature_names() -> List[str]:
    """Return list of all feature names for model training."""
    return [
        'trend_r2_3y', 'trend_slope_3y', 'trend_pvalue',
        'annualized_return_3y', 'trend_acceleration', 'trend_consistency',
        'hurst_exponent',
        'realized_vol_1y', 'realized_vol_3y', 'garch_vol_forecast',
        'volatility_trend', 'vol_of_vol',
        'sharpe_ratio_3y', 'sortino_ratio', 'max_drawdown_3y',
        'calmar_ratio', 'return_maxdd_ratio',
        'volume_accumulation_1y', 'volume_accumulation_3y', 'volume_trend',
        'obv_trend', 'obv_r2',
        'pct_from_52w_high', 'pct_from_3y_high',
        'price_vs_sma50', 'price_vs_sma200', 'sma50_vs_sma200',
        'consistency_score', 'max_consecutive_up', 'avg_consecutive_up',
        'win_rate_1y', 'rsi_14', 'bb_position', 'macd',
        'momentum_1m', 'momentum_3m', 'momentum_6m', 'momentum_shift_6m_to_1m'
    ]


if __name__ == "__main__":
    from data_fetcher import fetch_daily_data
    
    print("Testing multibagger feature extraction...")
    df = fetch_daily_data("NVDA", years=5)
    
    if len(df) >= 756:
        features = extract_multibagger_features(df, "NVDA")
        print(f"\nExtracted {len(features)} features:")
        for k, v in list(features.items())[:10]:
            print(f"  {k}: {v:.4f}" if isinstance(v, float) else f"  {k}: {v}")
        print(f"  ... and {len(features) - 10} more features")
    else:
        print(f"Insufficient data: {len(df)} rows")
