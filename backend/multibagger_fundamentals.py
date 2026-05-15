"""
Fundamental Multibagger Scoring Engine
=======================================
Identifies stocks with STRUCTURAL capability to 2x-10x over 2-5 years.

Philosophy:
  - A multibagger earns its label from BUSINESS quality, not recent price action.
  - Corrections are BETTER entry points, not disqualifiers.
  - Once a stock qualifies, it stays qualified until the BUSINESS deteriorates.
  - Scoring is based on data that changes quarterly (earnings), not daily (price).

Scoring Breakdown (100 pts):
  [35 pts] Growth Engine     — Revenue CAGR, earnings growth, guidance trajectory
  [25 pts] Profitability     — FCF margin, ROE, gross margin expansion
  [20 pts] Balance Sheet     — Debt/equity, interest coverage, cash runway
  [10 pts] Valuation Entry   — PEG ratio, P/S vs growth (not absolute P/E)
  [10 pts] Price Structure   — 3yr trend quality (secondary, not a gate)

Disqualifiers (any one of these → skip regardless of score):
  - Revenue declining YoY
  - Negative FCF for 3+ consecutive years with no path to profitability
  - Debt/equity > 5x (financial distress territory)
  - Market cap < $500M (too early stage for this model)
"""

import yfinance as yf
import numpy as np
import pandas as pd
import logging
import json
import os
import time
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from scipy.stats import linregress

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
LEDGER_FILE = os.path.join(DATA_DIR, "multibagger_ledger.json")
os.makedirs(DATA_DIR, exist_ok=True)


# ─────────────────────────────────────────────
#  LEDGER — persistent signal store
# ─────────────────────────────────────────────

def load_ledger() -> Dict:
    """Load the persistent multibagger ledger from disk."""
    if os.path.exists(LEDGER_FILE):
        try:
            with open(LEDGER_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_ledger(ledger: Dict):
    """Save the ledger to disk."""
    with open(LEDGER_FILE, "w") as f:
        json.dump(ledger, f, indent=2, default=str)


def add_to_ledger(ledger: Dict, symbol: str, score_data: Dict) -> Dict:
    """
    Add or update a stock in the ledger.
    - If stock is new → record entry_date, first_score, current_score
    - If stock already exists → update current_score only; keep entry_date intact
    """
    now = datetime.utcnow().isoformat()
    if symbol not in ledger:
        ledger[symbol] = {
            "symbol": symbol,
            "entry_date": now,
            "first_score": score_data.get("total_score"),
            "current_score": score_data.get("total_score"),
            "last_refreshed": now,
            "score_breakdown": score_data.get("breakdown", {}),
            "fundamentals": score_data.get("fundamentals", {}),
            "status": "ACTIVE",
            "removal_reason": None,
            "removal_date": None,
        }
    else:
        ledger[symbol]["current_score"] = score_data.get("total_score")
        ledger[symbol]["last_refreshed"] = now
        ledger[symbol]["score_breakdown"] = score_data.get("breakdown", {})
        ledger[symbol]["fundamentals"] = score_data.get("fundamentals", {})
        ledger[symbol]["status"] = "ACTIVE"
    return ledger


def remove_from_ledger(ledger: Dict, symbol: str, reason: str) -> Dict:
    """
    Mark a stock as REMOVED due to fundamental deterioration.
    We keep the record for audit — we just change status.
    """
    if symbol in ledger:
        ledger[symbol]["status"] = "REMOVED"
        ledger[symbol]["removal_reason"] = reason
        ledger[symbol]["removal_date"] = datetime.utcnow().isoformat()
    return ledger


# ─────────────────────────────────────────────
#  FUNDAMENTAL FETCHER
# ─────────────────────────────────────────────

def fetch_fundamentals(symbol: str) -> Optional[Dict]:
    """
    Fetch fundamental data via yfinance.
    Returns a clean dict of financial metrics, or None if data is insufficient.
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}

        if not info or info.get("quoteType") not in ("EQUITY", "ETF", None):
            # Allow None quoteType as some stocks don't have it set
            if info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
                return None

        def safe(key, default=None):
            val = info.get(key, default)
            if val is None:
                return default
            if isinstance(val, float) and (np.isnan(val) or np.isinf(val)):
                return default
            return val

        # ── Market cap gate ──
        market_cap = safe("marketCap", 0)
        if market_cap < 500_000_000:  # < $500M → skip
            return None

        # ── Revenue growth (yoy) ──
        rev_growth = safe("revenueGrowth")        # trailing 12m YoY
        earn_growth = safe("earningsGrowth")       # trailing 12m YoY

        # ── Profitability ──
        gross_margin = safe("grossMargins")
        operating_margin = safe("operatingMargins")
        profit_margin = safe("profitMargins")
        roe = safe("returnOnEquity")
        roa = safe("returnOnAssets")

        # ── Balance sheet ──
        # NOTE: yfinance returns debtToEquity as a PERCENTAGE (e.g., 79.5 = 79.5% = 0.795x).
        # We normalize to a ratio by dividing by 100.
        _de_raw = safe("debtToEquity")
        debt_to_equity = round(_de_raw / 100, 4) if _de_raw is not None else None
        current_ratio = safe("currentRatio")
        quick_ratio = safe("quickRatio")
        total_cash = safe("totalCash", 0)
        total_debt = safe("totalDebt", 0)
        free_cashflow = safe("freeCashflow")

        # ── Valuation ──
        pe_ratio = safe("trailingPE")
        forward_pe = safe("forwardPE")
        peg_ratio = safe("pegRatio")
        price_to_sales = safe("priceToSalesTrailingTwelveMonths")
        price_to_book = safe("priceToBook")
        ev_to_revenue = safe("enterpriseToRevenue")
        ev_to_ebitda = safe("enterpriseToEbitda")

        # ── Revenue figures for CAGR calculation ──
        revenue_ttm = safe("totalRevenue")

        # ── Per-share ──
        eps_ttm = safe("trailingEps")
        eps_forward = safe("forwardEps")

        # ── Company meta ──
        name = safe("longName", symbol)
        sector = safe("sector", "Unknown")
        industry = safe("industry", "Unknown")
        current_price = safe("currentPrice") or safe("regularMarketPrice")
        week_52_high = safe("fiftyTwoWeekHigh")
        week_52_low = safe("fiftyTwoWeekLow")
        beta = safe("beta")
        analyst_rating = safe("recommendationKey", "").upper()

        return {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "industry": industry,
            "market_cap": market_cap,
            "current_price": current_price,
            "week_52_high": week_52_high,
            "week_52_low": week_52_low,
            "beta": beta,
            "analyst_rating": analyst_rating,
            # Growth
            "revenue_growth_yoy": rev_growth,
            "earnings_growth_yoy": earn_growth,
            "revenue_ttm": revenue_ttm,
            "eps_ttm": eps_ttm,
            "eps_forward": eps_forward,
            # Profitability
            "gross_margin": gross_margin,
            "operating_margin": operating_margin,
            "profit_margin": profit_margin,
            "roe": roe,
            "roa": roa,
            "free_cashflow": free_cashflow,
            # Balance sheet
            "debt_to_equity": debt_to_equity,
            "current_ratio": current_ratio,
            "quick_ratio": quick_ratio,
            "total_cash": total_cash,
            "total_debt": total_debt,
            # Valuation
            "pe_ratio": pe_ratio,
            "forward_pe": forward_pe,
            "peg_ratio": peg_ratio,
            "price_to_sales": price_to_sales,
            "price_to_book": price_to_book,
            "ev_to_revenue": ev_to_revenue,
            "ev_to_ebitda": ev_to_ebitda,
        }

    except Exception as e:
        logger.warning(f"[Fundamentals] Failed to fetch {symbol}: {e}")
        return None


# ─────────────────────────────────────────────
#  PRICE STRUCTURE (secondary, 10 pts)
# ─────────────────────────────────────────────

def score_price_structure(df: pd.DataFrame) -> float:
    """
    Score the 3-year price structure quality (0–10 pts).
    This is a SECONDARY signal. A stock in correction still scores here;
    we measure how smooth/persistent the long-term trend is.

    A stock can still qualify even if this score is low — corrections happen.
    """
    if df is None or len(df) < 252:
        return 5.0  # Neutral if insufficient data

    try:
        df_use = df.tail(min(756, len(df))).copy()
        closes = df_use["close"].values
        x = np.arange(len(closes))
        log_prices = np.log(closes)
        slope, _, r_value, _, _ = linregress(x, log_prices)
        r_squared = r_value ** 2

        # R² component (0–6 pts): persistent uptrend
        score_r2 = r_squared * 6.0

        # Slope component (0–4 pts): annualized return > 0
        ann_return = (np.exp(slope * 252) - 1) * 100  # %
        if ann_return <= 0:
            score_slope = 0
        elif ann_return >= 30:
            score_slope = 4.0
        else:
            score_slope = (ann_return / 30) * 4.0

        return round(min(score_r2 + score_slope, 10.0), 2)

    except Exception:
        return 5.0


# ─────────────────────────────────────────────
#  FUNDAMENTAL SCORER
# ─────────────────────────────────────────────

def score_fundamentals(f: Dict, df: pd.DataFrame = None) -> Optional[Dict]:
    """
    Score a stock's fundamental quality (0–100).
    Returns None if hard disqualifiers are triggered.

    Args:
        f:  fundamentals dict from fetch_fundamentals()
        df: optional price DataFrame for price structure score

    Returns:
        dict with total_score, breakdown, pass/fail, disqualifier
    """
    breakdown = {}
    disqualifier = None

    # ══════════════════════════════════════════
    #  HARD DISQUALIFIERS — returns None
    # ══════════════════════════════════════════

    # 1. Revenue declining
    rev_growth = f.get("revenue_growth_yoy")
    if rev_growth is not None and rev_growth < -0.05:  # -5% threshold (mild declines are OK)
        return {"pass": False, "disqualifier": f"Revenue declining YoY ({rev_growth*100:.1f}%)"}

    # 2. Extreme debt (financial distress)
    # debt_to_equity is already normalized to ratio (not %) in fetch_fundamentals()
    de = f.get("debt_to_equity")
    if de is not None and de > 5.0:
        return {"pass": False, "disqualifier": f"Extreme debt/equity ({de:.2f}x)"}

    # 3. Negative FCF + negative margins (burning cash with no path)
    fcf = f.get("free_cashflow")
    op_margin = f.get("operating_margin")
    if fcf is not None and fcf < 0 and op_margin is not None and op_margin < -0.30:
        return {"pass": False, "disqualifier": "Deeply FCF negative with -30%+ operating losses"}

    # ══════════════════════════════════════════
    #  [35 pts] GROWTH ENGINE
    # ══════════════════════════════════════════

    growth_score = 0.0

    # Revenue growth YoY (0–20 pts)
    if rev_growth is not None:
        if rev_growth >= 0.40:      growth_score += 20    # 40%+ YoY → exceptional
        elif rev_growth >= 0.25:    growth_score += 16    # 25%+ → strong
        elif rev_growth >= 0.15:    growth_score += 12    # 15%+ → good
        elif rev_growth >= 0.08:    growth_score += 7     # 8%+ → acceptable
        elif rev_growth >= 0.0:     growth_score += 3     # Flat → borderline
        # Negative already caught above

    # Earnings growth YoY (0–10 pts)
    earn_growth = f.get("earnings_growth_yoy")
    if earn_growth is not None:
        if earn_growth >= 0.50:     growth_score += 10
        elif earn_growth >= 0.25:   growth_score += 8
        elif earn_growth >= 0.10:   growth_score += 5
        elif earn_growth >= 0.0:    growth_score += 2
        # EPS improvement — even a loss-making co can show improving EPS

    # Forward EPS acceleration (0–5 pts)
    eps_ttm = f.get("eps_ttm")
    eps_fwd = f.get("eps_forward")
    if eps_ttm and eps_fwd and eps_ttm != 0:
        eps_growth = (eps_fwd - eps_ttm) / abs(eps_ttm)
        if eps_growth >= 0.30:  growth_score += 5
        elif eps_growth >= 0.15: growth_score += 3
        elif eps_growth >= 0.0:  growth_score += 1

    growth_score = min(growth_score, 35)
    breakdown["growth"] = round(growth_score, 1)

    # ══════════════════════════════════════════
    #  [25 pts] PROFITABILITY
    # ══════════════════════════════════════════

    profit_score = 0.0

    # Gross margin (0–8 pts) — higher = stronger moat
    gm = f.get("gross_margin")
    if gm is not None:
        if gm >= 0.70:      profit_score += 8     # SaaS / high-IP
        elif gm >= 0.50:    profit_score += 6
        elif gm >= 0.35:    profit_score += 4
        elif gm >= 0.20:    profit_score += 2
        elif gm >= 0.0:     profit_score += 1

    # FCF margin proxy (0–9 pts)
    revenue = f.get("revenue_ttm")
    fcf = f.get("free_cashflow")
    if revenue and fcf and revenue > 0:
        fcf_margin = fcf / revenue
        if fcf_margin >= 0.25:      profit_score += 9
        elif fcf_margin >= 0.15:    profit_score += 7
        elif fcf_margin >= 0.05:    profit_score += 4
        elif fcf_margin >= 0.0:     profit_score += 2
        elif fcf_margin >= -0.10:   profit_score += 1   # Slightly FCF -ve but improving is OK

    # ROE (0–8 pts) — returns capital efficiently
    roe = f.get("roe")
    if roe is not None:
        if roe >= 0.30:     profit_score += 8
        elif roe >= 0.20:   profit_score += 6
        elif roe >= 0.10:   profit_score += 4
        elif roe >= 0.0:    profit_score += 2

    profit_score = min(profit_score, 25)
    breakdown["profitability"] = round(profit_score, 1)

    # ══════════════════════════════════════════
    #  [20 pts] BALANCE SHEET
    # ══════════════════════════════════════════

    balance_score = 0.0

    # D/E ratio (0–10 pts) — already normalized to ratio in fetch_fundamentals()
    de = f.get("debt_to_equity")
    if de is not None:
        if de <= 0.0:       balance_score += 10   # Net cash
        elif de <= 0.30:    balance_score += 9
        elif de <= 0.75:    balance_score += 7
        elif de <= 1.50:    balance_score += 5
        elif de <= 3.00:    balance_score += 2
        # > 3x: 0 pts but not a disqualifier unless > 5x (caught above)

    # Current ratio (0–6 pts) — liquidity
    cr = f.get("current_ratio")
    if cr is not None:
        if cr >= 3.0:   balance_score += 6
        elif cr >= 2.0: balance_score += 5
        elif cr >= 1.5: balance_score += 4
        elif cr >= 1.0: balance_score += 2

    # Cash vs debt position (0–4 pts)
    cash = f.get("total_cash", 0) or 0
    debt = f.get("total_debt", 0) or 0
    if cash > debt:
        balance_score += 4   # Net cash positive
    elif cash > debt * 0.5:
        balance_score += 2   # Cash covers > 50% of debt

    balance_score = min(balance_score, 20)
    breakdown["balance_sheet"] = round(balance_score, 1)

    # ══════════════════════════════════════════
    #  [10 pts] VALUATION ENTRY
    # ══════════════════════════════════════════

    val_score = 0.0

    # PEG ratio (0–5 pts) — price/earnings vs growth rate
    peg = f.get("peg_ratio")
    if peg is not None and peg > 0:
        if peg <= 0.5:      val_score += 5    # Deep value relative to growth
        elif peg <= 1.0:    val_score += 4    # Fair value
        elif peg <= 1.5:    val_score += 3
        elif peg <= 2.0:    val_score += 2
        elif peg <= 3.0:    val_score += 1

    # P/S vs revenue growth (0–5 pts) — growth-adjusted P/S
    ps = f.get("price_to_sales")
    if ps is not None and rev_growth is not None and rev_growth > 0:
        # Rule: P/S / (rev_growth * 100) — lower is cheaper relative to growth
        ps_to_growth = ps / (rev_growth * 100)
        if ps_to_growth <= 0.05:    val_score += 5   # Very cheap vs growth
        elif ps_to_growth <= 0.10:  val_score += 4
        elif ps_to_growth <= 0.20:  val_score += 3
        elif ps_to_growth <= 0.40:  val_score += 2
        elif ps_to_growth <= 0.80:  val_score += 1
    elif ps is not None:
        # No growth data — just use raw P/S
        if ps <= 2:     val_score += 3
        elif ps <= 5:   val_score += 2
        elif ps <= 10:  val_score += 1

    val_score = min(val_score, 10)
    breakdown["valuation"] = round(val_score, 1)

    # ══════════════════════════════════════════
    #  [10 pts] PRICE STRUCTURE (secondary)
    # ══════════════════════════════════════════

    price_score = score_price_structure(df)
    breakdown["price_structure"] = round(price_score, 1)

    # ══════════════════════════════════════════
    #  TOTAL
    # ══════════════════════════════════════════

    total = growth_score + profit_score + balance_score + val_score + price_score
    total = round(min(total, 100), 1)

    # Minimum qualifying score: 45/100
    # Rationale: valuation data (PEG, P/S) is often missing from yfinance,
    # so 10 pts may be permanently unavailable. 45 ensures strong-fundamental
    # stocks (like GTLB with 23% growth + 29% FCF margin) still qualify.
    qualifies = total >= 45

    return {
        "pass": qualifies,
        "total_score": total,
        "breakdown": breakdown,
        "disqualifier": disqualifier,
        "fundamentals": {
            "revenue_growth_yoy_pct": round(rev_growth * 100, 1) if rev_growth is not None else None,
            "earnings_growth_yoy_pct": round(earn_growth * 100, 1) if earn_growth is not None else None,
            "gross_margin_pct": round(gm * 100, 1) if gm is not None else None,
            "operating_margin_pct": round(op_margin * 100, 1) if op_margin is not None else None,
            "roe_pct": round(roe * 100, 1) if roe is not None else None,
            "fcf_margin_pct": round((fcf / revenue * 100), 1) if (fcf and revenue and revenue > 0) else None,
            "debt_to_equity": round(de, 2) if de is not None else None,
            "current_ratio": round(cr, 2) if cr is not None else None,
            "peg_ratio": round(peg, 2) if peg is not None else None,
            "price_to_sales": round(ps, 2) if ps is not None else None,
            "market_cap_b": round(f.get("market_cap", 0) / 1e9, 2),
            "sector": f.get("sector"),
        },
    }


# ─────────────────────────────────────────────
#  MAIN SCANNER
# ─────────────────────────────────────────────

def scan_fundamentals(
    symbols: List[str],
    price_data_fn=None,
    max_workers: int = 8,
    top_n: int = 20,
    qualify_threshold: int = 50,
) -> List[Dict]:
    """
    Scan universe for fundamental multibaggers.
    Uses the persistent ledger — once qualified, a stock STAYS until fundamentals break.

    Args:
        symbols:         List of ticker symbols to scan
        price_data_fn:   Optional callable(symbol) → pd.DataFrame (for price structure)
        max_workers:     Parallel fetch threads
        top_n:           Return top N results
        qualify_threshold: Minimum score to qualify (default 50/100)

    Returns:
        List of qualified stock dicts, sorted by score descending
    """
    import concurrent.futures

    ledger = load_ledger()
    results = []

    def process(symbol):
        try:
            f = fetch_fundamentals(symbol)
            if f is None:
                return None, symbol, "insufficient_data"

            df = None
            if price_data_fn:
                try:
                    df = price_data_fn(symbol, years=3)
                except Exception:
                    pass

            scored = score_fundamentals(f, df)
            if scored is None:
                return None, symbol, "scoring_error"

            if not scored["pass"]:
                disq = scored.get("disqualifier", "below_threshold")
                return None, symbol, disq

            # Merge name/sector from fundamentals
            scored["symbol"] = symbol
            scored["name"] = f.get("name", symbol)
            scored["sector"] = f.get("sector", "Unknown")
            scored["current_price"] = f.get("current_price")
            scored["market_cap"] = f.get("market_cap")
            scored["analyst_rating"] = f.get("analyst_rating")

            return scored, symbol, "qualified"

        except Exception as e:
            logger.warning(f"[FundamentalScan] Error on {symbol}: {e}")
            return None, symbol, f"error: {e}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as ex:
        futures = {ex.submit(process, sym): sym for sym in symbols}
        for future in concurrent.futures.as_completed(futures):
            scored, symbol, status = future.result()
            if scored:
                results.append(scored)
                ledger = add_to_ledger(ledger, symbol, scored)
            else:
                # If previously in ledger as ACTIVE and now fails → check if fundamental break
                if symbol in ledger and ledger[symbol]["status"] == "ACTIVE":
                    if "declining" in status or "extreme debt" in status.lower() or "distress" in status.lower():
                        ledger = remove_from_ledger(ledger, symbol, status)
                    # Otherwise: don't remove — data gaps are common, benefit of the doubt

    save_ledger(ledger)

    # Sort by score
    results.sort(key=lambda x: x["total_score"], reverse=True)
    return results[:top_n]


def get_ledger_active(top_n: int = 50) -> List[Dict]:
    """
    Return all currently ACTIVE stocks from the ledger, sorted by score.
    This is what the UI shows — persistent, not recomputed on every load.
    """
    ledger = load_ledger()
    active = [v for v in ledger.values() if v.get("status") == "ACTIVE"]
    active.sort(key=lambda x: x.get("current_score", 0), reverse=True)
    return active[:top_n]


def get_ledger_stats() -> Dict:
    """Return ledger statistics for display."""
    ledger = load_ledger()
    active = [v for v in ledger.values() if v.get("status") == "ACTIVE"]
    removed = [v for v in ledger.values() if v.get("status") == "REMOVED"]
    return {
        "total_tracked": len(ledger),
        "active": len(active),
        "removed": len(removed),
        "last_entry": max((v.get("last_refreshed", "") for v in ledger.values()), default=None),
        "removal_reasons": [v.get("removal_reason") for v in removed if v.get("removal_reason")],
    }


if __name__ == "__main__":
    # Quick test
    from data_fetcher import fetch_daily_data
    test_symbols = ["NVDA", "GTLB", "SMCI", "AAPL", "TSLA"]
    print("Testing fundamental multibagger scanner...")
    results = scan_fundamentals(test_symbols, price_data_fn=fetch_daily_data, max_workers=4)
    for r in results:
        print(f"\n{r['symbol']} — Score: {r['total_score']}/100")
        print(f"  Breakdown: {r['breakdown']}")
        print(f"  Fundamentals: {r['fundamentals']}")
