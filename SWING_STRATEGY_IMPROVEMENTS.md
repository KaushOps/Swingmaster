# 📈 OmniQuant Swing Strategy — Improvement Suggestions & Capital Management Guide

> **⚠️ Reference document.** Some items below are suggestions only; others have been implemented in code (see section 1.3).

---

## Implementation note (backend)

Training labels in `create_labels()` now use **5×ATR target / 2×ATR stop** and a **60-session lookahead**, matching live signal levels and the vectorbt backtest. Class probabilities use **stride walk-forward refitting** (`predict_proba_walk_forward_stride`, default min train 120 bars, stride 10) to avoid full in-sample leakage on historical bars.

---

## 🔍 Current OmniQuant Strategy Summary

The OmniQuant backend uses a **machine learning pipeline on daily NSE data**:

- **Model**: XGBoost / Random Forest trained on 2 years of daily data
- **Features**: RSI, MACD, ATR, Volume Ratio, EMA(20/50), Bollinger Bands %, ADX, Stochastic, ROC(5/10), 52W proximity
- **Signal gate**: `prob_up > 0.55` AND `volume_ratio > 0.5`
- **High Conviction gate**: `prob_up > 0.72` AND `volume_ratio > 1.5x` AND `ATR% > 1.5%`
- **Quality Gates**: MACD Hist > 0, RSI 45–78, above EMA20, ADX > 18, within 40% of 52W high
- **Regime filter**: Nifty 50 must be above its 50-day EMA
- **Additional gates**: Weekly bullish trend check, Delivery % ≥ 35%
- **Universe**: ~60 Nifty large-caps

---

## 🎯 Part 1: Signal Accuracy Improvements

### 1.1 Add Weekly Timeframe Confirmation
**Problem**: The ML model runs entirely on daily data. Daily signals can fire during a weekly downtrend, creating false entries that get quickly stopped out.

**Suggestion**: Before emitting any BUY from the ML pipeline, add a weekly-frame pre-check:
- Is weekly HA-Close > HA-Open? (Heikin Ashi weekly candle bullish)
- Is weekly MACD hist > 0? (Momentum positive on the larger timeframe)
- Did weekly RSI(9) recently cross above its WMA(11)? (RSI accelerating upward)

This filters out daily noise during weekly corrections and dramatically reduces false entries.

---

### 1.2 Add Sector Momentum Filter (Sector Before Stock)
**Problem**: A stock with great individual signals can still fail if its whole sector is in a downtrend (e.g., IT stocks in a rate hike cycle).

**Suggestion**: Before processing any stock signal, check if its Nifty sector index is itself in an uptrend (e.g., closing above its 20-week EMA). Only accept signals from stocks in **rising sectors**. The `NIFTY_SECTOR_MAP` in `main.py` already does this classification — it just needs a sector health check added.

---

### 1.3 Improve Label Quality in ML Training
**Problem (historical)**: Earlier versions labeled a bar as `1` if price hit a smaller ATR target before a tighter stop within 40 days, which did not match live 5R/2R exits.

**Done in code**: Target/stop multipliers and lookahead are aligned with production; **stride walk-forward** probabilities replace single-fit in-sample scores on historical rows.

**Further suggestions** (optional):
- **Add a minimum hold period of 5 days** before checking for target/SL. This stops the model from learning 1–2 day spike patterns that don't repeat reliably.
- **Tune stride / min_train** for speed vs. approximation tradeoffs on the full NSE universe scan.

---

### 1.4 Add a "Prior Weakness" Feature
**Problem**: The ML model has no mechanism to distinguish between stocks in a healthy pullback-to-resume pattern versus stocks in extended parabolic moves. Buying extended rallies is a high-risk, low-reward setup.

**Suggestion**: Add a `prior_weakness` feature to ML training:
- Was the stock down ≥ 8% from its recent 20-day high at any point in the last 3 weeks?
- Was MACD hist negative at any point in the last 4 weeks?

This trains the model to prefer **pullback-to-resume** patterns over **parabolic continuation** patterns, which historically have much higher win rates.

---

### 1.5 Add Multi-Confirmation Scoring Instead of Hard Gates
**Problem**: The current quality gates are hard binary pass/fail. A stock passing 4/5 gates is treated identically to one passing 0/5. This loses meaningful resolution between signal quality.

**Suggestion**: Create a **signal score (0–100)** by awarding points across conditions:

| Condition | Points |
|-----------|--------|
| RSI 45–65 (sweet spot, not overbought) | +15 |
| MACD Hist > 0 AND Rising | +15 |
| Price above both EMA20 and EMA50 | +10 |
| Weekly HA-Close > HA-Open | +10 |
| ADX > 25 (strong trend, not choppy) | +10 |
| Volume Ratio > 1.5x average | +10 |
| Within 25% of 52W high | +10 |
| Delivery % > 45% | +10 |
| Market Bullish (Nifty above EMA50) | +10 |

Only trade stocks scoring **≥ 70 points**. Higher-scoring stocks get larger position size.

---

### 1.6 India VIX Regime Gate
**Problem**: The strategy only uses Nifty 50 level (above/below EMA50) as a regime filter. This misses **volatility spikes** (sudden corrections, global risk-off events) where even technically perfect setups fail.

**Suggestion**: Fetch **India VIX** (ticker: `^INDIAVIX`) and apply a dynamic gate:
- VIX < 15: Full capital deployment allowed
- VIX 15–20: Normal operations, monitor closely
- VIX > 20: Reduce all new position sizes by 50%
- VIX > 25: Suspend all new entries until VIX normalises

---

### 1.7 Add Delivery % as a Continuous ML Training Feature
**Problem**: Delivery percentage (already fetched in `data_fetcher.py`) is currently used only as a binary gate (≥35% = pass). This discards much of its informational value.

**Suggestion**: Add `delivery_pct` as a continuous numeric feature in ML training. High delivery % strongly correlates with institutional accumulation — the model should learn to weight 60% delivery very differently from 35% delivery.

---

## 💰 Part 2: Capital Management with ₹30,000/Month

### 2.1 The Real Problem: Position Sizing

With ₹30,000 capital and signals firing on stocks priced between ₹100–₹4,000, **buying 1 qty of every signal is not a valid capital management strategy**. Some stocks will consume your entire month's capital in a single trade.

The correct approach is **ATR-based fractional position sizing**.

---

### 2.2 Suggested Framework: 2% Risk Per Trade

The professional standard: **never risk more than 2% of total capital on any single trade**.

**Formula**:
```
Risk per trade     = Total Capital × 2%  = ₹30,000 × 0.02 = ₹600
ATR (stoploss gap) = Entry Price – Stoploss Price
Quantity           = Risk per trade ÷ ATR stop gap
Max capital        = Quantity × Entry Price
```

**Example**:
- Entry: ₹500, ATR = ₹20 → Stoploss: ₹460 → Stop Gap = ₹40
- Quantity = ₹600 ÷ ₹40 = **15 shares**
- Capital deployed = 15 × ₹500 = **₹7,500**

This means you can comfortably run **3–4 simultaneous positions** within ₹30,000 at 2% risk each.

> 💡 **This formula already uses your existing ATR values** that the OmniQuant backend computes. No new data needed.

---

### 2.3 Stock Price Filter: Budget-Aware Screening

| Stock Price Range | Approx Qty for ₹5,000 allocation | Suitable? |
|-------------------|----------------------------------|-----------|
| < ₹200 | 25 shares | ✅ Excellent |
| ₹200–₹500 | 10–25 shares | ✅ Good |
| ₹500–₹1,500 | 3–10 shares | ⚠️ Acceptable |
| ₹1,500–₹3,000 | 1–3 shares | ⚠️ Tight |
| > ₹3,000 | < 1 share | ❌ Skip or HC only |

**Suggestion**: Deprioritise stocks priced above ₹1,500 unless the signal is High Conviction (score ≥ 90). Stocks like TCS (₹3,500+), NESTLEIND (₹2,200+) are impractical at ₹30K capital.

---

### 2.4 Monthly Capital Deployment Plan

Rather than deploying all capital on the first signal of the month, use a **structured weekly deployment**:

**Week 1** (₹12,000 — 40% of capital):
- Enter only **High Conviction** signals (score ≥ 80)
- Maximum 2 positions

**Week 2** (₹9,000 — 30% of capital):
- Enter next tier signals (score ≥ 70)
- Only if Week 1 positions are in profit or at breakeven

**Week 3–4** (₹9,000 reserve):
- Enter only new high-quality setups (score ≥ 80)
- Keep remaining as buffer for SL recovery or better entry opportunities

> **Key Rule**: Never deploy 100% of capital at month start. A 30% reserve protects you from being fully exposed when the market gaps down.

---

### 2.5 Trade Prioritization Matrix

When multiple signals fire in the same week, rank using this matrix:

| Priority | Criteria | Action |
|----------|----------|--------|
| 🥇 Tier 1 | HC Signal (prob > 72%) + Score ≥ 80 + Price < ₹1,000 | Enter immediately, 40% of capital |
| 🥈 Tier 2 | NSE Buy (prob > 55%) + Score ≥ 70 + Price < ₹1,500 | Enter with 30% of capital |
| 🥉 Tier 3 | NSE Buy + Score 50–70 | Add to watchlist, wait for better setup |
| ❌ Skip | Any signal + Price > ₹3,000 | Skip unless HC with ₹5K max |

---

### 2.6 Hard Stop Rules (Capital Protection)

These rules must be non-negotiable to protect your account:


1. **Maximum 40% of capital in any single sector** — sector risk cap
2. **3 consecutive SL hits → pause for 1 week** — circuit breaker to avoid emotional trading
3. **Never average down on a losing position** — adds to risk in the wrong direction


---

### 2.7 Position Sizing Table for ₹30,000 Capital

| Signal Tier | Capital Allocated | Max Positions |
|-------------|-------------------|---------------|
| High Conviction (prob > 72%) | ₹10,000 per trade | Max 2 |
| NSE Buy (score ≥ 70) | ₹7,000 per trade | Max 3 |
| Watchlist (score 50–70) | ₹5,000 per trade | Max 2 |
| Reserve (always keep) | ₹8,000 | Never deploy |

---

## 🔧 Part 3: OmniQuant Universe Expansion

### 3.1 Add Mid-Cap Tier (Price-Friendly Stocks)

The current NSE Universe is almost entirely Nifty 50 large-caps, many costing ₹1,000–₹4,000 per share. This makes meaningful quantity purchase impractical with ₹30K.

**Suggestion**: Add a second universe tier of **Nifty MidCap 150** stocks with:
- Price < ₹1,500
- Market Cap > ₹5,000 Cr
- Average Daily Volume > 5 lakh shares

Stocks already partially in your universe (IREDA, PFC, RVNL, BHEL, BEL) are good examples — they provide meaningful quantity at ₹30K capital.

---

### 3.2 Add a "Budget Friendly" Tag to the API Response

**Suggestion**: Add a `budget_friendly` boolean to each signal in the API response:
```python
budget_friendly = close < 1500 and (30000 // close) >= 5
```

The frontend can then display a ₹ badge on signals where meaningful quantity is purchasable with ₹30K, making manual trade selection fast and intuitive.

---

## 📊 Part 4: Exit Strategy Improvements

### 4.1 Current Exit: Fixed ATR Multiples
Currently: **Stoploss = Entry − 2×ATR**, **Target = Entry + 5×ATR** (2.5:1 reward:risk)

This is solid, but a static target often leaves significant profits on the table in strong trending moves.

### 4.2 Improved: Trailing Stop After Partial Move

Once a trade moves in your favour, **protect profits progressively** rather than waiting for the fixed target:

| Profit Milestone | Action |
|------------------|--------|
| Price moves up +1×ATR | Move stoploss to **breakeven** (entry price) — trade is now risk-free |
| Price moves up +2×ATR | Trail stoploss to Entry + 1×ATR |
| Price moves up +3×ATR | Trail stoploss to Entry + 2×ATR |
| Original target hit | Close full position |

This allows **winners to run further** while locking in profit at each stage.

### 4.3 Time-Based Exit (Dead Money Rule)
If a trade does not move ≥ 5% within **15 trading days** → exit at market price regardless of P&L. Dead money is opportunity cost that blocks capital from better setups.

The backend already tracks `days_in_trade` — an alert when a trade hits 15 days with <5% movement is a straightforward addition.

---

## 🗂️ Part 5: Suggested Implementation Priority

| Priority | Improvement | Impact | Effort |
|----------|------------|--------|--------|
| 1 | Add budget-friendly stock filter (price < ₹1,500) | High | Low |
| 2 | Implement 2% risk per trade ATR position sizing | High | Low |
| 3 | Add Signal Score system (0–100 points) | High | Medium |
| 4 | Weekly timeframe confirmation layer | High | Medium |
| 5 | India VIX regime gate | Medium | Low |
| 6 | Add Mid-Cap universe tier (price-friendly stocks) | Medium | Medium |
| 7 | Walk-forward training for ML model | High | High |
| 8 | Trailing stop logic after +1×ATR gain | Medium | Medium |
| 9 | Sector momentum pre-filter | High | Medium |
| 10 | Delivery % as continuous ML feature | Medium | Low |

---

## 📌 Quick Reference: Capital Management Cheat Sheet

```
Monthly Capital: ₹30,000
Reserve (NEVER deploy): ₹8,000
Available for trades:  ₹22,000

Max open positions: 4
Max risk per trade: 2% = ₹600

Position Size Formula:
  Qty = ₹600 ÷ (Entry − Stoploss)
  Capital used = Qty × Entry Price

Stock Price Budget Guide:
  ≤ ₹200   → 25+ shares with ₹5K ✅
  ≤ ₹500   → 10+ shares with ₹5K ✅
  ≤ ₹1,500 → 3+ shares with ₹5K  ⚠️
  > ₹1,500 → HC only, ₹5K max   ❌

Trade Tiers (signal score based):
  Score ≥ 80 (HC) → ₹10,000 max — prioritise these
  Score ≥ 70      → ₹7,000 max
  Score 50–70     → Watchlist only

Exit Rules:
  Stoploss:  Entry − 2×ATR (hard stop, no exceptions)
  Target:    Entry + 5×ATR
  Trailing:  Move SL to breakeven at +1×ATR gain
  Time stop: Exit if < 5% move in 15 trading days
```

---

*Generated: April 2026 | Strategy: OmniQuant ML Swing | Exchange: NSE India*
