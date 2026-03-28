"""
Renaissance-style Multibagger Prediction Engine
================================================
Uses purely quantitative price/volume anomaly detection to identify
stocks with the mathematical footprint of extreme long-term growth.

Core Signals:
  1. Trend Smoothness (R²) — How perfectly linear the uptrend is
  2. Annualized Slope      — The angle of ascent (compounding rate)
  3. Volume Accumulation   — Up-day volume vs down-day volume divergence
  4. Volatility Suppression — Low drawdown relative to return magnitude
"""

import pandas as pd
import numpy as np
from scipy.stats import linregress
from typing import Dict, List, Optional
import concurrent.futures

from data_fetcher import fetch_daily_data


def calculate_multibagger_score(df: pd.DataFrame) -> Optional[Dict]:
    """
    Computes a Renaissance-style quantitative score (0-100) for a stock.
    Returns None if the stock does not meet minimum criteria.
    """
    if len(df) < 200:
        return None

    # Use the last 252 trading days (~1 year)
    df_window = df.tail(252).copy()
    closes = df_window['close'].values
    volumes = df_window['volume'].values

    # --- 1. Trend Smoothness (R-Squared of log-linear regression) ---
    x = np.arange(len(closes))
    log_closes = np.log(closes)
    slope, intercept, r_value, p_value, std_err = linregress(x, log_closes)
    r_squared = r_value ** 2  # 0 to 1

    # Total return over the window
    total_return = (closes[-1] / closes[0]) - 1

    # Only consider uptrending stocks
    if slope <= 0 or total_return <= 0.05:
        return None

    # --- 2. Volume Accumulation Ratio ---
    price_changes = np.diff(closes)
    up_mask = price_changes > 0
    down_mask = price_changes < 0
    up_volume = volumes[1:][up_mask].sum()
    down_volume = volumes[1:][down_mask].sum()
    accumulation_ratio = up_volume / down_volume if down_volume > 0 else 1.0

    # --- 3. Volatility Suppression (Max Drawdown) ---
    running_max = np.maximum.accumulate(closes)
    drawdowns = (closes - running_max) / running_max
    max_drawdown = abs(drawdowns.min())
    # Reward: high return with low drawdown
    if max_drawdown > 0:
        return_to_dd = total_return / max_drawdown
    else:
        return_to_dd = total_return * 10  # perfect run

    # --- 4. Annualized slope (daily compounding rate * 252) ---
    annualized_return = (np.exp(slope * 252) - 1) * 100  # percentage

    # --- SCORING ---
    # R² score (max 40 pts): smooth uptrends score highest
    score_r2 = min(r_squared, 1.0) * 40

    # Accumulation score (max 25 pts): institutional buying footprint
    score_acc = min(max((accumulation_ratio - 0.9) * 25, 0), 25)

    # Return-to-drawdown score (max 20 pts): capital efficiency
    score_rtdd = min(return_to_dd * 5, 20)

    # Momentum score (max 15 pts): raw returns capped at 200%
    score_mom = min(total_return / 2.0 * 15, 15)

    final_score = score_r2 + score_acc + score_rtdd + score_mom

    return {
        "score": round(min(final_score, 99.9), 1),
        "r_squared": round(r_squared, 3),
        "return_1y": round(total_return * 100, 1),
        "annualized_return": round(annualized_return, 1),
        "accumulation_ratio": round(accumulation_ratio, 2),
        "max_drawdown": round(max_drawdown * 100, 1),
    }


def process_symbol(symbol: str, target_date: Optional[str] = None) -> Optional[Dict]:
    """
    Fetches data and calculates the multibagger score for a single symbol.
    If target_date is provided, scores as-of that date and computes forward return to today.
    """
    try:
        ns_symbol = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
        clean_sym = symbol.replace(".NS", "")

        years = 5 if target_date else 2
        df = fetch_daily_data(ns_symbol, years=years)
        if df.empty or len(df) < 200:
            return None

        forward_return = None

        if target_date:
            target_dt = pd.to_datetime(target_date).tz_localize(None)
            df.index = df.index.tz_localize(None) if df.index.tz is not None else df.index

            df_hist = df[df.index <= target_dt]
            df_fwd = df[df.index > target_dt]

            if len(df_hist) < 200 or df_fwd.empty:
                return None

            entry_price = df_fwd.iloc[0]['open']
            exit_price = df_fwd.iloc[-1]['close']
            forward_return = round(((exit_price / entry_price) - 1) * 100, 1)
            df = df_hist

        metrics = calculate_multibagger_score(df)
        if not metrics or metrics["score"] < 55:
            return None

        result = {
            "symbol": clean_sym,
            "current_price": round(float(df.iloc[-1]['close']), 2),
            **metrics,
        }

        if forward_return is not None:
            result["forward_return"] = forward_return

        return result

    except Exception as e:
        return None


def scan_multibaggers(
    symbols: List[str],
    target_date: Optional[str] = None,
    max_workers: int = 12,
    top_n: int = 20
) -> List[Dict]:
    """
    Scans the given universe for multibagger footprints.
    Returns the top N candidates sorted by score.
    """
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(process_symbol, sym, target_date): sym
            for sym in symbols
        }
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            if res:
                results.append(res)

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_n]


def run_backtest_with_benchmark(
    symbols: List[str],
    target_date: str,
    max_workers: int = 12,
    top_n: int = 10
) -> Dict:
    """
    Runs the time-machine backtest:
    1. Score all stocks as-of target_date
    2. Pick the top N
    3. Calculate their average forward return
    4. Compare against Nifty 50 benchmark return over the same period
    """
    picks = scan_multibaggers(symbols, target_date=target_date, max_workers=max_workers, top_n=top_n)

    if not picks:
        return {"picks": [], "avg_return": 0, "nifty_return": 0}

    avg_return = round(sum(p["forward_return"] for p in picks) / len(picks), 1)

    # Benchmark: Nifty 50
    nifty_return = 0.0
    try:
        nifty_df = fetch_daily_data("^NSEI", years=5)
        if not nifty_df.empty:
            target_dt = pd.to_datetime(target_date).tz_localize(None)
            nifty_df.index = nifty_df.index.tz_localize(None) if nifty_df.index.tz is not None else nifty_df.index
            nifty_fwd = nifty_df[nifty_df.index > target_dt]
            if not nifty_fwd.empty:
                nifty_return = round(((nifty_fwd.iloc[-1]['close'] / nifty_fwd.iloc[0]['open']) - 1) * 100, 1)
    except Exception:
        pass

    return {
        "picks": picks,
        "avg_return": avg_return,
        "nifty_return": nifty_return,
        "target_date": target_date,
        "num_picks": len(picks),
    }
