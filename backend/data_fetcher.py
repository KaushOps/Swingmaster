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

_macro_cache = None

def fetch_macro_data(years: int = 2) -> pd.DataFrame:
    """Fetches daily macro features (India VIX, USD/INR, Brent Oil) to pass to ML model."""
    global _macro_cache
    if _macro_cache is not None:
        return _macro_cache
    try:
        # Download all 3 tickers at once. Using ^INDIAVIX for VIX, USDINR=X for currency, BZ=F for Brent
        tickers = ["^INDIAVIX", "USDINR=X", "BZ=F"]
        df = yf.download(tickers, period=f"{years}y", interval="1d", progress=False)['Close']
        if df.empty:
            return pd.DataFrame()
        # yf.download returns a MultiIndex column if multiple tickers, or single index if one fails.
        # Clean up column names based on available data
        col_map = {"^INDIAVIX": "macro_vix", "USDINR=X": "macro_usdinr", "BZ=F": "macro_brent"}
        df.rename(columns=col_map, inplace=True)
        # Forward fill missing days (e.g. market holidays that don't overlap)
        df.ffill(inplace=True)
        # Ensure timezone unaware so it merges easily with stock data
        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)
        _macro_cache = df
        return df
    except Exception as e:
        print(f"Failed to fetch macro data: {e}")
        return pd.DataFrame()



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


# ── FMP Integration ───────────────────────────────────────────────────────────

FMP_API_KEY = "N63bFFQd1j3PjbDyciIv1bXqagYmBSJr"
FMP_BASE    = "https://financialmodelingprep.com/stable"

EARNINGS_BLACKOUT_FILE = os.path.join(os.path.dirname(__file__), 'data', 'earnings_blackout_cache.json')
_earnings_blackout_cache: dict = {}      # {symbol: [date_str, ...]}
_earnings_blackout_date: str   = ""

def fetch_earnings_blackout(symbols: list, blackout_days: int = 2) -> set:
    """
    Returns a set of (symbol, date_str) pairs where trading should be suppressed
    because an earnings announcement is within `blackout_days` days.
    Uses FMP earnings-calendar endpoint — 1 API call covers all symbols for 14-day window.
    Caches result to disk daily so restarts don't cost extra calls.
    """
    global _earnings_blackout_cache, _earnings_blackout_date

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Return from memory cache if fresh
    if _earnings_blackout_date == today_str and _earnings_blackout_cache:
        blackout_set = set()
        for sym, dates in _earnings_blackout_cache.items():
            for d in dates:
                for delta in range(-blackout_days, blackout_days + 1):
                    dt = (datetime.strptime(d, "%Y-%m-%d") + timedelta(days=delta)).strftime("%Y-%m-%d")
                    blackout_set.add((sym, dt))
        return blackout_set

    # Try disk cache
    if os.path.exists(EARNINGS_BLACKOUT_FILE):
        try:
            with open(EARNINGS_BLACKOUT_FILE, 'r') as f:
                cached = json.load(f)
            if cached.get('date') == today_str:
                _earnings_blackout_cache = cached.get('data', {})
                _earnings_blackout_date  = today_str
                print(f"[FMP] Earnings blackout loaded from disk: {sum(len(v) for v in _earnings_blackout_cache.values())} events")
                return fetch_earnings_blackout(symbols, blackout_days)
        except Exception:
            pass

    # Fetch from FMP — one call for a 14-day window
    try:
        from_date = today_str
        to_date   = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        url = f"{FMP_BASE}/earnings-calendar?from={from_date}&to={to_date}&apikey={FMP_API_KEY}"
        r   = requests.get(url, timeout=10)
        if r.status_code != 200:
            print(f"[FMP] Earnings calendar fetch failed: {r.status_code}")
            return set()
        events = r.json()
        sym_set = set(s.upper() for s in symbols)
        data: dict = {}
        for ev in events:
            sym = str(ev.get('symbol', '')).upper()
            if sym in sym_set:
                date_ev = str(ev.get('date', ''))[:10]
                if sym not in data:
                    data[sym] = []
                if date_ev not in data[sym]:
                    data[sym].append(date_ev)

        _earnings_blackout_cache = data
        _earnings_blackout_date  = today_str
        os.makedirs(os.path.dirname(EARNINGS_BLACKOUT_FILE), exist_ok=True)
        with open(EARNINGS_BLACKOUT_FILE, 'w') as f:
            json.dump({'date': today_str, 'data': data}, f)
        n = sum(len(v) for v in data.values())
        print(f"[FMP] Earnings blackout fetched: {n} events for {len(data)} symbols")
        return fetch_earnings_blackout(symbols, blackout_days)
    except Exception as e:
        print(f"[FMP] Earnings blackout error: {e}")
        return set()


US_MACRO_FILE = os.path.join(os.path.dirname(__file__), 'data', 'us_macro_cache.json')
_us_macro_cache: Optional[pd.DataFrame] = None
_us_macro_cache_date: str = ""

def fetch_us_macro_data(years: int = 2) -> pd.DataFrame:
    """
    Fetches US macro features for ML model:
      - 2Y treasury yield, 10Y treasury yield, yield spread (10Y-2Y)
    Uses FMP treasury-rates endpoint (1 call/day, cached).
    Falls back to yfinance ^TNX / ^IRX on failure.
    """
    global _us_macro_cache, _us_macro_cache_date

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Memory cache
    if _us_macro_cache is not None and _us_macro_cache_date == today_str:
        return _us_macro_cache

    # Disk cache
    if os.path.exists(US_MACRO_FILE):
        try:
            with open(US_MACRO_FILE, 'r') as f:
                cached = json.load(f)
            if cached.get('date') == today_str:
                df = pd.DataFrame(cached['rows'])
                df.index = pd.to_datetime(df['date'])
                df = df.drop(columns=['date'])
                _us_macro_cache = df
                _us_macro_cache_date = today_str
                print(f"[FMP] US macro loaded from disk: {len(df)} rows")
                return df
        except Exception:
            pass

    # Fetch from FMP
    try:
        from_date = (datetime.now() - timedelta(days=years * 365)).strftime("%Y-%m-%d")
        url = f"{FMP_BASE}/treasury-rates?from={from_date}&apikey={FMP_API_KEY}"
        r   = requests.get(url, timeout=10)
        if r.status_code == 200 and r.json():
            rows = r.json()
            df = pd.DataFrame(rows)
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date').set_index('date')
            # Keep only year2 (2Y) and year10 (10Y), compute spread
            df = df.rename(columns={'year2': 'us_yield_2y', 'year10': 'us_yield_10y'})
            df['us_yield_spread'] = df['us_yield_10y'] - df['us_yield_2y']
            df = df[['us_yield_2y', 'us_yield_10y', 'us_yield_spread']]
            df.ffill(inplace=True)
            if df.index.tz is not None:
                df.index = df.index.tz_localize(None)

            # Save to disk
            save_rows = [{'date': str(idx.date()), 'us_yield_2y': row['us_yield_2y'],
                          'us_yield_10y': row['us_yield_10y'], 'us_yield_spread': row['us_yield_spread']}
                         for idx, row in df.iterrows()]
            with open(US_MACRO_FILE, 'w') as f:
                json.dump({'date': today_str, 'rows': save_rows}, f)

            _us_macro_cache = df
            _us_macro_cache_date = today_str
            print(f"[FMP] US treasury macro fetched: {len(df)} rows, latest spread={df['us_yield_spread'].iloc[-1]:.2f}")
            return df
    except Exception as e:
        print(f"[FMP] Treasury fetch error: {e}")

    # Fallback: yfinance ^TNX (10Y) and ^IRX (3M as proxy for 2Y)
    try:
        tickers = ["^TNX", "^IRX"]
        raw = yf.download(tickers, period=f"{years}y", interval="1d", progress=False)['Close']
        raw = raw.rename(columns={"^IRX": "us_yield_2y", "^TNX": "us_yield_10y"})
        raw['us_yield_spread'] = raw['us_yield_10y'] - raw['us_yield_2y']
        raw.ffill(inplace=True)
        if raw.index.tz is not None:
            raw.index = raw.index.tz_localize(None)
        _us_macro_cache = raw
        _us_macro_cache_date = today_str
        print(f"[FMP] US macro fallback via yfinance: {len(raw)} rows")
        return raw
    except Exception as e2:
        print(f"[FMP] US macro fallback also failed: {e2}")
        return pd.DataFrame()
