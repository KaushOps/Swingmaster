import vectorbt as vbt
import pandas as pd
import numpy as np

def run_backtest(df: pd.DataFrame, sl_atr_mult=1.5, tp_atr_mult=2.0, init_cash=100000) -> dict:
    """
    Runs a vectorbt backtest with the given signals.
    Expects df to have 'close', 'atr', 'prob_up', 'volume_ratio'.
    """
    if 'prob_up' not in df.columns or len(df) < 50:
        return {
            'total_return': 0, 'win_rate': 0, 'sharpe_ratio': 0,
            'max_drawdown': 0, 'total_trades': 0, 'final_value': init_cash
        }
        
    entries = (df['prob_up'] > 0.55) & (df['volume_ratio'] > 0.5)
    
    if not entries.any():
        return {
            'total_return': 0, 'win_rate': 0, 'sharpe_ratio': 0,
            'max_drawdown': 0, 'total_trades': 0, 'final_value': init_cash
        }
    
    sl_pct = (sl_atr_mult * df['atr']) / df['close']
    tp_pct = (tp_atr_mult * df['atr']) / df['close']
    
    sl_pct = sl_pct.fillna(0.01)
    tp_pct = tp_pct.fillna(0.02)
    
    try:
        pf = vbt.Portfolio.from_signals(
            close=df['close'],
            entries=entries,
            sl_stop=sl_pct.values,
            tp_stop=tp_pct.values,
            init_cash=init_cash,
            fees=0.0005,
            slippage=0.0005,
            freq='1d'  # Important for Sharpe ratio annualization
        )
        
        return {
            'total_return': float(pf.total_return() * 100) if pd.notna(pf.total_return()) else 0.0,
            'win_rate': float(pf.trades.win_rate() * 100) if pf.trades.count() > 0 else 0.0,
            'sharpe_ratio': float(pf.sharpe_ratio()) if pf.trades.count() > 0 and pd.notna(pf.sharpe_ratio()) else 0.0,
            'max_drawdown': float(pf.max_drawdown() * 100) if pd.notna(pf.max_drawdown()) else 0.0,
            'total_trades': int(pf.trades.count()),
            'final_value': float(pf.value().iloc[-1])
        }
    except Exception as e:
        print(f"Backtesting error: {e}")
        return {
            'total_return': 0, 'win_rate': 0, 'sharpe_ratio': 0,
            'max_drawdown': 0, 'total_trades': 0, 'final_value': 100000
        }
