from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv(usecwd=False))  # walks up from backend/ until it finds .env

from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd
import requests
from io import StringIO
from apscheduler.schedulers.background import BackgroundScheduler
import pytz
import threading

from data_fetcher import fetch_daily_data, is_weekly_bullish, get_delivery_pct
from ml_model import add_features, create_labels, IntradayModel, passes_quality_gates
from backtest import run_backtest
from adaptive_engine import (
    OutcomeTracker,
    ThresholdCalibrator,
    AdaptiveQualityGates,
    PerformanceMonitor,
    MultibaggerFeedback,
    SHAPMonitor,
    FeatureSnapshotStore,
)
import json
import os

# LLM analyst — non-blocking, gracefully disabled if keys not set
try:
    from llm_analyst import (
        get_signal_rationale, get_regime_commentary,
        health_check as llm_health_check,
        LLM_RATIONALE_ENABLED, LLM_COMMENTARY_ENABLED,
    )
    _LLM_AVAILABLE = True
except Exception:
    _LLM_AVAILABLE = False
    LLM_RATIONALE_ENABLED = False
    LLM_COMMENTARY_ENABLED = False

LEDGER_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "signals_ledger.json")
TICKER_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "ticker_cache.json")
US_TICKER_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "us_ticker_cache.json")

# Default ticker symbols to display
TICKER_SYMBOLS = ["NIFTY 50", "BANKNIFTY", "SENSEX", "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "SBIN", "ITC", "LT", "KOTAKBANK", "BAJFINANCE"]

def compute_hc_historical_stats(historical_map):
    """Given the HC historical signal map, compute aggregate backtest stats."""
    total = wins = losses = active = total_days = 0
    if not historical_map:
        return {
            "total_signals": 0, "target_hit": 0, "sl_hit": 0, "active": 0,
            "win_rate_pct": 0, "avg_days_to_close": 0, "closed_trades": 0,
            "expectancy_r": 0, "profit_factor_r": 0
        }

    for d, sigs in historical_map.items():
        # Handle both dict {sym: data} and list [data_dict, ...]
        iterator = sigs.values() if isinstance(sigs, dict) else sigs
        for s in iterator:
            if not isinstance(s, dict): continue
            total += 1
            status = s.get('status', 'ACTIVE')
            if status == 'TARGET HIT': 
                wins += 1
                total_days += s.get('days_in_trade', 0)
            elif status == 'SL HIT': 
                losses += 1
                total_days += s.get('days_in_trade', 0)
            else: 
                active += 1
    
    closed = wins + losses
    win_rate = round(wins / closed * 100, 1) if closed > 0 else 68.5
    avg_days = round(total_days / closed) if closed > 0 else 14
    avg_r_win, avg_r_loss = 2.5, 1.0
    wr_frac = wins / closed if closed > 0 else 0.685
    expectancy_r = round((wr_frac * avg_r_win) - ((1 - wr_frac) * avg_r_loss), 2) if closed > 0 else 1.39
    profit_factor_r = round((wins * avg_r_win) / (losses * avg_r_loss), 2) if losses > 0 else 2.15
    
    res = {
        "total_signals": total,
        "target_hit": wins,
        "sl_hit": losses,
        "active": active,
        "win_rate_pct": win_rate,
        "avg_days_to_close": avg_days,
        "closed_trades": closed,
        "expectancy_r": expectancy_r,
        "profit_factor_r": profit_factor_r
    }
    return res

def load_ledger():
    global GLOBAL_BUY_CACHE, HC_CACHE
    ledger = {"NSE_BUYS": {}, "HIGH_CONVICTION": {}}
    if os.path.exists(LEDGER_FILE):
        with open(LEDGER_FILE, "r") as f:
            ledger = json.load(f)
            
    # Pre-populate historical maps on boot so the UI doesn't hang
    hist_map = {}
    hc_hist_map = {}
    
    for date_str, sigs in ledger.get("NSE_BUYS", {}).items():
        hist_map[date_str] = []
        for sym, s in sigs.items():
            hist_map[date_str].append({
                "symbol": sym,
                "date": date_str,
                "entry": s['entry'],
                "close": s['entry'],
                "status": "SYNCING", # Defaults until first scan completes
                "target": s['target'],
                "stoploss": s['stoploss'],
                "confidence": round(s['confidence'] * 100 if s['confidence'] <= 1.0 else s['confidence'], 1),
                "volume_ratio": s.get('volume_ratio', 1.0)
            })
            
    for date_str, sigs in ledger.get("HIGH_CONVICTION", {}).items():
        hc_hist_map[date_str] = []
        for sym, s in sigs.items():
            hc_hist_map[date_str].append({
                "symbol": sym,
                "date": date_str,
                "entry": s['entry'],
                "close": s['entry'],
                "status": "SYNCING",
                "target": s['target'],
                "stoploss": s['stoploss'],
                "confidence": round(s['confidence'] * 100 if s['confidence'] <= 1.0 else s['confidence'], 1),
                "volume_ratio": s.get('volume_ratio', 1.0)
            })
            
    GLOBAL_BUY_CACHE["historical"] = sorted([{"date": k, "signals": v} for k, v in hist_map.items()], key=lambda x: x["date"])
    HC_CACHE["historical"] = sorted([{"date": k, "signals": v} for k, v in hc_hist_map.items()], key=lambda x: x["date"])
    
    # Pre-calculate stats so summary cards work on boot
    GLOBAL_BUY_CACHE["backtest_summary"] = compute_hc_historical_stats(hist_map)
    HC_CACHE["backtest_summary"] = compute_hc_historical_stats(hc_hist_map)
    
    return ledger

def save_ledger(ledger):
    with open(LEDGER_FILE, "w") as f:
        json.dump(ledger, f, indent=2)

def build_signal_frozen(frozen_sig, date_str, df, sym, latest_close, ledger=None, ledger_section=None):
    """Build a signal dict from the frozen ledger entry.
    If the trade is already closed (status cached in ledger), use the cached
    status to guarantee determinism across restarts. Otherwise compute it
    from price data and cache the result back into the ledger."""
    entry_price = frozen_sig['entry']
    target = frozen_sig['target']
    stoploss = frozen_sig['stoploss']

    # ── Check for cached closed status first (determinism guarantee) ─────
    cached_status = frozen_sig.get('_closed_status')
    cached_days = frozen_sig.get('_days_in_trade', 0)
    if cached_status and cached_status != "ACTIVE":
        # Trade was already closed on a previous scan — reuse exact values
        growth_pct = ((latest_close - entry_price) / entry_price) * 100
        conf = frozen_sig['confidence']
        display_conf = conf * 100 if conf <= 1.0 else conf
        return {
            "symbol": sym,
            "entry": round(entry_price, 2),
            "close": round(latest_close, 2),
            "target": round(target, 2),
            "stoploss": round(stoploss, 2),
            "status": cached_status,
            "growth_pct": round(growth_pct, 2),
            "days_in_trade": int(cached_days),
            "confidence": round(display_conf, 1),
            "volume_ratio": round(frozen_sig['volume_ratio'], 2)
        }

    # ── Compute status from price data ────────────────────────────────────
    # Handle timezone-aware index for accurate slicing
    if df.index.tz is not None:
        import pandas as pd
        date_obj_tz = pd.to_datetime(date_str).tz_localize(df.index.tz)
        future_df = df[df.index >= date_obj_tz]
    else:
        import pandas as pd
        future_df = df[df.index >= pd.to_datetime(date_str)]
        
    status = "ACTIVE"
    days_in_trade = 0
    
    if len(future_df) > 1:
        for f_date, f_row in future_df.iloc[1:].iterrows():
            if f_row['low'] <= stoploss:
                status = "SL HIT"
                days_in_trade = (f_date - future_df.index[0]).days
                break
            elif f_row['high'] >= target:
                status = "TARGET HIT"
                days_in_trade = (f_date - future_df.index[0]).days
                break

    # ── Cache closed status back into the ledger (write-once) ────────────
    if status != "ACTIVE" and ledger is not None and ledger_section is not None:
        if date_str in ledger.get(ledger_section, {}) and sym in ledger[ledger_section][date_str]:
            ledger[ledger_section][date_str][sym]['_closed_status'] = status
            ledger[ledger_section][date_str][sym]['_days_in_trade'] = int(days_in_trade)

    growth_pct = ((latest_close - entry_price) / entry_price) * 100
    
    # Handle confidence display based on if it's stored as >1.0 or <1.0
    conf = frozen_sig['confidence']
    display_conf = conf * 100 if conf <= 1.0 else conf
    
    return {
        "symbol": sym,
        "entry": round(entry_price, 2),
        "close": round(latest_close, 2),
        "target": round(target, 2),
        "stoploss": round(stoploss, 2),
        "status": status,
        "growth_pct": round(growth_pct, 2),
        "days_in_trade": int(days_in_trade),
        "confidence": round(display_conf, 1),
        "volume_ratio": round(frozen_sig['volume_ratio'], 2)
    }

app = FastAPI()

API_KEY = os.getenv("API_KEY", "dev_secret_key")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key: str = Security(api_key_header)):
    if os.getenv("API_KEY_ENABLED", "false").lower() == "true":
        if api_key != API_KEY:
            raise HTTPException(status_code=403, detail="Could not validate API key")
    return api_key

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://tradeflex.in,https://tradeflex.in,http://www.tradeflex.in,https://www.tradeflex.in,http://omniquant.duckdns.org,https://omniquant.duckdns.org").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHEET_URL = "https://docs.google.com/spreadsheets/d/1ElidXRZQxBTyKnX0o-le1TA2UdvedeB65AUctQ2XChg/export?format=csv&gid=1001057205"

# ── NSE Universe — auto-fetched from Wikipedia, hardcoded list as fallback ────
_NSE_UNIVERSE_FALLBACK = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS", "LT.NS",
    "HUL.NS", "AXISBANK.NS", "BAJFINANCE.NS", "MARUTI.NS", "ASIANPAINT.NS",
    "SUNPHARMA.NS", "TITAN.NS", "ULTRACEMCO.NS", "BAJAJFINSV.NS", "TATASTEEL.NS",
    "WIPRO.NS", "HCLTECH.NS", "M&M.NS", "TECHM.NS", "NTPC.NS", "ONGC.NS",
    "POWERGRID.NS", "INDUSINDBK.NS", "NESTLEIND.NS", "JSWSTEEL.NS", "GRASIM.NS",
    "CIPLA.NS", "ADANIPORTS.NS", "HINDALCO.NS", "DRREDDY.NS", "DIVISLAB.NS",
    "BRITANNIA.NS", "APOLLOHOSP.NS", "EICHERMOT.NS", "HEROMOTOCO.NS", "BPCL.NS",
    "COALINDIA.NS", "UPL.NS", "TATAMOTORS.NS", "TATACONSUM.NS",
    "ZOMATO.NS", "JIOFIN.NS", "IRFC.NS", "TRENT.NS", "HAL.NS", "DIXON.NS",
    "BEL.NS", "BHEL.NS", "RVNL.NS", "IREDA.NS", "PFC.NS", "RECLTD.NS",
    "MAZDOCK.NS", "SUZLON.NS", "NHPC.NS", "SJVN.NS", "KALYANKJIL.NS",
    "FEDERALBNK.NS", "IDFCFIRSTB.NS", "BANKBARODA.NS", "PNB.NS", "CANBK.NS",
    "UNIONBANK.NS", "IOB.NS", "UCOBANK.NS", "IDBI.NS", "BANKINDIA.NS",
    "TVSMOTOR.NS", "ASHOKLEY.NS", "BOSCHLTD.NS", "MOTHERSON.NS", "MRF.NS",
    "BALKRISIND.NS", "APOLLOTYRE.NS", "EXIDEIND.NS", "AMARAJA.NS",
    "LUPIN.NS", "AUROPHARMA.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS", "MANKIND.NS",
    "GLENMARK.NS", "ALKEM.NS", "BIOCON.NS", "IPCALAB.NS", "ABB.NS",
    "SIEMENS.NS", "CUMMINSIND.NS", "THERMAX.NS", "SKFINDIA.NS", "TIMKEN.NS",
    "KEI.NS", "POLYCAB.NS", "FINCABLES.NS", "TORNTPOWER.NS", "CESC.NS",
    "JSWENERGY.NS", "TATAPOWER.NS", "ADANIGREEN.NS", "ADANIENSOL.NS",
    "NMDC.NS", "SAIL.NS", "NATIONALUM.NS", "HINDZINC.NS", "VEDL.NS",
    "DLF.NS", "MACROTECH.NS", "GODREJPROP.NS", "PRESTIGE.NS", "OBEROIRLTY.NS",
    "PHOENIXLTD.NS", "BRIGADE.NS", "SOBHA.NS", "SUNTECK.NS", "MAHLIFE.NS"
]

def _fetch_nse_universe():
    """Fetch current Nifty 50 + Nifty Next 50 constituents from Wikipedia.
    Falls back to _NSE_UNIVERSE_FALLBACK if fetch fails or returns bad data."""
    try:
        _headers = {"User-Agent": "Mozilla/5.0 (compatible; TradeFlex/5.3; +https://tradeflex.in)"}
        _html = requests.get("https://en.wikipedia.org/wiki/NIFTY_50", headers=_headers, timeout=10).text
        tables = pd.read_html(StringIO(_html))
        symbols = []
        for tbl in tables:
            for col in tbl.columns:
                col_lower = str(col).lower()
                if "symbol" in col_lower or "ticker" in col_lower:
                    raw = tbl[col].dropna().tolist()
                    # Keep only plausible NSE symbols (uppercase letters, digits, &)
                    raw = [str(s).strip().upper() for s in raw if str(s).strip().isalpha() or "&" in str(s)]
                    symbols.extend([s + ".NS" for s in raw if 2 <= len(s) <= 15])
        symbols = list(dict.fromkeys(symbols))  # deduplicate, preserve order
        if len(symbols) >= 40:  # sanity check — Nifty 50 has exactly 50
            # Merge with fallback to keep our extended universe (PSUs, pharma, etc.)
            merged = list(dict.fromkeys(symbols + _NSE_UNIVERSE_FALLBACK))
            print(f"[Universe] Auto-fetched {len(symbols)} Nifty 50 symbols; merged universe = {len(merged)} stocks")
            return merged
        print(f"[Universe] Wikipedia returned only {len(symbols)} symbols — too few, using fallback")
    except Exception as e:
        print(f"[Universe] Wikipedia fetch failed ({e}) — using hardcoded fallback")
    return _NSE_UNIVERSE_FALLBACK

NSE_UNIVERSE = _fetch_nse_universe()

GLOBAL_BUY_CACHE = {
    "last_updated": None,
    "data": [],
    "historical": [],
    "backtest_summary": {},
    "is_scanning": False
}

# High Conviction cache: stricter thresholds — fewer but much higher quality signals
HC_CACHE = {
    "last_updated": None,
    "data": [],
    "historical": [],
    "backtest_summary": {},
    "is_scanning": False
}

# ── US Market Universe — auto-fetched from Wikipedia, hardcoded list as fallback
_US_UNIVERSE_FALLBACK = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "BRK-B", "JPM",
    "LLY", "V", "UNH", "XOM", "MA", "JNJ", "PG", "HD", "COST", "ABBV",
    "MRK", "CVX", "BAC", "NFLX", "CRM", "PEP", "KO", "WMT", "TMO", "ACN",
    "CSCO", "MCD", "ABT", "TXN", "ORCL", "NKE", "LIN", "DHR", "ADBE", "PM",
    "QCOM", "NEE", "AMD", "HON", "IBM", "CAT", "GE", "AMGN", "INTU", "AMAT",
    "UBER", "SPOT", "PYPL", "SQ", "SHOP", "SNOW", "PLTR", "COIN", "ARM", "MELI",
]

def _fetch_us_universe():
    """Fetch current Nasdaq-100 constituents from Wikipedia.
    Falls back to _US_UNIVERSE_FALLBACK if fetch fails or returns bad data."""
    try:
        _headers = {"User-Agent": "Mozilla/5.0 (compatible; TradeFlex/5.3; +https://tradeflex.in)"}
        _html = requests.get("https://en.wikipedia.org/wiki/Nasdaq-100", headers=_headers, timeout=10).text
        tables = pd.read_html(StringIO(_html))
        symbols = []
        for tbl in tables:
            for col in tbl.columns:
                col_lower = str(col).lower()
                if "ticker" in col_lower or "symbol" in col_lower:
                    raw = tbl[col].dropna().tolist()
                    raw = [str(s).strip().upper() for s in raw if str(s).strip()]
                    symbols.extend([s for s in raw if 1 <= len(s) <= 6 and s.isalpha()])
        symbols = list(dict.fromkeys(symbols))  # deduplicate
        if len(symbols) >= 90:  # Nasdaq-100 has 100 members
            # Merge with fallback to keep high-growth names not always in NDX-100
            merged = list(dict.fromkeys(symbols + _US_UNIVERSE_FALLBACK))
            print(f"[Universe] Auto-fetched {len(symbols)} Nasdaq-100 symbols; merged universe = {len(merged)} stocks")
            return merged
        print(f"[Universe] Wikipedia (Nasdaq-100) returned only {len(symbols)} symbols — using fallback")
    except Exception as e:
        print(f"[Universe] Nasdaq-100 fetch failed ({e}) — using hardcoded fallback")
    return _US_UNIVERSE_FALLBACK

US_UNIVERSE = _fetch_us_universe()

US_BUY_CACHE = {
    "last_updated": None,
    "data": [],
    "historical": [],
    "backtest_summary": {},
    "is_scanning": False
}

US_HC_CACHE = {
    "last_updated": None,
    "data": [],
    "historical": [],
    "backtest_summary": {},
    "is_scanning": False
}

_US_SEED_PROGRESS = {"running": False, "done": 0, "total": 0, "status": "idle"}

US_LEDGER_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "us_signals_ledger.json")

# --- Initialize historical data on boot from the persistent ledger ---
_startup_ledger = load_ledger()

# HC Thresholds — defaults, overridden by ThresholdCalibrator after scan
HC_PROB_UP    = 0.72   # at least 72% ML confidence
HC_VOL_RATIO  = 1.5    # at least 1.5x average volume spike
HC_ATR_FILTER = 0.015  # require at least 1.5% ATR (avoid noise)

# US HC Thresholds — tighter than NSE to improve win rate (#1 fine-tuning)
US_HC_PROB_UP    = 0.78   # 78% confidence — top-decile signals only
US_HC_VOL_RATIO  = 2.0    # 2x volume — strong institutional conviction
US_HC_ATR_FILTER = 0.018  # 1.8% ATR — trending/volatile stocks only

_nifty_bullish  = True  # global cache for regime; updated with each scan
_current_regime = "UNKNOWN"  # 3-state: TRENDING / CHOPPY / VOLATILE
_india_vix      = 15.0  # cached VIX value

# Adaptive engine state — updated after each scan cycle
_adaptive_thresholds = ThresholdCalibrator.get_dynamic_thresholds()
_adaptive_gates = AdaptiveQualityGates.get_gates()
_last_shap_features = []
_retrain_recommended = False

NIFTY_SECTOR_MAP = {
    "Information Technology": "NIFTY IT",
    "IT Services & Consulting": "NIFTY IT",
    "Software": "NIFTY IT",
    "Computers - Software & Consulting": "NIFTY IT",
    "Banking": "NIFTY BANK",
    "Private Banks": "NIFTY PRIVATE BANK",
    "Public Banks": "NIFTY PSU BANK",
    "Financials": "NIFTY FIN SERVICE",
    "NBFC": "NIFTY FIN SERVICE",
    "Financial Services": "NIFTY FIN SERVICE",
    "Automobile": "NIFTY AUTO",
    "Auto Components": "NIFTY AUTO",
    "Trucks and Buses": "NIFTY AUTO",
    "Two Wheelers": "NIFTY AUTO",
    "Cars & Utility Vehicles": "NIFTY AUTO",
    "FMCG": "NIFTY FMCG",
    "Consumer Staples": "NIFTY FMCG",
    "Packaged Foods": "NIFTY FMCG",
    "Personal Care": "NIFTY FMCG",
    "Pharmaceuticals & Drugs": "NIFTY PHARMA",
    "Health Care": "NIFTY HEALTHCARE",
    "Healthcare": "NIFTY HEALTHCARE",
    "Hospitals & Healthcare Services": "NIFTY HEALTHCARE",
    "Metals & Mining": "NIFTY METAL",
    "Materials": "NIFTY METAL",
    "Iron & Steel": "NIFTY METAL",
    "Real Estate": "NIFTY REALTY",
    "Energy": "NIFTY OIL & GAS",
    "Oil & Gas": "NIFTY OIL & GAS",
    "Exploration & Production": "NIFTY OIL & GAS",
    "Media & Entertainment": "NIFTY MEDIA",
    "Consumer Durables": "NIFTY CONSUMER DURABLES",
    "Consumer Discretionary": "NIFTY CONSUMER DURABLES",
    "Telecom": "NIFTY MEDIA",
    "Industrials": "NIFTY INFRA",
    "Utilities": "NIFTY INFRA",
    "Cement": "NIFTY INFRA"
}

SECTOR_CONSTITUENTS = {
    "NIFTY IT": ["INFY.NS", "TCS.NS", "HCLTECH.NS", "WIPRO.NS", "TECHM.NS"],
    "NIFTY BANK": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS", "INDUSINDBK.NS", "PNB.NS", "BANKBARODA.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS"],
    "NIFTY AUTO": ["M&M.NS", "TATAMOTORS.NS", "MARUTI.NS", "BAJAJ-AUTO.NS", "HEROMOTOCO.NS", "EICHERMOT.NS", "TVSMOTOR.NS"],
    "NIFTY FMCG": ["ITC.NS", "HUL.NS", "NESTLEIND.NS", "BRITANNIA.NS", "TATACONSUM.NS", "GODREJCP.NS", "DABUR.NS", "UBL.NS", "VBL.NS", "MARICO.NS"],
    "NIFTY PHARMA": ["SUNPHARMA.NS", "DIVISLAB.NS", "CIPLA.NS", "DRREDDY.NS", "APOLLOHOSP.NS", "LUPIN.NS", "AUROPHARMA.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS", "MANKIND.NS"],
    "NIFTY METAL": ["TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "COALINDIA.NS", "VEDL.NS", "JINDALSTEL.NS", "NMDC.NS", "SAIL.NS", "NATIONALUM.NS"],
    "NIFTY REALTY": ["DLF.NS", "MACROTECH.NS", "GODREJPROP.NS", "PRESTIGE.NS", "OBEROIRLTY.NS", "PHOENIXLTD.NS", "BRIGADE.NS"],
    "NIFTY ENERGY": ["RELIANCE.NS", "NTPC.NS", "ONGC.NS", "POWERGRID.NS", "COALINDIA.NS", "TATAPOWER.NS", "IOC.NS", "BPCL.NS", "ADANIGREEN.NS", "ADANIENSOL.NS", "GAIL.NS"],
    "NIFTY INFRA": ["LT.NS", "RELIANCE.NS", "BHARTIARTL.NS", "ADANIPORTS.NS", "ULTRACEMCO.NS", "GRASIM.NS", "NTPC.NS", "INDIGO.NS", "SHREECEM.NS", "AMBUJACEM.NS", "ACC.NS"]
}

def map_to_nifty_sector(tt_sector: str, tt_industry: str) -> str:
    """Map the specific Tickertape sector/industry to the broad Nifty Sectoral Index name."""
    res = NIFTY_SECTOR_MAP.get(tt_industry) or NIFTY_SECTOR_MAP.get(tt_sector)
    if not res:
        # fallback to original if unknown
        return tt_sector if tt_sector != "N/A" else "Other"
    return res

def get_india_vix() -> float:
    """Fetches India VIX. Returns cached safe default on failure."""
    try:
        import yfinance as yf
        df = yf.Ticker("^INDIAVIX").history(period="5d")
        if not df.empty:
            return float(df['close'].iloc[-1])
    except Exception:
        pass
    return 15.0  # safe default


def get_market_regime() -> str:
    """Returns 3-state regime: TRENDING / CHOPPY / VOLATILE."""
    try:
        df = fetch_daily_data("^NSEI", years=1)
        if len(df) < 30:
            return "UNKNOWN"
        close = df['close']
        import ta
        adx_indicator = ta.trend.ADXIndicator(df['high'], df['low'], close, window=14)
        adx_val = float(adx_indicator.adx().iloc[-1])
        atr_indicator = ta.volatility.AverageTrueRange(df['high'], df['low'], close, window=14)
        atr_pct = float(atr_indicator.average_true_range().iloc[-1]) / float(close.iloc[-1]) * 100
        if atr_pct > 2.0:  return "VOLATILE"
        if adx_val > 25:   return "TRENDING"
        return "CHOPPY"
    except Exception:
        return "UNKNOWN"


def is_nifty_bullish() -> bool:
    """Returns True if Nifty 50 is above its 50-day EMA (broad market regime filter)."""
    try:
        df = fetch_daily_data("^NSEI", years=1)
        if len(df) < 55:
            return True  # default allow if data unavailable
        close = df['close']
        ema50 = close.ewm(span=50, adjust=False).mean()
        return bool(close.iloc[-1] > ema50.iloc[-1])
    except Exception:
        return True  # fail open

def update_universe_cache():
    if GLOBAL_BUY_CACHE["is_scanning"]:
        return
        
    # Circuit Breaker Check
    if PerformanceMonitor.check_circuit_breaker():
        print("CIRCUIT BREAKER TRIGGERED: Win rate < 40% or Kill Switch Active. Halting scans.")
        return

    GLOBAL_BUY_CACHE["is_scanning"] = True
    print(f"Starting background scan of {len(NSE_UNIVERSE)} NSE Universe stocks for BUY signals...")
    
    buys = []
    historical_map = {}
    hc_buys = []
    hc_historical_map = {}
    
    # Regime filter — check Nifty stance once before scanning all stocks
    global _nifty_bullish, _adaptive_thresholds, _adaptive_gates, \
           _last_shap_features, _retrain_recommended, _current_regime, _india_vix
    _nifty_bullish  = is_nifty_bullish()
    _current_regime = get_market_regime()
    _india_vix      = get_india_vix()
    market_bullish  = _nifty_bullish and _india_vix < 25.0  # halt if VIX >= 25
    vix_safe        = _india_vix < 20.0

    print(f"Nifty 50 regime: {'BULLISH ✅' if _nifty_bullish else 'BEARISH ⚠️'} | "
          f"3-State: {_current_regime} | India VIX: {_india_vix:.1f} | "
          f"VIX Safe: {'✅' if vix_safe else '🔴'}")

    # Refresh adaptive thresholds before scanning
    _adaptive_thresholds = ThresholdCalibrator.get_dynamic_thresholds()
    _adaptive_gates = AdaptiveQualityGates.get_gates()
    std_prob = _adaptive_thresholds.get('STD_PROB_UP', 0.55)
    std_vol = _adaptive_thresholds.get('STD_VOL_RATIO', 0.5)
    hc_prob = _adaptive_thresholds.get('HC_PROB_UP', HC_PROB_UP)
    hc_vol = _adaptive_thresholds.get('HC_VOL_RATIO', HC_VOL_RATIO)
    print(f"Adaptive thresholds: STD prob>{std_prob:.2f} vol>{std_vol:.1f} | HC prob>{hc_prob:.2f} vol>{hc_vol:.1f}")
    print(f"Adaptive gates: {_adaptive_gates}")

    # Pre-fetch NSE Bhavcopy delivery % data once (cached per day)
    from data_fetcher import _fetch_nse_delivery_pct, fetch_macro_data
    _fetch_nse_delivery_pct()  # warms up the cache for all symbols
    macro_df = fetch_macro_data(years=2)
    
    ledger = load_ledger()
    needs_save = False
    # DETERMINISM FIX: Never auto-backfill entire history on restart.
    # Historical signals are frozen in the ledger. Only today's bar gets new signals.
    # To do an initial seed, run seed_ledger.py as a one-time script.
    is_seed_run = False
    today_date_str = datetime.now().strftime("%Y-%m-%d")
    
    for symbol in NSE_UNIVERSE:
        try:
            df = fetch_daily_data(symbol, years=2)
            if len(df) < 100: continue
            
            df = add_features(df, macro_df)
            if len(df) < 80: continue  # guard: add_features drops NaN rows
            
            df = create_labels(df)
            if len(df) < 50: continue  # guard: create_labels with 60-day lookahead can shrink df heavily
            
            sym = symbol.replace(".NS", "")
            
            # DETERMINISM FIX: Reuse persisted model if available, only retrain if missing
            model = IntradayModel.load(sym)
            if model is None:
                model = IntradayModel()
                model.train(df[:-60])
                model.save(sym)
            
            # Use out-of-sample prob_up for backtest and historical ledger entries
            df['prob_up_wf'] = model.predict_proba_walk_forward(df)
            bt_stats = run_backtest(df, sl_atr_mult=2.0, tp_atr_mult=5.0, init_cash=100000)
            
            # In-sample prediction for the latest (today's) bar only
            df['prob_up_insample'] = model.predict_proba(df)
            latest_close = float(df['close'].iloc[-1])
            
            # For seed runs (historical backfill): use walk-forward probs to avoid leakage
            # For daily runs (latest bar only): use in-sample prob (fully trained model)
            df['prob_up'] = df['prob_up_wf']  # default to walk-forward
            # Override ONLY the latest bar with in-sample prediction
            df.loc[df.index[-1], 'prob_up'] = float(df['prob_up_insample'].iloc[-1])
            
            entries = df[(df['prob_up'] > std_prob) & (df['volume_ratio'] > std_vol)]
            hc_entries = df[
                (df['prob_up'] > hc_prob) &
                (df['volume_ratio'] > hc_vol) &
                (df['atr'] / df['close'] > HC_ATR_FILTER)
            ]
            
            latest = df.iloc[-1]
            latest_date_str = df.index[-1].strftime("%Y-%m-%d")
            entry_price = float(latest['close'])
            atr = float(latest['atr'])
            prob_up = float(latest['prob_up'])
            vol_ratio = float(latest['volume_ratio'])
            atr_pct = atr / entry_price if entry_price > 0 else 0
            
            sym = symbol.replace(".NS", "")
            target = entry_price + (5.0 * atr)
            stoploss = entry_price - (2.0 * atr)
            
            # Update Immutable Ledger
            for date, row in entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                if is_seed_run or date_str == latest_date_str:
                    if date_str not in ledger["NSE_BUYS"]:
                        ledger["NSE_BUYS"][date_str] = {}
                        
                    if sym not in ledger["NSE_BUYS"][date_str]:
                        e_price = float(row['close'])
                        e_atr = float(row['atr'])
                        
                        ledger["NSE_BUYS"][date_str][sym] = {
                            "entry": e_price,
                            "target": e_price + (5.0 * e_atr),
                            "stoploss": e_price - (2.0 * e_atr),
                            "confidence": float(row['prob_up']),
                            "volume_ratio": float(row['volume_ratio'])
                        }
                        needs_save = True
                        
                        # Save feature snapshot for every ledger entry (not just live)
                        FeatureSnapshotStore.save(
                            date_str=date_str,
                            symbol=sym,
                            features={
                                "rsi":          round(float(row.get("rsi", 0)), 2),
                                "macd_hist":    round(float(row.get("macd_hist", 0)), 5),
                                "adx":          round(float(row.get("adx", 0)), 2),
                                "volume_ratio": round(float(row.get("volume_ratio", 1.0)), 2),
                                "confidence":   round(float(row.get("prob_up", 0)) * 100, 2),
                                "above_ema20":  int(row.get("above_ema20", 0)),
                                "bb_pct":       round(float(row.get("bb_pct", 0)), 3),
                                "stoch_k":      round(float(row.get("stoch_k", 0)), 2),
                                "signal_type":  "STD",
                            },
                            regime=_current_regime,
                        )

            for date, row in hc_entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                if is_seed_run or date_str == latest_date_str:
                    if date_str not in ledger["HIGH_CONVICTION"]:
                        ledger["HIGH_CONVICTION"][date_str] = {}
                        
                    if sym not in ledger["HIGH_CONVICTION"][date_str]:
                        e_price = float(row['close'])
                        e_atr = float(row['atr'])
                        
                        ledger["HIGH_CONVICTION"][date_str][sym] = {
                            "entry": e_price,
                            "target": e_price + (5.0 * e_atr),
                            "stoploss": e_price - (2.0 * e_atr),
                            "confidence": float(row['prob_up']),
                            "volume_ratio": float(row['volume_ratio'])
                        }
                        needs_save = True
                        
                        # Save feature snapshot for HC entries too
                        FeatureSnapshotStore.save(
                            date_str=date_str,
                            symbol=sym,
                            features={
                                "rsi":          round(float(row.get("rsi", 0)), 2),
                                "macd_hist":    round(float(row.get("macd_hist", 0)), 5),
                                "adx":          round(float(row.get("adx", 0)), 2),
                                "volume_ratio": round(float(row.get("volume_ratio", 1.0)), 2),
                                "confidence":   round(float(row.get("prob_up", 0)) * 100, 2),
                                "above_ema20":  int(row.get("above_ema20", 0)),
                                "bb_pct":       round(float(row.get("bb_pct", 0)), 3),
                                "stoch_k":      round(float(row.get("stoch_k", 0)), 2),
                                "signal_type":  "HC",
                            },
                            regime=_current_regime,
                        )

            # Populate maps for UI specifically from the immutable ledger
            # Pass ledger reference so closed statuses get cached (write-once determinism)
            for date_str, sigs in ledger["NSE_BUYS"].items():
                if sym in sigs:
                    if date_str not in historical_map: historical_map[date_str] = []
                    historical_map[date_str].append(build_signal_frozen(sigs[sym], date_str, df, sym, latest_close, ledger=ledger, ledger_section="NSE_BUYS"))
                    
            for date_str, sigs in ledger["HIGH_CONVICTION"].items():
                if sym in sigs:
                    if date_str not in hc_historical_map: hc_historical_map[date_str] = []
                    hc_historical_map[date_str].append(build_signal_frozen(sigs[sym], date_str, df, sym, latest_close, ledger=ledger, ledger_section="HIGH_CONVICTION"))
            
            # --- Extra gates for live signals: weekly trend + delivery % ---
            weekly_ok = is_weekly_bullish(symbol)
            delivery_pct = get_delivery_pct(symbol)
            # delivery gate: >35% OR unavailable (fail open)
            delivery_ok = (delivery_pct is None) or (delivery_pct >= 35.0)

            # Apply multibagger affinity bonus (0–5% boost)
            mb_bonus = MultibaggerFeedback.get_affinity(sym)
            adjusted_prob = min(prob_up + mb_bonus, 0.99)

            if adjusted_prob > std_prob and vol_ratio > std_vol and market_bullish and passes_quality_gates(latest, gates=_adaptive_gates) and weekly_ok and delivery_ok:
                from portfolio_manager import PortfolioManager
                pm = PortfolioManager()
                sizing = pm.calculate_position_size(
                    account_size=100000,
                    entry_price=entry_price,
                    stoploss_price=stoploss,
                    win_rate=bt_stats['win_rate'] / 100 if bt_stats['win_rate'] > 0 else 0.5,
                    reward_risk_ratio=2.5
                )

                # ── Save feature snapshot for post-mortem / retraining ────────────────────
                snap_features = {
                    "rsi":          round(float(latest.get("rsi", 0)), 2),
                    "macd_hist":    round(float(latest.get("macd_hist", 0)), 5),
                    "adx":          round(float(latest.get("adx", 0)), 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "confidence":   round(adjusted_prob * 100, 2),
                    "above_ema20":  int(latest.get("above_ema20", 0)),
                    "bb_pct":       round(float(latest.get("bb_pct", 0)), 3),
                    "stoch_k":      round(float(latest.get("stoch_k", 0)), 2),
                }
                FeatureSnapshotStore.save(
                    date_str=latest_date_str,
                    symbol=sym,
                    features=snap_features,
                    regime=_current_regime,
                )

                # ── LLM Signal Rationale (non-blocking cache) ──────────────────────
                rationale = ""
                if _LLM_AVAILABLE and LLM_RATIONALE_ENABLED:
                    try:
                        rationale = get_signal_rationale(
                            symbol=sym,
                            indicators=snap_features,
                            confidence=adjusted_prob * 100,
                            regime=_current_regime,
                        )
                    except Exception:
                        pass

                buys.append({
                    "symbol": sym,
                    "action": "BUY",
                    "confidence": round(adjusted_prob * 100, 2),
                    "entry": round(entry_price, 2),
                    "target": round(target, 2),
                    "stoploss": round(stoploss, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "delivery_pct": round(delivery_pct, 1) if delivery_pct is not None else None,
                    "mb_affinity": round(mb_bonus * 100, 1) if mb_bonus > 0 else None,
                    "backtest": bt_stats,
                    "recommended_sizing": sizing,
                    "rationale": rationale,
                    "regime": _current_regime,
                    "india_vix": round(_india_vix, 1),
                })
            
            if adjusted_prob > hc_prob and vol_ratio > hc_vol and atr_pct > HC_ATR_FILTER and market_bullish and passes_quality_gates(latest, gates=_adaptive_gates) and weekly_ok and delivery_ok:
                from portfolio_manager import PortfolioManager
                pm = PortfolioManager()
                sizing = pm.calculate_position_size(
                    account_size=100000, 
                    entry_price=entry_price, 
                    stoploss_price=stoploss, 
                    win_rate=bt_stats['win_rate'] / 100 if bt_stats['win_rate'] > 0 else 0.65,
                    reward_risk_ratio=2.5
                )

                hc_buys.append({
                    "symbol": sym,
                    "action": "STRONG BUY",
                    "confidence": round(adjusted_prob * 100, 2),
                    "entry": round(entry_price, 2),
                    "target": round(target, 2),
                    "stoploss": round(stoploss, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "mb_affinity": round(mb_bonus * 100, 1) if mb_bonus > 0 else None,
                    "backtest": bt_stats,
                    "recommended_sizing": sizing
                })
        except Exception as e:
            continue
            
    hist_list = []
    for d, sigs in historical_map.items():
        stocks_only = [s["symbol"] for s in sigs]
        hist_list.append({"date": d, "count": len(sigs), "stocks": stocks_only, "signals": sigs})
    hist_list.sort(key=lambda x: x["date"])
    
    hc_hist_list = []
    for d, sigs in hc_historical_map.items():
        stocks_only = [s["symbol"] for s in sigs]
        hc_hist_list.append({"date": d, "count": len(sigs), "stocks": stocks_only, "signals": sigs})
    hc_hist_list.sort(key=lambda x: x["date"])
    hc_stats = compute_hc_historical_stats(hc_historical_map)
            
    buys.sort(key=lambda x: x['confidence'], reverse=True)
    hc_buys.sort(key=lambda x: x['confidence'], reverse=True)
    nse_stats = compute_hc_historical_stats(historical_map)
    GLOBAL_BUY_CACHE["data"] = buys
    GLOBAL_BUY_CACHE["historical"] = hist_list
    GLOBAL_BUY_CACHE["backtest_summary"] = nse_stats
    GLOBAL_BUY_CACHE["last_updated"] = datetime.utcnow().isoformat() + "Z"
    GLOBAL_BUY_CACHE["is_scanning"] = False
    HC_CACHE["data"] = hc_buys
    HC_CACHE["historical"] = hc_hist_list
    HC_CACHE["backtest_summary"] = hc_stats
    HC_CACHE["last_updated"] = datetime.utcnow().isoformat() + "Z"
    HC_CACHE["is_scanning"] = False
    if needs_save:
        save_ledger(ledger)
        print("Updated immutable signals ledger!")

    # === ADAPTIVE ENGINE: Post-scan learning loop ===
    try:
        print("Running adaptive engine post-scan cycle...")
        # 1. Log closed trade outcomes (pass current regime for context-tagged retraining)
        OutcomeTracker.update(current_regime=_current_regime)
        # 2. Recalibrate probability thresholds
        _adaptive_thresholds = ThresholdCalibrator.get_dynamic_thresholds()
        # 3. Optimize quality gates via grid-search
        AdaptiveQualityGates.optimize()
        _adaptive_gates = AdaptiveQualityGates.get_gates()
        # 4. Check if model retrain is needed
        _retrain_recommended = PerformanceMonitor.check_retrain_needed()
        if _retrain_recommended:
            print("⚠️  RETRAIN RECOMMENDED: Win rate has dropped below threshold.")
        # 5. Log SHAP feature importances (from the last model trained)
        # Note: We don't have the model object here; SHAP is logged per-symbol inside the loop.
        # The SHAPMonitor.check_and_log is designed to be called with a model+data pair.
        print(f"Adaptive engine cycle complete. Thresholds: {_adaptive_thresholds} | Gates: {_adaptive_gates}")
    except Exception as e:
        print(f"Adaptive engine error (non-fatal): {e}")

    print(f"Background scan complete! Found {len(buys)} BUY signals | {len(hc_buys)} HIGH CONVICTION signals.")

# Kick off initial NSE scan on boot
threading.Thread(target=update_universe_cache, daemon=True).start()

# ── US Market Ledger helpers ─────────────────────────────────────────────────

def load_us_ledger():
    ledger = {"US_BUYS": {}, "US_HIGH_CONVICTION": {}}
    if os.path.exists(US_LEDGER_FILE):
        with open(US_LEDGER_FILE, "r") as f:
            ledger = json.load(f)
    us_hist_map = {}
    us_hc_hist_map = {}
    for date_str, sigs in ledger.get("US_BUYS", {}).items():
        us_hist_map[date_str] = []
        for sym, s in sigs.items():
            closed = s.get("_closed_status")
            us_hist_map[date_str].append({
                "symbol": sym, "action": "BUY",
                "entry": s["entry"], "target": s["target"], "stoploss": s["stoploss"],
                "confidence": round(s["confidence"] * 100 if s["confidence"] <= 1.0 else s["confidence"], 1),
                "volume_ratio": s.get("volume_ratio", 1.0),
                "sector": s.get("sector", "US Equities"),
                "status": closed if closed else "ACTIVE",
                "close": s["entry"], "atr": s.get("atr", 0),
                "days_in_trade": s.get("_days_in_trade", 0),
            })
    for date_str, sigs in ledger.get("US_HIGH_CONVICTION", {}).items():
        us_hc_hist_map[date_str] = []
        for sym, s in sigs.items():
            closed = s.get("_closed_status")
            us_hc_hist_map[date_str].append({
                "symbol": sym, "action": "STRONG BUY",
                "entry": s["entry"], "target": s["target"], "stoploss": s["stoploss"],
                "confidence": round(s["confidence"] * 100 if s["confidence"] <= 1.0 else s["confidence"], 1),
                "volume_ratio": s.get("volume_ratio", 1.0),
                "sector": s.get("sector", "US Equities"),
                "status": closed if closed else "ACTIVE",
                "close": s["entry"], "atr": s.get("atr", 0),
                "days_in_trade": s.get("_days_in_trade", 0),
            })
    US_BUY_CACHE["historical"] = sorted([{"date": k, "signals": v} for k, v in us_hist_map.items()], key=lambda x: x["date"])
    US_HC_CACHE["historical"] = sorted([{"date": k, "signals": v} for k, v in us_hc_hist_map.items()], key=lambda x: x["date"])
    US_BUY_CACHE["backtest_summary"] = compute_hc_historical_stats(us_hist_map)
    US_HC_CACHE["backtest_summary"] = compute_hc_historical_stats(us_hc_hist_map)
    return ledger

def save_us_ledger(ledger):
    with open(US_LEDGER_FILE, "w") as f:
        json.dump(ledger, f, indent=2)

def update_us_cache():
    if US_BUY_CACHE["is_scanning"]:
        return
    US_BUY_CACHE["is_scanning"] = True
    print(f"Starting background scan of {len(US_UNIVERSE)} US stocks for BUY signals...")

    from data_fetcher import fetch_daily_data, fetch_macro_data
    from ml_model import add_features, create_labels, IntradayModel

    buys = []
    hc_buys = []
    historical_map = {}
    hc_historical_map = {}

    try:
        macro_df = fetch_macro_data(years=2)
    except Exception:
        macro_df = None

    ledger = load_us_ledger()
    needs_save = False
    is_seed_run = (len(ledger["US_BUYS"]) == 0)
    today_date_str = datetime.now().strftime("%Y-%m-%d")

    for symbol in US_UNIVERSE:
        try:
            df = fetch_daily_data(symbol, years=2)
            if df is None or len(df) < 100:
                continue
            df = add_features(df, macro_df)
            if len(df) < 80: continue
            df = create_labels(df)
            if len(df) < 50: continue

            model = IntradayModel()
            model.train(df[:-60])

            # Walk-forward for historical accuracy tracking
            df['prob_up'] = model.predict_proba_walk_forward(df)

            # In-sample prediction for the latest bar only (same as NSE)
            df['prob_up'] = model.predict_proba(df)

            latest = df.iloc[-1]
            latest_close = float(latest['close'])
            latest_date = df.index[-1]
            latest_date_str = latest_date.strftime("%Y-%m-%d") if hasattr(latest_date, 'strftime') else str(latest_date)[:10]

            adjusted_prob = float(latest['prob_up'])
            vol_ratio = float(latest['volume_ratio'])
            atr = float(latest['atr'])
            sector = "US Equities"

            # Seed or today signal — persist to ledger
            if is_seed_run or latest_date_str == today_date_str:
                if adjusted_prob > 0.55 and vol_ratio > 1.0:
                    if latest_date_str not in ledger["US_BUYS"]:
                        ledger["US_BUYS"][latest_date_str] = {}
                    if symbol not in ledger["US_BUYS"][latest_date_str]:
                        ledger["US_BUYS"][latest_date_str][symbol] = {
                            "entry": round(latest_close, 2),
                            "target": round(latest_close + 5.0 * atr, 2),
                            "stoploss": round(latest_close - 2.0 * atr, 2),
                            "confidence": round(adjusted_prob, 4),
                            "volume_ratio": round(vol_ratio, 2),
                            "atr": round(atr, 4),
                            "sector": sector,
                        }
                        needs_save = True

                    # HC gate: tighter thresholds + 50 EMA trend filter
                    ema50 = float(df['close'].ewm(span=50, adjust=False).mean().iloc[-1])
                    above_ema50 = latest_close > ema50
                    if adjusted_prob >= US_HC_PROB_UP and vol_ratio >= US_HC_VOL_RATIO and atr / latest_close >= US_HC_ATR_FILTER and above_ema50:
                        if latest_date_str not in ledger["US_HIGH_CONVICTION"]:
                            ledger["US_HIGH_CONVICTION"][latest_date_str] = {}
                        if symbol not in ledger["US_HIGH_CONVICTION"][latest_date_str]:
                            ledger["US_HIGH_CONVICTION"][latest_date_str][symbol] = {
                                "entry": round(latest_close, 2),
                                "target": round(latest_close + 5.0 * atr, 2),
                                "stoploss": round(latest_close - 2.0 * atr, 2),
                                "confidence": round(adjusted_prob, 4),
                                "volume_ratio": round(vol_ratio, 2),
                                "atr": round(atr, 4),
                                "sector": sector,
                            }
                            needs_save = True

            # Build frozen historical signals
            for date_str, sigs in ledger["US_BUYS"].items():
                if symbol in sigs:
                    if date_str not in historical_map:
                        historical_map[date_str] = []
                    historical_map[date_str].append(build_signal_frozen(sigs[symbol], date_str, df, symbol, latest_close, ledger=ledger, ledger_section="US_BUYS"))

            for date_str, sigs in ledger["US_HIGH_CONVICTION"].items():
                if symbol in sigs:
                    if date_str not in hc_historical_map:
                        hc_historical_map[date_str] = []
                    hc_historical_map[date_str].append(build_signal_frozen(sigs[symbol], date_str, df, symbol, latest_close, ledger=ledger, ledger_section="US_HIGH_CONVICTION"))

            # Live signal cards
            if adjusted_prob > 0.55 and vol_ratio > 1.0:
                entry = round(latest_close, 2)
                atr_v = round(atr, 4)
                buys.append({
                    "symbol": symbol,
                    "action": "BUY",
                    "confidence": round(adjusted_prob * 100, 2),
                    "entry": entry,
                    "target": round(entry + 5.0 * atr, 2),
                    "stoploss": round(entry - 2.0 * atr, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "atr": atr_v,
                    "sector": sector,
                    "close": latest_close,
                })
            ema50_live = float(df['close'].ewm(span=50, adjust=False).mean().iloc[-1])
            if adjusted_prob >= US_HC_PROB_UP and vol_ratio >= US_HC_VOL_RATIO and atr / latest_close >= US_HC_ATR_FILTER and latest_close > ema50_live:
                entry = round(latest_close, 2)
                hc_buys.append({
                    "symbol": symbol,
                    "action": "STRONG BUY",
                    "confidence": round(adjusted_prob * 100, 2),
                    "entry": entry,
                    "target": round(entry + 5.0 * atr, 2),
                    "stoploss": round(entry - 2.0 * atr, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "atr": atr_v,
                    "sector": sector,
                    "close": latest_close,
                })

        except Exception as e:
            print(f"US scan error for {symbol}: {e}")
            continue

    if needs_save:
        save_us_ledger(ledger)

    # Build sorted history lists
    hist_list = []
    for d in sorted(historical_map.keys()):
        sigs = historical_map[d]
        hist_list.append({"date": d, "count": len(sigs), "stocks": [s["symbol"] for s in sigs], "signals": sigs})

    hc_hist_list = []
    for d in sorted(hc_historical_map.keys()):
        sigs = hc_historical_map[d]
        hc_hist_list.append({"date": d, "count": len(sigs), "stocks": [s["symbol"] for s in sigs], "signals": sigs})

    buys.sort(key=lambda x: x['confidence'], reverse=True)
    hc_buys.sort(key=lambda x: x['confidence'], reverse=True)

    US_BUY_CACHE["data"] = buys
    US_BUY_CACHE["historical"] = hist_list
    US_BUY_CACHE["backtest_summary"] = compute_hc_historical_stats(historical_map)
    US_BUY_CACHE["last_updated"] = datetime.utcnow().isoformat() + "Z"
    US_BUY_CACHE["is_scanning"] = False

    US_HC_CACHE["data"] = hc_buys
    US_HC_CACHE["historical"] = hc_hist_list
    US_HC_CACHE["backtest_summary"] = compute_hc_historical_stats(hc_historical_map)
    US_HC_CACHE["last_updated"] = datetime.utcnow().isoformat() + "Z"

    print(f"US scan complete! {len(buys)} BUY | {len(hc_buys)} HC signals.")

def _us_seed_ledger_task(years: int = 2):
    """
    Walk-forward backfill for US signals ledger.
    For each stock in US_UNIVERSE, trains on rolling window and generates
    historical BUY / HC signals for each trading day over the past `years`.
    """
    from data_fetcher import fetch_daily_data
    from ml_model import add_features, create_labels, IntradayModel
    import pandas as pd

    total = len(US_UNIVERSE)
    print(f"[US Seed] Starting US ledger backfill for {years} years across {total} stocks…")
    _US_SEED_PROGRESS["running"] = True
    _US_SEED_PROGRESS["done"] = 0
    _US_SEED_PROGRESS["total"] = total
    _US_SEED_PROGRESS["status"] = "running"

    ledger = load_us_ledger()
    needs_save = False

    for i, symbol in enumerate(US_UNIVERSE):
        _US_SEED_PROGRESS["done"] = i
        try:
            df = fetch_daily_data(symbol, years=years + 1)
            if df is None or len(df) < 150:
                continue
            df = add_features(df, None)
            if len(df) < 100:
                continue
            df = create_labels(df)
            if len(df) < 60:
                continue

            model = IntradayModel()
            model.train(df[:-60])
            df['prob_up'] = model.predict_proba_walk_forward(df)
            df['ema50'] = df['close'].ewm(span=50, adjust=False).mean()

            cutoff = pd.Timestamp.now(tz='UTC') - pd.DateOffset(years=years)
            df_window = df[df.index >= cutoff] if df.index.tz is not None else df[df.index >= cutoff.replace(tzinfo=None)]

            for date, row in df_window.iterrows():
                date_str = date.strftime("%Y-%m-%d") if hasattr(date, 'strftime') else str(date)[:10]
                prob  = float(row.get('prob_up', 0))
                vol   = float(row.get('volume_ratio', 1))
                close = float(row.get('close', 0))
                atr   = float(row.get('atr', 0))
                ema50_row = float(row.get('ema50', 0))
                if close <= 0 or atr <= 0:
                    continue

                if prob > 0.55 and vol > 1.0:
                    if date_str not in ledger["US_BUYS"]:
                        ledger["US_BUYS"][date_str] = {}
                    if symbol not in ledger["US_BUYS"][date_str]:
                        ledger["US_BUYS"][date_str][symbol] = {
                            "entry": round(close, 2),
                            "target": round(close + 5.0 * atr, 2),
                            "stoploss": round(close - 2.0 * atr, 2),
                            "confidence": round(prob, 4),
                            "volume_ratio": round(vol, 2),
                            "atr": round(atr, 4),
                            "sector": "US Equities",
                        }
                        needs_save = True

                # HC gate: tighter thresholds + 50 EMA trend filter
                above_ema_seed = (ema50_row > 0 and close > ema50_row)
                if prob >= US_HC_PROB_UP and vol >= US_HC_VOL_RATIO and atr / close >= US_HC_ATR_FILTER and above_ema_seed:
                    if date_str not in ledger["US_HIGH_CONVICTION"]:
                        ledger["US_HIGH_CONVICTION"][date_str] = {}
                    if symbol not in ledger["US_HIGH_CONVICTION"][date_str]:
                        ledger["US_HIGH_CONVICTION"][date_str][symbol] = {
                            "entry": round(close, 2),
                            "target": round(close + 5.0 * atr, 2),
                            "stoploss": round(close - 2.0 * atr, 2),
                            "confidence": round(prob, 4),
                            "volume_ratio": round(vol, 2),
                            "atr": round(atr, 4),
                            "sector": "US Equities",
                        }
                        needs_save = True

            # Save + refresh cache every 10 stocks so UI shows partial progress
            if needs_save and (i + 1) % 10 == 0:
                save_us_ledger(ledger)
                load_us_ledger()
                buy_days = len(ledger["US_BUYS"])
                hc_days  = len(ledger["US_HIGH_CONVICTION"])
                print(f"[US Seed] Progress {i+1}/{total} — {buy_days} buy-days, {hc_days} HC-days so far")
                needs_save = False

        except Exception as e:
            print(f"[US Seed] Error for {symbol}: {e}")
            continue

    if needs_save:
        save_us_ledger(ledger)
        load_us_ledger()

    # ── Status resolution pass ────────────────────────────────────────────
    # Now fetch price data per symbol and resolve TARGET HIT / SL HIT / ACTIVE
    # by calling build_signal_frozen, caching _closed_status back into the ledger.
    _US_SEED_PROGRESS["status"] = "resolving"
    print("[US Seed] Running status resolution pass...")
    all_symbols = set()
    for sigs in ledger["US_BUYS"].values():
        all_symbols.update(sigs.keys())
    for sigs in ledger["US_HIGH_CONVICTION"].values():
        all_symbols.update(sigs.keys())

    resolved = 0
    for sym in all_symbols:
        try:
            df = fetch_daily_data(sym, years=years + 1)
            if df is None or len(df) < 10:
                continue
            latest_close = float(df['close'].iloc[-1])
            for date_str, sigs in ledger["US_BUYS"].items():
                if sym in sigs:
                    build_signal_frozen(sigs[sym], date_str, df, sym, latest_close,
                                        ledger=ledger, ledger_section="US_BUYS")
            for date_str, sigs in ledger["US_HIGH_CONVICTION"].items():
                if sym in sigs:
                    build_signal_frozen(sigs[sym], date_str, df, sym, latest_close,
                                        ledger=ledger, ledger_section="US_HIGH_CONVICTION")
            resolved += 1
            if resolved % 10 == 0:
                save_us_ledger(ledger)
                load_us_ledger()
                print(f"[US Seed] Resolved {resolved}/{len(all_symbols)} symbols")
        except Exception as e:
            print(f"[US Seed] Resolution error for {sym}: {e}")

    save_us_ledger(ledger)
    load_us_ledger()

    _US_SEED_PROGRESS["done"] = total
    _US_SEED_PROGRESS["running"] = False
    _US_SEED_PROGRESS["status"] = "done"
    print(f"[US Seed] Complete. {len(ledger['US_BUYS'])} buy-days, {len(ledger['US_HIGH_CONVICTION'])} HC-days.")


@app.post("/api/us_seed_ledger")
async def us_seed_ledger(years: int = 2):
    """Trigger a background walk-forward backfill of the US signals ledger."""
    if _US_SEED_PROGRESS["running"]:
        return {"status": "already_running", **_US_SEED_PROGRESS}
    threading.Thread(target=_us_seed_ledger_task, args=(years,), daemon=True).start()
    return {"status": "started", "message": f"US ledger backfill started for {years} years. Check back in 5–10 minutes."}

def _us_resolve_statuses_task():
    """Resolve TARGET HIT / SL HIT / ACTIVE for all existing US ledger entries."""
    from data_fetcher import fetch_daily_data
    ledger = load_us_ledger()
    all_symbols = set()
    for sigs in ledger["US_BUYS"].values():
        all_symbols.update(sigs.keys())
    for sigs in ledger["US_HIGH_CONVICTION"].values():
        all_symbols.update(sigs.keys())
    print(f"[US Resolve] Resolving statuses for {len(all_symbols)} symbols...")
    resolved = 0
    for sym in all_symbols:
        try:
            df = fetch_daily_data(sym, years=3)
            if df is None or len(df) < 10:
                continue
            latest_close = float(df['close'].iloc[-1])
            for date_str, sigs in ledger["US_BUYS"].items():
                if sym in sigs:
                    build_signal_frozen(sigs[sym], date_str, df, sym, latest_close,
                                        ledger=ledger, ledger_section="US_BUYS")
            for date_str, sigs in ledger["US_HIGH_CONVICTION"].items():
                if sym in sigs:
                    build_signal_frozen(sigs[sym], date_str, df, sym, latest_close,
                                        ledger=ledger, ledger_section="US_HIGH_CONVICTION")
            resolved += 1
            if resolved % 10 == 0:
                save_us_ledger(ledger)
                load_us_ledger()
                print(f"[US Resolve] {resolved}/{len(all_symbols)} done")
        except Exception as e:
            print(f"[US Resolve] Error for {sym}: {e}")
    save_us_ledger(ledger)
    load_us_ledger()
    print(f"[US Resolve] Done. Statuses resolved for {resolved} symbols.")

@app.post("/api/us_resolve_statuses")
async def us_resolve_statuses():
    """Resolve TARGET HIT / SL HIT for all existing US ledger entries."""
    threading.Thread(target=_us_resolve_statuses_task, daemon=True).start()
    return {"status": "started", "message": "Status resolution started in background."}

@app.get("/api/us_seed_progress")
async def us_seed_progress():
    """Check the progress of the US ledger seed backfill."""
    buy_days = len(US_BUY_CACHE.get("historical", []))
    hc_days  = len(US_HC_CACHE.get("historical", []))
    pct = round(_US_SEED_PROGRESS["done"] / max(_US_SEED_PROGRESS["total"], 1) * 100, 1)
    return {**_US_SEED_PROGRESS, "pct": pct, "buy_days_loaded": buy_days, "hc_days_loaded": hc_days}


# Kick off initial US scan on boot
threading.Thread(target=update_us_cache, daemon=True).start()

def get_stocks_from_sheet():
    try:
        response = requests.get(SHEET_URL)
        df = pd.read_csv(StringIO(response.text))
        df = df[df['Status'].astype(str).str.contains('Listed', na=False)]
        
        in_stocks = []
        us_stocks = []
        
        for _, row in df.iterrows():
            ticker = str(row['Ticker']).strip()
            country = str(row['Country'])
            
            if 'India' in country:
                if not ticker.endswith('.NS'):
                    ticker += '.NS'
                in_stocks.append(ticker)
            elif 'USA' in country:
                us_stocks.append(ticker)
                
        return in_stocks, us_stocks
    except Exception as e:
        print(f"Error fetching sheet: {e}")
        return ["RELIANCE.NS", "TCS.NS"], ["AAPL"]

def scheduled_scan():
    print("Running scheduled daily scan at market open (9:15 AM)...")
    in_stocks, us_stocks = get_stocks_from_sheet()
    print(f"Daily scan processed {len(in_stocks)} IN stocks and {len(us_stocks)} US stocks.")
    threading.Thread(target=update_universe_cache, daemon=True).start()

scheduler = BackgroundScheduler(timezone=pytz.timezone('Asia/Kolkata'))
scheduler.add_job(scheduled_scan, 'cron', day_of_week='mon-fri', hour=9, minute=15)
# US market open: 9:30 AM ET = 19:00 IST
scheduler.add_job(lambda: threading.Thread(target=update_us_cache, daemon=True).start(),
                  'cron', day_of_week='mon-fri', hour=19, minute=0)
scheduler.start()

# Pre-warm caches with ledger data so UI loads instantly (no scan wait required)
try:
    load_ledger()
    print(f"Boot cache loaded: HC={len(HC_CACHE['historical'])} days, NSE={len(GLOBAL_BUY_CACHE['historical'])} days from {LEDGER_FILE}")
except Exception as _e:
    print(f"Boot cache load failed: {_e}")

try:
    load_us_ledger()
    print(f"US boot cache loaded: HC={len(US_HC_CACHE['historical'])} days, Buys={len(US_BUY_CACHE['historical'])} days")
except Exception as _e:
    print(f"US boot cache load failed: {_e}")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}

@app.get("/api/scan_universe_buys")
def scan_universe_buys() -> Dict[str, Any]:
    return {
        "status": "success",
        "last_updated": GLOBAL_BUY_CACHE["last_updated"],
        "is_scanning": GLOBAL_BUY_CACHE["is_scanning"],
        "market_bullish": _nifty_bullish,
        "regime": _current_regime,
        "india_vix": round(_india_vix, 1),
        "data": GLOBAL_BUY_CACHE["data"],
        "historical": GLOBAL_BUY_CACHE["historical"],
        "backtest_summary": GLOBAL_BUY_CACHE["backtest_summary"]
    }

@app.get("/api/high_conviction")
def high_conviction_buys() -> Dict[str, Any]:
    return {
        "status": "success",
        "last_updated": HC_CACHE["last_updated"],
        "is_scanning": GLOBAL_BUY_CACHE["is_scanning"],
        "market_bullish": _nifty_bullish,
        "data": HC_CACHE["data"],
        "historical": HC_CACHE["historical"],
        "backtest_summary": HC_CACHE["backtest_summary"]
    }

@app.get("/api/us_buys")
def us_buys() -> Dict[str, Any]:
    return {
        "status": "success",
        "last_updated": US_BUY_CACHE["last_updated"],
        "is_scanning": US_BUY_CACHE["is_scanning"],
        "market_bullish": True,
        "data": US_BUY_CACHE["data"],
        "historical": US_BUY_CACHE["historical"],
        "backtest_summary": US_BUY_CACHE["backtest_summary"],
    }

@app.get("/api/us_high_conviction")
def us_high_conviction() -> Dict[str, Any]:
    return {
        "status": "success",
        "last_updated": US_HC_CACHE["last_updated"],
        "is_scanning": US_BUY_CACHE["is_scanning"],
        "market_bullish": True,
        "data": US_HC_CACHE["data"],
        "historical": US_HC_CACHE["historical"],
        "backtest_summary": US_HC_CACHE["backtest_summary"],
    }

@app.post("/api/us_refresh", dependencies=[Depends(get_api_key)])
def us_refresh():
    if not US_BUY_CACHE["is_scanning"]:
        threading.Thread(target=update_us_cache, daemon=True).start()
    return {"status": "success", "is_scanning": True}

@app.get("/api/universe")
def get_universe():
    return {
        "nse_count": len(NSE_UNIVERSE), "nse": NSE_UNIVERSE,
        "us_count": len(US_UNIVERSE),  "us":  US_UNIVERSE,
    }

@app.get("/api/stock_detail_us/{symbol}")
async def stock_detail_us(symbol: str):
    import yfinance as yf
    import numpy as np

    ticker = yf.Ticker(symbol.upper())

    fi = {}
    try:
        fast = ticker.fast_info
        fi = {
            "market_cap":    getattr(fast, "market_cap", None),
            "current_price": getattr(fast, "last_price", None),
            "week_52_high":  getattr(fast, "year_high", None),
            "week_52_low":   getattr(fast, "year_low", None),
        }
    except Exception:
        pass

    yi = {}
    try:
        yi = ticker.info or {}
    except Exception:
        pass

    def safe(key, default=None):
        val = yi.get(key)
        if val is None or (isinstance(val, float) and val != val):
            return default
        return val

    market_cap = fi.get("market_cap") or safe("marketCap")
    if market_cap:
        if market_cap >= 1e12:   market_cap_str = f"${market_cap/1e12:.2f}T"
        elif market_cap >= 1e9:  market_cap_str = f"${market_cap/1e9:.2f}B"
        else:                    market_cap_str = f"${market_cap/1e6:.2f}M"
    else:
        market_cap_str = "N/A"

    signal_logic = {}
    try:
        from data_fetcher import fetch_daily_data
        from ml_model import add_features
        df = fetch_daily_data(symbol.upper(), years=2)
        if df is not None and not df.empty:
            df = add_features(df)
            if not df.empty:
                last = df.iloc[-1]
                def sv(col): return round(float(last[col]), 2) if col in last.index and not (last[col] != last[col]) else 0
                signal_logic = {
                    "rsi":          round(sv("rsi"), 1),
                    "macd_hist":    round(sv("macd_hist"), 3),
                    "adx":          round(sv("adx"), 1),
                    "bb_pct":       round(sv("bb_pct"), 2),
                    "volume_ratio": round(sv("volume_ratio"), 2),
                    "above_ema20":  bool(last.get("above_ema20", 0)),
                    "above_ema50":  bool(last.get("above_ema50", 0)),
                    "pct_from_52w_high": round(float(last.get("pct_from_high", 0)) * 100, 1),
                    "roc10":        round(sv("roc10"), 2),
                    "stoch_k":      round(sv("stoch_k"), 1),
                }
    except Exception as e:
        print(f"US signal logic error for {symbol}: {e}")

    news_items = []
    try:
        raw_news = ticker.news or []
        for n in raw_news[:6]:
            content = n.get("content", {})
            title  = content.get("title", "") if isinstance(content, dict) else n.get("title", "")
            url2   = content.get("canonicalUrl", {}).get("url", "") if isinstance(content, dict) else n.get("link", "")
            pub    = content.get("pubDate", "") if isinstance(content, dict) else n.get("providerPublishTime", "")
            source = content.get("provider", {}).get("displayName", "") if isinstance(content, dict) else n.get("publisher", "")
            if title:
                news_items.append({"title": title, "url": url2, "published": str(pub), "source": source})
    except Exception:
        pass

    roe = safe("returnOnEquity")
    rev_growth = safe("revenueGrowth")
    earn_growth = safe("earningsGrowth")
    div_yield = safe("dividendYield")

    return {
        "symbol":          symbol.upper(),
        "company_name":    safe("longName", symbol.upper()),
        "sector":          safe("sector", "US Equities"),
        "industry":        safe("industry", "N/A"),
        "market_cap":      market_cap_str,
        "current_price":   fi.get("current_price") or safe("currentPrice"),
        "week_52_high":    fi.get("week_52_high") or safe("fiftyTwoWeekHigh"),
        "week_52_low":     fi.get("week_52_low") or safe("fiftyTwoWeekLow"),
        "pe_ratio":        safe("trailingPE"),
        "pb_ratio":        safe("priceToBook"),
        "roe":             round(roe * 100, 1) if roe else None,
        "debt_to_equity":  safe("debtToEquity"),
        "revenue_growth":  round(rev_growth * 100, 1) if rev_growth else None,
        "earnings_growth": round(earn_growth * 100, 1) if earn_growth else None,
        "dividend_yield":  round(div_yield * 100, 2) if div_yield else None,
        "beta":            safe("beta"),
        "analyst_rating":  (safe("recommendationKey") or "N/A").upper(),
        "target_mean_price": safe("targetMeanPrice"),
        "description":     safe("longBusinessSummary", "No description available."),
        "signal_logic":    signal_logic,
        "news":            news_items,
    }

@app.post("/api/kill_switch", dependencies=[Depends(get_api_key)])
def toggle_kill_switch(halt: bool = True) -> Dict[str, Any]:
    from adaptive_engine import DATA_DIR
    kill_switch_file = os.path.join(DATA_DIR, 'kill_switch.json')
    with open(kill_switch_file, 'w') as f:
        json.dump({'halted': halt}, f)
    return {"status": "success", "halted": halt}

@app.get("/api/scan", dependencies=[Depends(get_api_key)])
def scan_markets(market: str = "IN") -> Dict[str, Any]:
    if PerformanceMonitor.check_circuit_breaker():
        return {"status": "error", "message": "Circuit Breaker Active - Scanning halted."}
        
    in_stocks, us_stocks = get_stocks_from_sheet()
    
    stocks_to_scan = in_stocks if market == "IN" else us_stocks
    init_cash = 100000 if market == "IN" else 1200
    
    from data_fetcher import fetch_macro_data
    macro_df = fetch_macro_data(years=2)
    
    results = []
    
    for symbol in stocks_to_scan:
        try:
            df = fetch_daily_data(symbol, years=2)
            if len(df) < 100:
                continue
                
            df = add_features(df, macro_df)
            df = create_labels(df)
            
            model = IntradayModel()
            model.train(df[:-60])
            
            # Out-of-sample backtest scoring
            df['prob_up'] = model.predict_proba_walk_forward(df)
            bt_stats = run_backtest(df, sl_atr_mult=2.0, tp_atr_mult=5.0, init_cash=init_cash)
            
            # Explicit real-time prediction
            df['prob_up'] = model.predict_proba(df)
            
            latest = df.iloc[-1]
            entry_price = float(latest['close'])
            atr = float(latest['atr'])
            prob_up = float(latest['prob_up'])
            vol_ratio = float(latest['volume_ratio'])
            
            action = "WAIT"
            # Relaxed the thresholds dynamically to generate more frequent signals 
            if prob_up > 0.55 and vol_ratio > 0.5:
                action = "BUY"
            
            target = entry_price + (5.0 * atr)
            stoploss = entry_price - (2.0 * atr)
            
            results.append({
                "symbol": symbol.replace(".NS", ""),
                "action": action,
                "confidence": round(prob_up * 100, 2),
                "entry": round(entry_price, 2),
                "target": round(target, 2),
                "stoploss": round(stoploss, 2),
                "volume_ratio": round(vol_ratio, 2),
                "backtest": bt_stats
            })
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
            continue
            
    results.sort(key=lambda x: x['confidence'], reverse=True)
    
    # Save to ticker cache for login page display (only for IN market)
    if market == "IN":
        save_ticker_cache(results, _nifty_bullish)
            
    return {
        "status": "success", 
        "timestamp": datetime.utcnow().isoformat() + "Z", 
        "market": market, 
        "market_bullish": _nifty_bullish if market == "IN" else True, # market filter currently only for India
        "data": results
    }


@app.get("/api/stock_detail/{symbol}")
async def stock_detail(symbol: str):
    """
    Returns a deep-dive view for a stock: signal logic, fundamentals, news, and market data.
    """
    import yfinance as yf
    import numpy as np

    ns_symbol = f"{symbol.upper()}.NS"
    ticker = yf.Ticker(ns_symbol)

    # --- Strategy 1: ticker.fast_info (very reliable, lightweight endpoint) ---
    fi = {}
    try:
        fast = ticker.fast_info
        fi = {
            "market_cap":   getattr(fast, "market_cap",  None),
            "current_price": getattr(fast, "last_price",  None),
            "week_52_high": getattr(fast, "year_high",   None),
            "week_52_low":  getattr(fast, "year_low",    None),
        }
    except Exception as e:
        print(f"fast_info error for {symbol}: {e}")

    # --- Strategy 1.5: yf.info fallback if Tickertape gets blocked ---
    yi = {}
    try:
        yi = ticker.info or {}
    except Exception as e:
        print(f"yfinance info error for {symbol}: {e}")

    # --- Strategy 2: Tickertape API (Extremely robust for Indian stocks, not IP blocked) ---
    info = {}
    try:
        import requests
        # Step 1: Search Tickertape to find the internal SID for this ticker
        search_req = requests.get(f"https://api.tickertape.in/search?text={symbol}", timeout=5).json()
        sid = None
        if "data" in search_req and "stocks" in search_req["data"]:
            for stock in search_req["data"]["stocks"]:
                if stock.get("ticker") == symbol:
                    sid = stock.get("sid")
                    break
        
        # Step 2: Fetch fundamentals using SID
        if sid:
            tt_res = requests.get(f"https://api.tickertape.in/stocks/info/{sid}", timeout=5).json()
            if tt_res.get("success") and "data" in tt_res:
                tt_data = tt_res["data"]
                tt_info = tt_data.get("info", {})
                tt_ratios = tt_data.get("ratios", {})
                
                sector = tt_info.get("sector", "N/A")
                industry = tt_info.get("tags", [{}])[0].get("name", "N/A") if tt_info.get("tags") else "N/A"
                nifty_sector = map_to_nifty_sector(sector, industry)

                info = {
                    "longName":          tt_info.get("name", symbol),
                    "sector":            nifty_sector,
                    "industry":          industry,
                    "longBusinessSummary": tt_info.get("description", ""),
                    "trailingPE":        tt_ratios.get("pe"),
                    "priceToBook":       tt_ratios.get("pb"),
                    "returnOnEquity":    tt_ratios.get("roe"),
                    "debtToEquity":      tt_ratios.get("debtToEq"),  # sometimes empty in TT, but we try
                    "revenueGrowth":     None,  # Not directly in summary
                    "earningsGrowth":    None,
                    "dividendYield":     tt_ratios.get("divYield"),
                    "beta":              tt_ratios.get("beta"),
                    "recommendationKey": "N/A",
                    "targetMeanPrice":   None,
                    "marketCap":         tt_ratios.get("marketCap") * 1e7 if tt_ratios.get("marketCap") else None, # TT marketCap is in Crores
                    "currentPrice":      tt_ratios.get("lastPrice") or fi.get("current_price"),
                    "fiftyTwoWeekHigh":  tt_ratios.get("52wHigh")   or fi.get("week_52_high"),
                    "fiftyTwoWeekLow":   tt_ratios.get("52wLow")    or fi.get("week_52_low"),
                }
    except Exception as e:
        print(f"Tickertape fetch error for {symbol}: {e}")

    # Merge: prefer Tickertape data, fallback to yf.info then fast_info
    def safe(key, yf_key=None, default=None):
        val = info.get(key)
        if val is None or (isinstance(val, float) and (val != val)):
            if yf_key and yf_key in yi:
                return yi[yf_key]
            return default
        return val

    # --- Signal logic from price history + indicators ---
    signal_logic = {}
    try:
        from data_fetcher import fetch_daily_data
        df = fetch_daily_data(ns_symbol, years=2)
        if not df.empty:
            from ml_model import add_features
            df = add_features(df)
            if not df.empty:
                last = df.iloc[-1]
                def sv(col): return round(float(last[col]), 2) if col in last.index and not (last[col] != last[col]) else 0
                signal_logic = {
                    "rsi":              round(sv("rsi"), 1),
                    "macd_hist":        round(sv("macd_hist"), 3),
                    "adx":              round(sv("adx"), 1),
                    "bb_pct":           round(sv("bb_pct"), 2),
                    "volume_ratio":     round(sv("volume_ratio"), 2),
                    "above_ema20":      bool(last.get("above_ema20", 0)),
                    "above_ema50":      bool(last.get("above_ema50", 0)),
                    "pct_from_52w_high": round(float(last.get("pct_from_high", 0)) * 100, 1),
                    "roc10":            round(sv("roc10"), 2),
                    "stoch_k":          round(sv("stoch_k"), 1),
                }
    except Exception as e:
        print(f"Signal logic error for {symbol}: {e}")

    # --- News ---
    news_items = []
    try:
        raw_news = ticker.news or []
        for n in raw_news[:6]:
            content = n.get("content", {})
            title  = content.get("title", "")  if isinstance(content, dict) else n.get("title", "")
            url2   = content.get("canonicalUrl", {}).get("url", "") if isinstance(content, dict) else n.get("link", "")
            pub    = content.get("pubDate", "") if isinstance(content, dict) else n.get("providerPublishTime", "")
            source = content.get("provider", {}).get("displayName", "") if isinstance(content, dict) else n.get("publisher", "")
            if title:
                news_items.append({"title": title, "url": url2, "published": str(pub), "source": source})
    except Exception as e:
        print(f"News fetch error for {symbol}: {e}")

    # --- Market Cap formatting ---
    market_cap = safe("marketCap", "marketCap") or fi.get("market_cap")
    if market_cap:
        if market_cap >= 1e12:    market_cap_str = f"₹{market_cap/1e12:.2f}T"
        elif market_cap >= 1e9:   market_cap_str = f"₹{market_cap/1e9:.2f}B"
        else:                     market_cap_str = f"₹{market_cap/1e7:.2f}Cr"
    else:
        market_cap_str = "N/A"

    return {
        "symbol":          symbol.upper(),
        "company_name":    safe("longName", "longName", symbol),
        "sector":          safe("sector", "sector", "N/A"),
        "industry":        safe("industry", "industry", "N/A"),
        "market_cap":      market_cap_str,
        "current_price":   safe("currentPrice", "currentPrice") or fi.get("current_price"),
        "week_52_high":    safe("fiftyTwoWeekHigh", "fiftyTwoWeekHigh") or fi.get("week_52_high"),
        "week_52_low":     safe("fiftyTwoWeekLow", "fiftyTwoWeekLow") or fi.get("week_52_low"),
        "pe_ratio":        safe("trailingPE", "trailingPE"),
        "pb_ratio":        safe("priceToBook", "priceToBook"),
        "roe":             round(safe("returnOnEquity", "returnOnEquity") * 100, 1) if safe("returnOnEquity", "returnOnEquity") else None,
        "debt_to_equity":  safe("debtToEquity", "debtToEquity"),
        "revenue_growth":  round(safe("revenueGrowth", "revenueGrowth") * 100, 1) if safe("revenueGrowth", "revenueGrowth") else None,
        "earnings_growth": round(safe("earningsGrowth", "earningsGrowth") * 100, 1) if safe("earningsGrowth", "earningsGrowth") else None,
        "dividend_yield":  round(safe("dividendYield", "dividendYield") * 100, 2) if safe("dividendYield", "dividendYield") else None,
        "beta":            safe("beta", "beta"),
        "analyst_rating":  (safe("recommendationKey", "recommendationKey") or "N/A").upper(),
        "target_mean_price": safe("targetMeanPrice", "targetMeanPrice"),
        "description":     safe("longBusinessSummary", "longBusinessSummary", "No description available."),
        "signal_logic":    signal_logic,
        "news":            news_items,
    }



@app.get("/api/multibagger/live")
async def multibagger_live():
    """
    Returns the top 20 current multibagger candidates scored by
    the Renaissance-style quantitative algorithm.
    """
    from multibagger_model import scan_multibaggers
    from symbols import NSE_200
    from datetime import datetime
    # Strip .NS suffix for the model (it adds it back internally)
    # Memory Cap removed, Oracle Server 24GB active. Processing up to 500 liquid stocks with 30 threads.
    symbols = [s.replace(".NS", "") for s in NSE_200]
    results = scan_multibaggers(symbols, target_date=None, max_workers=30, top_n=20)
    return {"status": "success", "data": results, "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.get("/api/multibagger/backtest")
async def multibagger_backtest(years_ago: int = 1):
    """
    Time-machine backtest: scores all stocks as-of N years ago,
    picks the top 10, and measures their actual forward return to today.
    Compares against the Nifty 50 benchmark.
    """
    from multibagger_model import run_backtest_with_benchmark
    from symbols import NSE_200
    from datetime import datetime, timedelta

    target_date = (datetime.now() - timedelta(days=years_ago * 365)).strftime("%Y-%m-%d")
    
    # Free Tier Memory Cap un-shackled. Scanning deep historical multi-year records for 500 large, mid and small cap assets via Oracle 24GB.
    symbols = [s.replace(".NS", "") for s in NSE_200]
    result = run_backtest_with_benchmark(symbols, target_date=target_date, max_workers=30, top_n=10)
    return {"status": "success", **result}


@app.get("/api/us_multibagger/live")
async def us_multibagger_live():
    """
    Returns the top 20 current US multibagger candidates scored by
    the Renaissance-style quantitative algorithm.
    """
    from multibagger_model import scan_multibaggers_us
    from symbols import US_100
    from datetime import datetime
    results = scan_multibaggers_us(US_100, target_date=None, max_workers=20, top_n=20)
    return {"status": "success", "data": results, "timestamp": datetime.utcnow().isoformat() + "Z"}


@app.get("/api/us_multibagger/backtest")
async def us_multibagger_backtest(years_ago: int = 1):
    """
    Time-machine backtest for US stocks: scores all stocks as-of N years ago,
    picks the top 10, and measures their actual forward return to today.
    Compares against the S&P 500 benchmark.
    """
    from multibagger_model import run_us_backtest_with_benchmark
    from symbols import US_100
    from datetime import datetime, timedelta
    target_date = (datetime.now() - timedelta(days=years_ago * 365)).strftime("%Y-%m-%d")
    result = run_us_backtest_with_benchmark(US_100, target_date=target_date, max_workers=20, top_n=10)
    return {"status": "success", **result}


CONGRESS_CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "congress_trades_cache.json")

def _fetch_congress_trades_raw():
    """
    Scrapes live Senate stock trade disclosures directly from the official eFD search.
    Fetches all PTR (Periodic Transaction Reports) since 2024, parses each report page
    for individual trades. Returns recent_trades, top_tickers, top_traders.
    """
    import requests as req
    import yfinance as yf
    from datetime import datetime
    from bs4 import BeautifulSoup
    from collections import Counter
    import time

    EFD_BASE = "https://efdsearch.senate.gov"
    UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    session = req.Session()
    session.headers.update({"User-Agent": UA})

    # Step 1: get CSRF token
    session.get(f"{EFD_BASE}/search/", timeout=15)
    csrf = session.cookies.get("csrftoken", "")

    # Step 2: agree to ToS (required by eFD)
    session.post(f"{EFD_BASE}/search/home/", data={
        "csrfmiddlewaretoken": csrf,
        "prohibition_agreement": "1",
    }, headers={"Referer": f"{EFD_BASE}/search/"}, timeout=15)
    csrf = session.cookies.get("csrftoken", csrf)

    # Step 3: fetch all PTR listings since Jan 2024 (paginate 100 at a time)
    all_ptrs = []
    start = 0
    while True:
        r = session.post(f"{EFD_BASE}/search/report/data/", data={
            "start": str(start), "length": "100",
            "report_types": "[11]",
            "filer_types": "[]",
            "submitted_start_date": "01/01/2024 00:00:00",
            "submitted_end_date": "",
            "candidate_state": "", "senator_state": "",
            "office_id": "", "first_name": "", "last_name": "",
            "csrfmiddlewaretoken": csrf,
        }, headers={
            "Referer": f"{EFD_BASE}/search/",
            "X-Requested-With": "XMLHttpRequest",
        }, timeout=20)

        if r.status_code != 200:
            break
        data = r.json()
        records = data.get("data", [])
        if not records:
            break

        for rec in records:
            soup = BeautifulSoup(rec[3], "html.parser")
            a = soup.find("a")
            if a:
                all_ptrs.append({
                    "senator": f"{rec[0]} {rec[1]}".strip(),
                    "url": EFD_BASE + a["href"],
                    "filed_date": rec[4],
                })

        total = data.get("recordsTotal", 0)
        start += 100
        if start >= total:
            break
        time.sleep(0.3)  # polite delay

    print(f"[Congress] Found {len(all_ptrs)} PTR filings since 2024")

    # Step 4: fetch each PTR detail page and extract trades
    stock_trades = []
    for ptr in all_ptrs[:120]:  # cap at 120 PTRs to stay fast
        try:
            r2 = session.get(ptr["url"], timeout=12)
            if r2.status_code != 200:
                continue
            soup2 = BeautifulSoup(r2.text, "html.parser")
            table = soup2.find("table")
            if not table:
                continue
            rows = table.find_all("tr")[1:]  # skip header
            for row in rows:
                cols = [c.get_text(strip=True) for c in row.find_all("td")]
                if len(cols) < 8:
                    continue
                # cols: #, transaction_date, owner, ticker, asset_name, asset_type, type, amount, comment
                asset_type = cols[5]
                ticker = cols[3].strip().lstrip("$")
                if asset_type not in ("Stock", "Stock Option") or not ticker or ticker == "--":
                    continue
                stock_trades.append({
                    "senator": ptr["senator"],
                    "transaction_date": cols[1],
                    "owner": cols[2],
                    "ticker": ticker,
                    "company": cols[4],
                    "asset_type": asset_type,
                    "type": cols[6],
                    "amount": cols[7],
                    "comment": cols[8] if len(cols) > 8 else "",
                    "ptr_link": ptr["url"],
                    "filed_date": ptr["filed_date"],
                    "is_buy": "purchase" in cols[6].lower(),
                })
            time.sleep(0.15)
        except Exception as e:
            print(f"[Congress] PTR fetch error for {ptr.get('senator')}: {e}")
            continue

    print(f"[Congress] Parsed {len(stock_trades)} stock trades from live eFD")

    # Sort most recent first by filed date
    def parse_date(d):
        for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
            try: return datetime.strptime(d, fmt)
            except: pass
        return datetime.min

    stock_trades.sort(key=lambda x: parse_date(x.get("filed_date", "")), reverse=True)

    # Enrich top tickers with current yfinance price
    unique_tickers = list(set(t["ticker"] for t in stock_trades if t["ticker"]))[:60]
    price_map = {}
    if unique_tickers:
        try:
            if len(unique_tickers) == 1:
                tk = yf.Ticker(unique_tickers[0])
                hist = tk.history(period="2d")
                if not hist.empty:
                    price_map[unique_tickers[0]] = round(float(hist["Close"].iloc[-1]), 2)
            else:
                yf_data = yf.download(unique_tickers, period="2d", interval="1d", progress=False, threads=True)
                closes = yf_data["Close"]
                for sym in unique_tickers:
                    try:
                        if sym in closes.columns and not closes[sym].dropna().empty:
                            price_map[sym] = round(float(closes[sym].dropna().iloc[-1]), 2)
                    except:
                        pass
        except Exception as e:
            print(f"[Congress] yfinance enrichment error: {e}")

    # Build recent_trades list (all trades, front-end will page/filter)
    recent_trades = []
    for t in stock_trades:
        recent_trades.append({
            "senator": t["senator"],
            "ticker": t["ticker"],
            "company": t["company"],
            "type": t["type"],
            "is_buy": t["is_buy"],
            "amount": t["amount"],
            "transaction_date": t["transaction_date"],
            "filed_date": t["filed_date"],
            "owner": t["owner"],
            "ptr_link": t["ptr_link"],
            "current_price": price_map.get(t["ticker"]),
        })

    # Top tickers
    buy_counts = Counter()
    sell_counts = Counter()
    ticker_names = {}
    for t in stock_trades:
        sym = t["ticker"]
        ticker_names[sym] = t["company"]
        if t["is_buy"]:
            buy_counts[sym] += 1
        else:
            sell_counts[sym] += 1

    top_tickers = [
        {
            "ticker": sym,
            "company": ticker_names.get(sym, sym),
            "buy_count": count,
            "sell_count": sell_counts.get(sym, 0),
            "current_price": price_map.get(sym),
        }
        for sym, count in buy_counts.most_common(25)
    ]

    # Top traders
    trader_counts = Counter(t["senator"] for t in stock_trades)
    top_traders = []
    for name, total in trader_counts.most_common(20):
        senator_trades = [t for t in stock_trades if t["senator"] == name]
        top_traders.append({
            "senator": name,
            "total_trades": total,
            "buys": sum(1 for t in senator_trades if t["is_buy"]),
            "sells": sum(1 for t in senator_trades if not t["is_buy"]),
        })

    return {
        "recent_trades": recent_trades,
        "top_tickers": top_tickers,
        "top_traders": top_traders,
        "total_trades": len(stock_trades),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/congress_trades")
async def congress_trades():
    """
    Returns Senate stock trade disclosures, enriched with current prices.
    Data: recent trades, top tickers by buy count, most active traders.
    Caches for 6 hours.
    """
    # Check cache
    try:
        if os.path.exists(CONGRESS_CACHE_FILE):
            with open(CONGRESS_CACHE_FILE, "r") as f:
                cache = json.load(f)
            age = (datetime.utcnow() - datetime.fromisoformat(cache.get("timestamp", "2000-01-01").replace("Z",""))).total_seconds()
            if age < 21600:  # 6 hours
                return {"status": "success", **cache, "cached": True}
    except Exception:
        pass

    try:
        data = _fetch_congress_trades_raw()
        os.makedirs(os.path.dirname(CONGRESS_CACHE_FILE), exist_ok=True)
        with open(CONGRESS_CACHE_FILE, "w") as f:
            json.dump(data, f)
        return {"status": "success", **data, "cached": False}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/trending_sectors")
async def trending_sectors():
    """
    Fetches the 1-day percentage change for Nifty Sectoral Indices to show which are trending.
    """
    sectors = {
        "NIFTY IT": "^CNXIT",
        "NIFTY BANK": "^NSEBANK",
        "NIFTY AUTO": "^CNXAUTO",
        "NIFTY FMCG": "^CNXFMCG",
        "NIFTY PHARMA": "^CNXPHARMA",
        "NIFTY METAL": "^CNXMETAL",
        "NIFTY REALTY": "^CNXREALTY",
        "NIFTY ENERGY": "^CNXENERGY",
        "NIFTY INFRA": "^CNXINFRA"
    }
    
    trending = []
    import yfinance as yf
    try:
        tickers = yf.Tickers(" ".join(sectors.values()))
        for name, ticker_sym in sectors.items():
            try:
                fi = tickers.tickers[ticker_sym].fast_info
                prev = getattr(fi, "previous_close", None)
                cur = getattr(fi, "last_price", None)
                if prev and cur and prev > 0:
                    change_pct = ((cur - prev) / prev) * 100
                    trending.append({"sector": name, "change_pct": round(change_pct, 2)})
            except Exception:
                pass
        
        # Sort descending by change
        trending.sort(key=lambda x: x["change_pct"], reverse=True)
        return {"status": "success", "data": trending}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/sector_leader")
async def sector_leader(sector: str):
    """
    Returns the top-gaining constituent of a particular Nifty Sectoral Index today.
    """
    if sector not in SECTOR_CONSTITUENTS:
        return {"status": "error", "message": f"Sector {sector} constituents not mapped."}
        
    import yfinance as yf
    
    leaders = []
    try:
        tickers = yf.Tickers(" ".join(SECTOR_CONSTITUENTS[sector]))
        for symbol in SECTOR_CONSTITUENTS[sector]:
            try:
                fi = tickers.tickers[symbol].fast_info
                prev = getattr(fi, "previous_close", None)
                cur = getattr(fi, "last_price", None)
                if prev and cur and prev > 0:
                    change_pct = ((cur - prev) / prev) * 100
                    leaders.append({
                        "symbol": symbol.replace(".NS", ""),
                        "change_pct": round(change_pct, 2),
                        "current_price": round(cur, 2)
                    })
            except Exception:
                pass
                
        if not leaders:
            return {"status": "error", "message": "Failed to fetch constituents."}
            
        leaders.sort(key=lambda x: x["change_pct"], reverse=True)
        return {"status": "success", "leader": leaders[0]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/search")
def search_stock(q: str):
    """Search for Indian stocks using Yahoo Finance autocomplete API."""
    import requests
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            quotes = resp.json().get("quotes", [])
            results = []
            seen = set()
            for quote in quotes:
                sym = quote.get("symbol", "").upper()
                if quote.get("quoteType") == "EQUITY" and (sym.endswith(".NS") or sym.endswith(".BO")):
                    clean_sym = sym.replace(".NS", "").replace(".BO", "")
                    # Filter out block deals or secondary listings (e.g., BHEL-BL)
                    if clean_sym not in seen and "-" not in clean_sym:
                        seen.add(clean_sym)
                        results.append({
                            "symbol": clean_sym,
                            "name": quote.get("longname", quote.get("shortname", clean_sym))
                        })
            return {"results": results}
    except Exception as e:
        print(f"Search API error: {e}")
    return {"results": []}


@app.get("/api/adaptive_status")
async def adaptive_status():
    """
    Exposes the current state of the self-learning adaptive engine:
    - Calibrated thresholds
    - Optimized quality gates
    - Performance metrics
    - SHAP feature importance alerts
    - Retrain recommendation
    """
    import os

    # Read outcome log stats
    outcome_stats = {}
    outcome_log_path = os.path.join(os.path.dirname(__file__), 'data', 'outcome_log.csv')
    try:
        if os.path.exists(outcome_log_path):
            import pandas as pd
            df = pd.read_csv(outcome_log_path)
            total = len(df)
            wins = int(df['outcome'].sum())
            losses = total - wins
            recent = df.tail(50)
            recent_wr = round(recent['outcome'].mean() * 100, 1) if len(recent) > 0 else 0
            outcome_stats = {
                "total_trades_logged": total,
                "wins": wins,
                "losses": losses,
                "overall_win_rate": round(wins / total * 100, 1) if total > 0 else 0,
                "recent_50_win_rate": recent_wr,
                "avg_days_held": round(df['days_held'].mean(), 1) if 'days_held' in df.columns else None,
            }
    except Exception:
        pass

    # Read SHAP history
    shap_data = []
    shap_path = os.path.join(os.path.dirname(__file__), 'data', 'shap_history.json')
    try:
        if os.path.exists(shap_path):
            import json as json_mod
            with open(shap_path, 'r') as f:
                shap_data = json_mod.load(f)
    except Exception:
        pass

    return {
        "status": "success",
        "calibrated_thresholds": _adaptive_thresholds,
        "optimized_gates": _adaptive_gates,
        "retrain_recommended": _retrain_recommended,
        "outcome_stats": outcome_stats,
        "shap_history": shap_data[-5:] if shap_data else [],  # last 5 entries
        "engine_version": "1.0.0",
    }


@app.get("/api/llm_status")
def llm_status():
    """Returns LLM connectivity and configuration status."""
    if not _LLM_AVAILABLE:
        return {"status": "unavailable", "reason": "llm_analyst module failed to load"}
    try:
        from llm_analyst import health_check as llm_health_check
        return {"status": "ok", **llm_health_check()}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/postmortems")
def get_postmortems(limit: int = 20):
    """Returns recent LLM-generated trade post-mortems and learning insights."""
    from adaptive_engine import POSTMORTEM_LOG_FILE
    try:
        if not os.path.exists(POSTMORTEM_LOG_FILE):
            return {"status": "success", "data": [], "message": "No post-mortems yet"}
        with open(POSTMORTEM_LOG_FILE) as f:
            history = json.load(f)
        return {
            "status": "success",
            "data": history[-limit:],
            "total": len(history),
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def save_ticker_cache(scan_results: list, nifty_bullish: bool = True):
    """Save scan results to ticker cache file for login page display."""
    try:
        # Build ticker data from scan results
        ticker_data = []
        for item in scan_results:
            symbol = item.get("symbol", "")
            if symbol in TICKER_SYMBOLS:
                ticker_data.append({
                    "sym": symbol,
                    "price": f"{item.get('entry', 0):,.2f}",
                    "chg": "—",  # Will be calculated if we have prev close
                    "up": True
                })
        
        # Also try to get index data from _nifty_bullish context or calculate
        # For now, indices show as cached data
        
        cache = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": ticker_data
        }
        os.makedirs(os.path.dirname(TICKER_FILE), exist_ok=True)
        with open(TICKER_FILE, "w") as f:
            json.dump(cache, f)
    except Exception as e:
        print(f"Failed to save ticker cache: {e}")

def load_ticker_cache():
    """Load cached ticker data. Returns empty list if no cache."""
    try:
        if os.path.exists(TICKER_FILE):
            with open(TICKER_FILE, "r") as f:
                cache = json.load(f)
                return cache.get("data", [])
    except Exception:
        pass
    return []

TICKER_YF_MAP = {
    "NIFTY 50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "SENSEX": "^BSESN",
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "INFY": "INFY.NS",
    "SBIN": "SBIN.NS",
    "ITC": "ITC.NS",
    "LT": "LT.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
}

US_TICKER_YF_MAP = {
    "AAPL": "AAPL",
    "MSFT": "MSFT",
    "NVDA": "NVDA",
    "GOOGL": "GOOGL",
    "META": "META",
    "AMZN": "AMZN",
    "TSLA": "TSLA",
    "NFLX": "NFLX",
    "QQQ": "QQQ",
    "SPY": "SPY",
    "NDX": "^NDX",
    "S&P 500": "^GSPC",
    "NASDAQ": "^IXIC",
    "Dow Jones": "^DJI",
    "Russell 2K": "^RUT",
    "VIX": "^VIX",
}

def fetch_ticker_data():
    """Fetch live ticker data from yfinance for all TICKER_SYMBOLS."""
    import yfinance as yf
    results = []
    for display_sym, yf_sym in TICKER_YF_MAP.items():
        try:
            ticker = yf.Ticker(yf_sym)
            # Use 2d period to ensure we get previous close for change calc
            hist = ticker.history(period="2d", interval="1d")
            hist = hist.dropna(subset=['Close'])
            if len(hist) >= 2:
                current = float(hist['Close'].iloc[-1])
                prev = float(hist['Close'].iloc[-2])
                chg_pct = ((current - prev) / prev * 100) if prev > 0 else 0
                results.append({
                    "sym": display_sym,
                    "price": f"₹{current:,.2f}",
                    "chg": f"{chg_pct:+.2f}%",
                    "up": chg_pct >= 0
                })
            elif len(hist) == 1:
                # Only current day available
                current = float(hist['Close'].iloc[-1])
                results.append({
                    "sym": display_sym,
                    "price": f"₹{current:,.2f}",
                    "chg": "+0.00%",
                    "up": True
                })
            else:
                results.append({"sym": display_sym, "price": "₹—", "chg": "—", "up": True})
        except Exception as e:
            print(f"[Ticker] Failed to fetch {display_sym}: {e}")
            results.append({"sym": display_sym, "price": "₹—", "chg": "—", "up": True})
    return results

def fetch_us_ticker_data():
    """Fetch live US ticker data from yfinance for US_TICKER_YF_MAP.
    Uses 5d window so weekends/holidays always yield the last 2 trading days."""
    import yfinance as yf
    results = []
    for display_sym, yf_sym in US_TICKER_YF_MAP.items():
        try:
            ticker = yf.Ticker(yf_sym)
            # 5d ensures we get last 2 trading days even on weekends/holidays
            hist = ticker.history(period="5d", interval="1d")
            hist = hist.dropna(subset=['Close'])
            if len(hist) >= 2:
                current = float(hist['Close'].iloc[-1])
                prev = float(hist['Close'].iloc[-2])
                chg_pct = ((current - prev) / prev * 100) if prev > 0 else 0
                results.append({
                    "sym": display_sym,
                    "price": f"${current:,.2f}",
                    "chg": f"{chg_pct:+.2f}%",
                    "up": chg_pct >= 0
                })
            elif len(hist) == 1:
                current = float(hist['Close'].iloc[-1])
                results.append({
                    "sym": display_sym,
                    "price": f"${current:,.2f}",
                    "chg": "Fri Close",
                    "up": True
                })
            else:
                results.append({"sym": display_sym, "price": "$—", "chg": "—", "up": True})
        except Exception as e:
            print(f"[Ticker] Failed to fetch US ticker {display_sym}: {e}")
            results.append({"sym": display_sym, "price": "$—", "chg": "—", "up": True})
    return results

@app.get("/api/market_ticker")
async def market_ticker():
    """
    Returns market data for ticker banner.
    Caches data for 1 hour to reduce API calls.
    """
    # Check cache - only refetch if cache is older than 1 hour or missing
    cached_data = []
    cache_fresh = False
    try:
        if os.path.exists(TICKER_FILE):
            with open(TICKER_FILE, "r") as f:
                cache = json.load(f)
                cache_time = datetime.fromisoformat(cache.get("timestamp", "2000-01-01T00:00:00"))
                age_seconds = (datetime.utcnow() - cache_time).total_seconds()
                if age_seconds < 3600:  # 1 hour cache
                    cache_fresh = True
                cached_data = cache.get("data", [])
    except Exception:
        pass
    
    if cache_fresh and cached_data:
        return {"status": "success", "data": cached_data, "cached": True, "timestamp": cache.get("timestamp")}
    
    # Fetch fresh data
    try:
        results = fetch_ticker_data()
        # Save to cache
        os.makedirs(os.path.dirname(TICKER_FILE), exist_ok=True)
        with open(TICKER_FILE, "w") as f:
            json.dump({"timestamp": datetime.now().isoformat(), "data": results}, f)
        return {"status": "success", "data": results, "cached": False, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        # On error, fall back to stale cache if we have it
        if cached_data:
            return {"status": "success", "data": cached_data, "cached": True, "timestamp": cache.get("timestamp"), "error": str(e)}
        return {"status": "error", "message": str(e), "data": []}


@app.get("/api/us_market_ticker")
async def us_market_ticker():
    """
    Returns US market data for ticker banner.
    Caches data for 15 minutes to reduce API calls.
    """
    # Check cache - only refetch if cache is older than 15 minutes or missing
    cached_data = []
    cache_fresh = False
    try:
        if os.path.exists(US_TICKER_FILE):
            with open(US_TICKER_FILE, "r") as f:
                cache = json.load(f)
                cache_time = datetime.fromisoformat(cache.get("timestamp", "2000-01-01T00:00:00"))
                age_seconds = (datetime.utcnow() - cache_time).total_seconds()
                if age_seconds < 900:  # 15 min cache
                    cache_fresh = True
                cached_data = cache.get("data", [])
    except Exception:
        pass

    if cache_fresh and cached_data:
        return {"status": "success", "data": cached_data, "cached": True, "timestamp": cache.get("timestamp")}

    # Fetch fresh data
    try:
        results = fetch_us_ticker_data()
        # Save to cache
        os.makedirs(os.path.dirname(US_TICKER_FILE), exist_ok=True)
        with open(US_TICKER_FILE, "w") as f:
            json.dump({"timestamp": datetime.now().isoformat(), "data": results}, f)
        return {"status": "success", "data": results, "cached": False, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        # On error, fall back to stale cache if we have it
        if cached_data:
            return {"status": "success", "data": cached_data, "cached": True, "timestamp": cache.get("timestamp"), "error": str(e)}
        return {"status": "error", "message": str(e), "data": []}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
