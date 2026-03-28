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

from data_fetcher import fetch_daily_data, is_weekly_bullish, get_delivery_pct
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

# Yahoo Finance authenticated session (crumb required for quoteSummary v10)
_yf_session = None
_yf_crumb   = None

def get_yf_session():
    """Returns a requests.Session with Yahoo Finance cookies + crumb."""
    global _yf_session, _yf_crumb
    try:
        if _yf_session and _yf_crumb:
            return _yf_session, _yf_crumb
        s = requests.Session()
        s.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        })
        # Yahoo Finance requires visiting the cookie consent page first
        s.get("https://fc.yahoo.com", timeout=8)
        r = s.get("https://query1.finance.yahoo.com/v1/test/getcrumb", timeout=8)
        if r.status_code == 200 and r.text.strip():
            _yf_session = s
            _yf_crumb   = r.text.strip()
            print(f"Yahoo Finance crumb obtained: {_yf_crumb[:6]}...")
        return _yf_session, _yf_crumb
    except Exception as e:
        print(f"YF session error: {e}")
        return None, None

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

    # Pre-fetch NSE Bhavcopy delivery % data once (cached per day)
    from data_fetcher import _fetch_nse_delivery_pct
    _fetch_nse_delivery_pct()  # warms up the cache for all symbols
    
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
                # No quality gate on historical data — full unfiltered backtest accuracy
                historical_map[date_str].append(build_signal(row, date, df, sym, latest_close))
            
            for date, row in hc_entries.iterrows():
                date_str = date.strftime("%Y-%m-%d")
                if date_str not in hc_historical_map:
                    hc_historical_map[date_str] = []
                # No quality gate on historical data — full unfiltered backtest accuracy
                hc_historical_map[date_str].append(build_signal(row, date, df, sym, latest_close, sl_mult=2.0, tp_mult=5.0))
            
            latest = df.iloc[-1]
            entry_price = float(latest['close'])
            atr = float(latest['atr'])
            prob_up = float(latest['prob_up'])
            vol_ratio = float(latest['volume_ratio'])
            atr_pct = atr / entry_price if entry_price > 0 else 0
            
            sym = symbol.replace(".NS", "")
            target = entry_price + (5.0 * atr)
            stoploss = entry_price - (2.0 * atr)
            
            # --- Extra gates for live signals: weekly trend + delivery % ---
            weekly_ok = is_weekly_bullish(symbol)
            delivery_pct = get_delivery_pct(symbol)
            # delivery gate: >35% OR unavailable (fail open)
            delivery_ok = (delivery_pct is None) or (delivery_pct >= 35.0)

            if prob_up > 0.55 and vol_ratio > 0.5 and market_bullish and passes_quality_gates(latest) and weekly_ok and delivery_ok:
                buys.append({
                    "symbol": sym,
                    "action": "BUY",
                    "confidence": round(prob_up * 100, 2),
                    "entry": round(entry_price, 2),
                    "target": round(target, 2),
                    "stoploss": round(stoploss, 2),
                    "volume_ratio": round(vol_ratio, 2),
                    "delivery_pct": round(delivery_pct, 1) if delivery_pct is not None else None,
                    "backtest": bt_stats
                })
            
            if prob_up > HC_PROB_UP and vol_ratio > HC_VOL_RATIO and atr_pct > HC_ATR_FILTER and market_bullish and passes_quality_gates(latest) and weekly_ok and delivery_ok:
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

    # --- Strategy 2: Yahoo Finance quoteSummary API with crumb auth ---
    info = {}
    try:
        sess, crumb = get_yf_session()
        if sess and crumb:
            modules = "summaryProfile,defaultKeyStatistics,financialData,summaryDetail,price"
            url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ns_symbol}?modules={modules}&crumb={crumb}"
            resp = sess.get(url, timeout=12)
            if resp.status_code == 200:
            result = resp.json().get("quoteSummary", {}).get("result", [{}])
            if result:
                r = result[0]
                sp = r.get("summaryProfile", {})
                fd = r.get("financialData", {})
                ks = r.get("defaultKeyStatistics", {})
                sd = r.get("summaryDetail", {})
                pr = r.get("price", {})

                def raw(d, key):
                    val = d.get(key, {})
                    if isinstance(val, dict):
                        return val.get("raw")
                    return val if val not in ("", None) else None

                info = {
                    "longName":          pr.get("longName") or pr.get("shortName", symbol),
                    "sector":            sp.get("sector", "N/A"),
                    "industry":          sp.get("industry", "N/A"),
                    "longBusinessSummary": sp.get("longBusinessSummary", ""),
                    "trailingPE":        raw(sd, "trailingPE"),
                    "priceToBook":       raw(ks, "priceToBook"),
                    "returnOnEquity":    raw(fd, "returnOnEquity"),
                    "debtToEquity":      raw(fd, "debtToEquity"),
                    "revenueGrowth":     raw(fd, "revenueGrowth"),
                    "earningsGrowth":    raw(fd, "earningsGrowth"),
                    "dividendYield":     raw(sd, "dividendYield"),
                    "beta":              raw(sd, "beta"),
                    "recommendationKey": fd.get("recommendationKey", "N/A"),
                    "targetMeanPrice":   raw(fd, "targetMeanPrice"),
                    "marketCap":         raw(pr, "marketCap"),
                    "currentPrice":      raw(pr, "regularMarketPrice") or fi.get("current_price"),
                    "fiftyTwoWeekHigh":  raw(sd, "fiftyTwoWeekHigh") or fi.get("week_52_high"),
                    "fiftyTwoWeekLow":   raw(sd, "fiftyTwoWeekLow") or fi.get("week_52_low"),
                }
    except Exception as e:
        print(f"Yahoo quoteSummary error for {symbol}: {e}")

    # Merge: prefer quoteSummary data, fallback to fast_info
    def safe(key, default=None):
        val = info.get(key, default)
        if val is None or (isinstance(val, float) and (val != val)):
            return default
        return val

    # --- Signal logic from price history + indicators ---
    signal_logic = {}
    try:
        df = fetch_daily_data(ns_symbol, years=1)
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
    market_cap = safe("marketCap") or fi.get("market_cap")
    if market_cap:
        if market_cap >= 1e12:    market_cap_str = f"₹{market_cap/1e12:.2f}T"
        elif market_cap >= 1e9:   market_cap_str = f"₹{market_cap/1e9:.2f}B"
        else:                     market_cap_str = f"₹{market_cap/1e7:.2f}Cr"
    else:
        market_cap_str = "N/A"

    return {
        "symbol":          symbol.upper(),
        "company_name":    safe("longName", symbol),
        "sector":          safe("sector", "N/A"),
        "industry":        safe("industry", "N/A"),
        "market_cap":      market_cap_str,
        "current_price":   safe("currentPrice") or fi.get("current_price"),
        "week_52_high":    safe("fiftyTwoWeekHigh") or fi.get("week_52_high"),
        "week_52_low":     safe("fiftyTwoWeekLow") or fi.get("week_52_low"),
        "pe_ratio":        safe("trailingPE"),
        "pb_ratio":        safe("priceToBook"),
        "roe":             round(safe("returnOnEquity") * 100, 1) if safe("returnOnEquity") else None,
        "debt_to_equity":  safe("debtToEquity"),
        "revenue_growth":  round(safe("revenueGrowth") * 100, 1) if safe("revenueGrowth") else None,
        "earnings_growth": round(safe("earningsGrowth") * 100, 1) if safe("earningsGrowth") else None,
        "dividend_yield":  round(safe("dividendYield") * 100, 2) if safe("dividendYield") else None,
        "beta":            safe("beta"),
        "analyst_rating":  (safe("recommendationKey") or "N/A").upper(),
        "target_mean_price": safe("targetMeanPrice"),
        "description":     safe("longBusinessSummary", "No description available."),
        "signal_logic":    signal_logic,
        "news":            news_items,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
