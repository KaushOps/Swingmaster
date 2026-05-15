"""
ML Multibagger Label Generation
================================
Creates risk-adjusted labels for long-term (24-month) multibagger prediction.

Label = 1 if:
  - Stock achieves 2x+ return (>=100%) within 24 months
  - Max drawdown from entry <= 35% (risk control)
  - Minimum holding period: 6 months (avoid short-term spikes)

This filters out penny stock pumps and focuses on sustainable compounders.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)


def create_multibagger_labels(
    df: pd.DataFrame,
    entry_idx: int,
    lookahead_months: int = 24,
    min_return_pct: float = 100.0,
    max_drawdown_pct: float = 35.0,
    min_holding_months: int = 6
) -> Tuple[int, Optional[dict]]:
    """
    Create risk-adjusted multibagger label from a specific entry point.
    
    Args:
        df: DataFrame with OHLCV data, indexed by date
        entry_idx: Index position where we "enter" the trade
        lookahead_months: How far to look forward (default 24 months)
        min_return_pct: Minimum return to qualify (default 100% = 2x)
        max_drawdown_pct: Maximum allowed drawdown from entry (default 35%)
        min_holding_months: Minimum days to hold (default ~6 months)
        
    Returns:
        (label, metadata_dict)
        label: 1 = multibagger, 0 = not, -1 = insufficient data
        metadata: dict with achieved_return, max_dd, days_held, etc.
    """
    if entry_idx >= len(df) - 20:  # Need at least 20 days forward
        return -1, None
    
    entry_price = df.iloc[entry_idx]['close']
    if entry_price <= 0 or np.isnan(entry_price):
        return -1, None
    
    # Calculate forward window (approximate trading days)
    days_forward = int(lookahead_months * 21)  # ~21 trading days per month
    min_hold_days = int(min_holding_months * 21)
    
    end_idx = min(entry_idx + days_forward, len(df) - 1)
    forward_df = df.iloc[entry_idx:end_idx + 1]
    
    if len(forward_df) < min_hold_days:
        return -1, None
    
    # Calculate returns and drawdowns
    prices = forward_df['close'].values
    highs = forward_df['high'].values
    
    # Running max for drawdown calculation
    running_max = np.maximum.accumulate(prices)
    drawdowns = (prices - running_max) / running_max
    max_drawdown = abs(np.min(drawdowns)) * 100  # as percentage
    
    # Find first time we hit 2x (if ever)
    target_price = entry_price * (1 + min_return_pct / 100)
    hits_target = np.any(highs >= target_price)
    
    if hits_target:
        target_hit_idx = np.where(highs >= target_price)[0][0]
        days_to_target = target_hit_idx
        achieved_return = min_return_pct
    else:
        # Calculate actual return at end of period
        final_price = prices[-1]
        achieved_return = ((final_price / entry_price) - 1) * 100
        days_to_target = None
    
    # Determine label
    # Must hit 2x AND not exceed max drawdown AND hold minimum period
    if hits_target and max_drawdown <= max_drawdown_pct:
        label = 1
    else:
        label = 0
    
    metadata = {
        'entry_price': round(entry_price, 2),
        'achieved_return_pct': round(achieved_return, 1),
        'max_drawdown_pct': round(max_drawdown, 1),
        'days_in_window': len(forward_df),
        'days_to_target': days_to_target,
        'target_hit': hits_target,
        'meets_risk_criteria': max_drawdown <= max_drawdown_pct,
        'entry_date': df.index[entry_idx].strftime('%Y-%m-%d') if hasattr(df.index[entry_idx], 'strftime') else str(df.index[entry_idx])[:10],
        'end_date': df.index[end_idx].strftime('%Y-%m-%d') if hasattr(df.index[end_idx], 'strftime') else str(df.index[end_idx])[:10],
    }
    
    return label, metadata


def generate_training_labels_for_symbol(
    df: pd.DataFrame,
    lookback_years: int = 3,
    step_months: int = 3,
    lookahead_months: int = 24
) -> pd.DataFrame:
    """
    Generate multiple training samples per symbol using rolling windows.
    
    Creates samples every `step_months` to increase training data.
    
    Returns:
        DataFrame with columns: date, label, and all metadata fields
    """
    if len(df) < lookback_years * 252:  # Need at least lookback years of data
        return pd.DataFrame()
    
    step_days = int(step_months * 21)  # Step forward every 3 months
    
    samples = []
    # Start after we have enough lookback data
    start_idx = lookback_years * 252
    
    for entry_idx in range(start_idx, len(df) - step_days, step_days):
        label, metadata = create_multibagger_labels(
            df, 
            entry_idx, 
            lookahead_months=lookahead_months
        )
        
        if label >= 0 and metadata:  # Valid sample
            sample = {
                'date': metadata['entry_date'],
                'label': label,
                **metadata
            }
            samples.append(sample)
    
    if not samples:
        return pd.DataFrame()
    
    return pd.DataFrame(samples)


if __name__ == "__main__":
    # Test with a sample symbol
    from data_fetcher import fetch_daily_data
    
    print("Testing multibagger label generation...")
    df = fetch_daily_data("AAPL", years=5)
    
    if len(df) > 252 * 3:
        # Test single label
        label, meta = create_multibagger_labels(df, len(df) - 252 * 2)
        print(f"Single label test: {label}")
        print(f"Metadata: {meta}")
        
        # Test rolling samples
        samples_df = generate_training_labels_for_symbol(df)
        print(f"\nGenerated {len(samples_df)} training samples")
        if len(samples_df) > 0:
            print(f"Label distribution: {samples_df['label'].value_counts().to_dict()}")
    else:
        print("Insufficient data for test")
