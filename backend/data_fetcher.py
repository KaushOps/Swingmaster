import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

def fetch_daily_data(symbol: str, years: int = 2) -> pd.DataFrame:
    """
    Fetches daily data for a given NSE symbol.
    """
    ticker = yf.Ticker(symbol)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    
    df = ticker.history(start=start_date, end=end_date, interval="1d")
    
    if df.empty:
        return df
        
    # Clean up column names to lowercase for consistency
    df.columns = [c.lower() for c in df.columns]
    
    return df
