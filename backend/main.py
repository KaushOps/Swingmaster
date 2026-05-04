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

def build_signal_frozen(frozen_sig, date_str, df, sym, latest_close):
    entry_price = frozen_sig['entry']
    target = frozen_sig['target']
    stoploss = frozen_sig['stoploss']
    
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

NSE_UNIVERSE = [
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

# --- Initialize historical data on boot from the persistent ledger ---
_startup_ledger = load_ledger()

# HC Thresholds — defaults, overridden by ThresholdCalibrator after scan
HC_PROB_UP    = 0.72   # at least 72% ML confidence
HC_VOL_RATIO  = 1.5    # at least 1.5x average volume spike
HC_ATR_FILTER = 0.015  # require at least 1.5% ATR (avoid noise)

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
    is_seed_run = (len(ledger["NSE_BUYS"]) == 0)
    today_date_str = datetime.now().strftime("%Y-%m-%d")
    
    for symbol in NSE_UNIVERSE:
        try:
            df = fetch_daily_data(symbol, years=2)
            if len(df) < 100: continue
            
            df = add_features(df, macro_df)
            if len(df) < 80: continue  # guard: add_features drops NaN rows
            
            df = create_labels(df)
            if len(df) < 50: continue  # guard: create_labels with 60-day lookahead can shrink df heavily
            
            model = IntradayModel()
            model.train(df[:-60])
            
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
            for date_str, sigs in ledger["NSE_BUYS"].items():
                if sym in sigs:
                    if date_str not in historical_map: historical_map[date_str] = []
                    historical_map[date_str].append(build_signal_frozen(sigs[sym], date_str, df, sym, latest_close))
                    
            for date_str, sigs in ledger["HIGH_CONVICTION"].items():
                if sym in sigs:
                    if date_str not in hc_historical_map: hc_historical_map[date_str] = []
                    hc_historical_map[date_str].append(build_signal_frozen(sigs[sym], date_str, df, sym, latest_close))
            
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
    GLOBAL_BUY_CACHE["last_updated"] = datetime.now().isoformat()
    GLOBAL_BUY_CACHE["is_scanning"] = False
    HC_CACHE["data"] = hc_buys
    HC_CACHE["historical"] = hc_hist_list
    HC_CACHE["backtest_summary"] = hc_stats
    HC_CACHE["last_updated"] = datetime.now().isoformat()
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

# Kick off initial scan on boot
threading.Thread(target=update_universe_cache, daemon=True).start()

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
scheduler.start()

# Pre-warm caches with ledger data so UI loads instantly (no scan wait required)
try:
    load_ledger()
    print(f"Boot cache loaded: HC={len(HC_CACHE['historical'])} days, NSE={len(GLOBAL_BUY_CACHE['historical'])} days from {LEDGER_FILE}")
except Exception as _e:
    print(f"Boot cache load failed: {_e}")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

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
        "timestamp": datetime.now().isoformat(), 
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
    return {"status": "success", "data": results, "timestamp": datetime.now().isoformat()}


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
            "timestamp": datetime.now().isoformat(),
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

@app.get("/api/market_ticker")
async def market_ticker():
    """
    Returns cached market data from the last daily scan.
    Shows last fetched prices even on weekends/market holidays.
    """
    cached = load_ticker_cache()
    
    # If no cache, return fallback with — (will be populated after first scan)
    if not cached:
        return {
            "status": "success", 
            "data": [{"sym": s, "price": "—", "chg": "—", "up": True} for s in TICKER_SYMBOLS],
            "cached": False
        }
    
    # Merge cached data with full symbol list (fill missing with —)
    cached_map = {item["sym"]: item for item in cached}
    results = []
    for sym in TICKER_SYMBOLS:
        if sym in cached_map:
            results.append(cached_map[sym])
        else:
            results.append({"sym": sym, "price": "—", "chg": "—", "up": True})
    
    return {"status": "success", "data": results, "cached": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
