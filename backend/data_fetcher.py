import yfinance as yf
import pandas as pd
import requests
from datetime import datetime, timedelta
import io
from typing import Dict, Optional

def fetch_daily_data(symbol: str, years: int = 2) -> pd.DataFrame:
    """
    Fetches daily OHLCV data for a given NSE symbol.
    """
    ticker = yf.Ticker(symbol)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    df = ticker.history(start=start_date, end=end_date, interval="1d")
    if df.empty:
        return df
    df.columns = [c.lower() for c in df.columns]
    return df


def fetch_weekly_data(symbol: str) -> pd.DataFrame:
    """
    Fetches weekly OHLCV data for a given NSE symbol (1 year).
    Used for multi-timeframe weekly trend confirmation.
    """
    ticker = yf.Ticker(symbol)
    df = ticker.history(period="2y", interval="1wk")
    if df.empty:
        return df
    df.columns = [c.lower() for c in df.columns]
    return df


def is_weekly_bullish(symbol: str) -> bool:
    """
    Returns True if the stock is bullish on the weekly chart:
    - Weekly close must be above the 20-week EMA
    - Weekly close must be above the prior week's close (momentum)
    Defaults to False if data is unavailable (fail-closed).
    """
    try:
        df = fetch_weekly_data(symbol)
        if len(df) < 22:
            return False  # not enough history, fail closed
        df['ema20w'] = df['close'].ewm(span=20, adjust=False).mean()
        last = df.iloc[-1]
        prev = df.iloc[-2]
        above_ema = last['close'] > last['ema20w']
        weekly_momentum = last['close'] > prev['close']
        return bool(above_ema and weekly_momentum)
    except Exception:
        return False  # fail closed on any error


# Cache the NSE Bhavcopy delivery data to avoid re-downloading per stock
import os
import json

DELIVERY_CACHE_FILE = os.path.join(os.path.dirname(__file__), 'data', 'delivery_cache.json')
_delivery_cache: dict = {}
_delivery_cache_date: str = ""


def _fetch_nse_delivery_pct() -> dict:
    """
    Downloads today's (or most recent available) NSE Bhavcopy CSV and
    returns a dict of {SYMBOL: delivery_pct_float}.
    Uses a robust disk cache to prevent redundant downloads across restarts.
    """
    global _delivery_cache, _delivery_cache_date

    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # Load from memory first
    if _delivery_cache_date == today_str and _delivery_cache:
        return _delivery_cache

    # Load from disk
    if os.path.exists(DELIVERY_CACHE_FILE):
        try:
            with open(DELIVERY_CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
                if cache_data.get('date') == today_str:
                    _delivery_cache = cache_data.get('data', {})
                    _delivery_cache_date = today_str
                    print(f"Loaded delivery cache from disk: {len(_delivery_cache)} symbols")
                    return _delivery_cache
        except Exception as e:
            print(f"Failed to load delivery cache from disk: {e}")

    # Try last 5 trading days in case of holiday/weekend
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.nseindia.com"
    }

    for days_back in range(1, 6):
        date = datetime.now() - timedelta(days=days_back)
        if date.weekday() >= 5:  # skip weekends
            continue
        date_str = date.strftime("%d%m%Y")
        url = f"https://archives.nseindia.com/products/content/sec_bhavdata_full_{date_str}.csv"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200 and len(resp.content) > 1000:
                df = pd.read_csv(io.StringIO(resp.text))
                df.columns = [c.strip() for c in df.columns]
                # Filter EQ series only
                eq = df[df['SERIES'].str.strip() == 'EQ']
                result = {}
                for _, row in eq.iterrows():
                    sym = str(row['SYMBOL']).strip()
                    try:
                        pct = float(str(row['DELIV_PER']).strip().replace('-', '0'))
                        result[sym] = pct
                    except Exception:
                        result[sym] = None
                _delivery_cache = result
                _delivery_cache_date = today_str
                
                # Save to disk
                os.makedirs(os.path.dirname(DELIVERY_CACHE_FILE), exist_ok=True)
                with open(DELIVERY_CACHE_FILE, 'w') as f:
                    json.dump({'date': today_str, 'data': result}, f)
                    
                print(f"NSE Bhavcopy loaded: {len(result)} symbols from {date_str}")
                return result
        except Exception as e:
            print(f"Bhavcopy fetch failed for {date_str}: {e}")
            continue

    print("NSE Bhavcopy unavailable — delivery filter will be skipped")
    return {}


def get_delivery_pct(symbol: str) -> Optional[float]:
    """
    Returns the delivery percentage for a given symbol from the latest NSE Bhavcopy.
    Returns None if unavailable (delivery filter is skipped).
    """
    data = _fetch_nse_delivery_pct()
    if not data:
        return None
    # NSE Bhavcopy uses symbols WITHOUT .NS suffix
    clean = symbol.replace('.NS', '').upper()
    return data.get(clean)
