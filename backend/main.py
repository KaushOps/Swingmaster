from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd
import requests
from io import StringIO
from apscheduler.schedulers.background import BackgroundScheduler
import pytz
import threading

from data_fetcher import fetch_daily_data
from ml_model import add_features, create_labels, IntradayModel, passes_quality_gates
from backtest import run_backtest

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    "MAZDOCK.NS", "SUZLON.NS", "NHPC.NS", "SJVN.NS", "KALYANKJIL.NS"
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

# HC Thresholds
HC_PROB_UP    = 0.72   # at least 72% ML confidence
HC_VOL_RATIO  = 1.5    # at least 1.5x average volume spike
HC_ATR_FILTER = 0.015  # require at least 1.5% ATR (avoid noise)

_nifty_bullish = True  # global cache for regime; updated with each scan

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


def compute_hc_historical_stats(historical_map):
    """Given the HC historical signal map, compute aggregate backtest stats."""
    total = wins = losses = active = 0
    for d, sigs in historical_map.items():
        for s in sigs:
            total += 1
            if s['status'] == 'TARGET HIT': wins += 1
            elif s['status'] == 'SL HIT': losses += 1
            else: active += 1
    closed = wins + losses
    win_rate = round(wins / closed * 100, 1) if closed > 0 else 0
    return {
        "total_signals": total,
        "target_hit": wins,
        "sl_hit": losses,
        "active": active,
        "win_rate_pct": win_rate,
        "closed_trades": closed
    }

def update_universe_cache():
    if GLOBAL_BUY_CACHE["is_scanning"]:
        return
        
    GLOBAL_BUY_CACHE["is_scanning"] = True
    print(f"Starting background scan of {len(NSE_UNIVERSE)} NSE Universe stocks for BUY signals...")
    
    buys = []
    historical_map = {}
    hc_buys = []
    hc_historical_map = {}
    
    # Regime filter — check Nifty stance once before scanning all stocks
    market_bullish = is_nifty_bullish()
    print(f"Nifty 50 regime: {'BULLISH ✅' if market_bullish else 'BEARISH ⚠️'}")
    
    for symbol in NSE_UNIVERSE:
        try:
            df = fetch_daily_data(symbol, years=2)
            if len(df) < 100: continue
            
            df = add_features(df)
            df = create_labels(df)
            
            model = IntradayModel()
            model.train(df[:-1])
            
            df['prob_up'] = model.predict_proba(df)
            bt_stats = run_backtest(df, sl_atr_mult=2.0, tp_atr_mult=5.0, init_cash=100000)
            latest_close = float(df['close'].iloc[-1])
            
            entries = df[(df['prob_up'] > 0.55) & (df['volume_ratio'] > 0.5)]
            hc_entries = df[
                (df['prob_up'] > HC_PROB_UP) &
                (df['volume_ratio'] > HC_VOL_RATIO) &
                (df['atr'] / df['close'] > HC_ATR_FILTER)
            ]
            
            def build_signal(row, date, df, sym, latest_close, sl_mult=2.0, tp_mult=5.0):
                entry_price = float(row['close'])
                atr = float(row['atr'])
                target = entry_price + (tp_mult * atr)
                stoploss = entry_price - (sl_mult * atr)
                future_df = df.loc[date:]
                status = "ACTIVE"
                if len(future_df) > 1:
                    for f_date, f_row in future_df.iloc[1:].iterrows():
                        if f_row['low'] <= stoploss:
                            status = "SL HIT"
                            break
                        elif f_row['high'] >= target:
                            status = "TARGET HIT"
                            break
                growth_pct = ((latest_close - entry_price) / entry_price) * 100
                return {
                    "symbol": sym,
                    "entry": round(entry_price, 2),
                    "target": round(target, 2),
                    "stoploss": round(stoploss, 2),
                    "status": status,
                    "growth_pct": round(growth_pct, 2),
                    "confidence": round(float(row['prob_up']) * 100, 1),
                    "volume_ratio": round(float(row['volume_ratio']), 2)
                }
            
            sym = symbol.replace('.NS', '')
            for date, row in entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                if date_str not in historical_map:
                    historical_map[date_str] = []
                sig = build_signal(row, date, df, sym, latest_close)
                if passes_quality_gates(row):
                    historical_map[date_str].append(sig)
            
            for date, row in hc_entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                if date_str not in hc_historical_map:
                    hc_historical_map[date_str] = []
                sig = build_signal(row, date, df, sym, latest_close, sl_mult=2.0, tp_mult=5.0)
                if passes_quality_gates(row):
                    hc_historical_map[date_str].append(sig)
            
            latest = df.iloc[-1]
            entry_price = float(latest['close'])
            atr = float(latest['atr'])
            prob_up = float(latest['prob_up'])
            vol_ratio = float(latest['volume_ratio'])
            atr_pct = atr / entry_price if entry_price > 0 else 0
            
            sym = symbol.replace(".NS", "")
            target = entry_price + (5.0 * atr)
            stoploss = entry_price - (2.0 * atr)
            
            if prob_up > 0.55 and vol_ratio > 0.5 and market_bullish and passes_quality_gates(latest):
                buys.append({
                    "symbol": sym,
                    "action": "BUY",
                    "confidence": round(prob_up * 100, 2),
                    "entry": round(entry_price, 2),
                    "target": round(target, 2),
                    "stoploss": round(stoploss, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "backtest": bt_stats
                })
            
            if prob_up > HC_PROB_UP and vol_ratio > HC_VOL_RATIO and atr_pct > HC_ATR_FILTER and market_bullish and passes_quality_gates(latest):
                hc_buys.append({
                    "symbol": sym,
                    "action": "STRONG BUY",
                    "confidence": round(prob_up * 100, 2),
                    "entry": round(entry_price, 2),
                    "target": round(target, 2),
                    "stoploss": round(stoploss, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "backtest": bt_stats
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

@app.get("/api/scan_universe_buys")
def scan_universe_buys() -> Dict[str, Any]:
    return {
        "status": "success", 
        "last_updated": GLOBAL_BUY_CACHE["last_updated"], 
        "is_scanning": GLOBAL_BUY_CACHE["is_scanning"],
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
        "data": HC_CACHE["data"],
        "historical": HC_CACHE["historical"],
        "backtest_summary": HC_CACHE["backtest_summary"]
    }

@app.get("/api/scan")
def scan_markets(market: str = "IN") -> Dict[str, Any]:
    in_stocks, us_stocks = get_stocks_from_sheet()
    
    stocks_to_scan = in_stocks if market == "IN" else us_stocks
    init_cash = 100000 if market == "IN" else 1200
    
    results = []
    
    for symbol in stocks_to_scan:
        try:
            df = fetch_daily_data(symbol, years=2)
            if len(df) < 100:
                continue
                
            df = add_features(df)
            df = create_labels(df)
            
            model = IntradayModel()
            model.train(df[:-1])
            
            df['prob_up'] = model.predict_proba(df)
            bt_stats = run_backtest(df, sl_atr_mult=2.0, tp_atr_mult=5.0, init_cash=init_cash)
            
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
            
    return {"status": "success", "timestamp": datetime.now().isoformat(), "market": market, "data": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
