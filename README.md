# TradeFlex — AI-Powered Swing Trading Platform

**Version:** v5.0 | **Release Date:** May 2026  
**Repository:** [KaushOps/Swingmaster](https://github.com/KaushOps/Swingmaster)  
**Deployment:** Oracle Cloud VM (Docker) — `129.159.226.235`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How the AI Signal Engine Works](#how-the-ai-signal-engine-works)
4. [How the LLM Layer Works](#how-the-llm-layer-works)
5. [How the Adaptive Self-Learning Engine Works](#how-the-adaptive-self-learning-engine-works)
6. [Multibagger Engine](#multibagger-engine)
7. [Dashboard Tabs Explained](#dashboard-tabs-explained)
8. [How to Use Signals](#how-to-use-signals)
9. [Recent Changes (v5.0)](#recent-changes-v50)
10. [Deployment Guide](#deployment-guide)
11. [Technical Stack](#technical-stack)

---

## Overview

TradeFlex is a self-learning, AI-powered swing trading platform that scans 60+ top NSE stocks daily. It combines:

- **ML classifier** (XGBoost/Random Forest) with walk-forward validation to generate BUY signals
- **LLM layer** (Groq + OpenRouter) for signal rationale, trade post-mortems, and gate suggestions
- **Adaptive engine** that continuously improves signal quality by learning from closed trade outcomes
- **Multibagger scanner** for identifying long-term compounding candidates
- **Real-time dashboard** with heatmap, sector trending, watchlist, portfolio tracking, and signal history

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ HC Signals│ │NSE Buys │ │Multibagger│ │Watchlist │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Portfolio │ │  Budget  │ │SignalHist│ │Heatmap  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST API
┌────────────────────────▼────────────────────────────────┐
│                    BACKEND (FastAPI)                      │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  ml_model   │  │ adaptive_    │  │  llm_analyst   │  │
│  │  (XGBoost/  │  │ engine       │  │  (Groq +       │  │
│  │  Random     │  │ (self-       │  │  OpenRouter)   │  │
│  │  Forest)    │  │  learning)   │  │                │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ multibagger │  │ data_fetcher │  │   backtest     │  │
│  │ _model      │  │ (yfinance)   │  │   (vectorbt)   │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                     DATA LAYER                           │
│  signals_ledger.json │ outcome_log.csv │ ticker_cache    │
│  feature_snapshots   │ postmortem_log  │ adaptive_gates  │
│  llm_cache/          │ shap_history    │ mb_affinity     │
└─────────────────────────────────────────────────────────┘
```

---

## How the AI Signal Engine Works

### Step 1 — Feature Engineering (`ml_model.py → add_features`)

For each stock, the following technical indicators are computed from daily OHLCV data:

| Feature | Description |
|---------|-------------|
| `rsi` | 14-period Relative Strength Index |
| `macd_hist` | MACD histogram (12/26/9 EMA) |
| `adx` | Average Directional Index — trend strength |
| `bb_pct` | Bollinger Band %B — position within bands |
| `stoch_k` | Stochastic Oscillator %K |
| `volume_ratio` | Today's volume / 20-day average volume |
| `atr` | Average True Range — volatility |
| `ema20_slope` | Slope of 20-day EMA — direction |
| `price_vs_52w` | Current price as % of 52-week high |

### Step 2 — Training Labels (`create_labels`)

Each historical bar is labeled WIN or LOSS based on whether price hit the **target before the stoploss** within a 60-session lookahead window:

- **Target:** `Entry Price + 5.0 × ATR`
- **Stoploss:** `Entry Price − 2.0 × ATR`
- **Lookahead:** 60 trading sessions (~3 months)

This aligns training objectives exactly with what you see on the live signal cards.

### Step 3 — Walk-Forward Validation (`predict_proba_walk_forward_stride`)

This is the critical difference between TradeFlex and a naive ML model. Rather than training on all historical data and scoring the same data (in-sample bias), TradeFlex uses **stride walk-forward validation**:

```
For each bar i starting from bar 120:
  If i == 120 or (i - 120) % 10 == 0:
    Train a NEW model on bars [0 .. i-1] only
  Score bar i using this model (bar i was never in training)
  Store prob_up[i]
```

**Why this matters:**
- Bars 0–119 get no score (not enough history) — shown as "insufficient data"
- Each scored bar was **never seen by the model that scores it**
- This mimics true live trading where you only know the past
- Historical win rates in the dashboard reflect **real out-of-sample accuracy**

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `WALK_FORWARD_MIN_TRAIN` | 120 | Minimum bars before first score |
| `WALK_FORWARD_STRIDE` | 10 | Retrain every 10 bars (speed/accuracy tradeoff) |

### Step 4 — Quality Gates (`passes_quality_gates`)

Signals must pass **multiple filter layers** before appearing on the dashboard:

**Standard BUY (All NSE tab):**
- `prob_up ≥ 0.55` (55%+ ML confidence)
- `volume_ratio ≥ 0.5` (volume confirms momentum)
- RSI between 40–75 (not overbought, not oversold)
- MACD histogram positive
- EMA20 slope positive (uptrend)
- ADX ≥ 20 (trend is established, not choppy)
- Nifty 50 index must be in bullish regime
- Weekly chart must be bullish (higher timeframe alignment)
- Delivery % above threshold (institutional buying)

**High Conviction BUY (HC tab) — additional gates:**
- `prob_up ≥ 0.72` (72%+ ML confidence — strict filter)
- `volume_ratio ≥ 1.5` (1.5× average volume spike)
- High ATR (high volatility = more movement potential)
- `price_vs_52w` — not already at 52-week high

### Step 5 — Signal Output

Signals passing all gates are written to `signals_ledger.json` with:
- Entry price (previous day's close)
- Target price (`Entry + 5×ATR`)
- Stoploss price (`Entry − 2×ATR`)
- Confidence score (ML probability)
- Volume ratio
- Sector classification
- Feature snapshot (full indicator state at signal time)

---

## How the LLM Layer Works

The LLM (Large Language Model) layer is a **non-blocking enhancement** on top of the ML signals. It uses:

- **Primary:** [Groq](https://groq.com) — `llama-3.3-70b-versatile` (~100ms latency)
- **Fallback:** [OpenRouter](https://openrouter.ai) — `anthropic/claude-3-haiku`
- **Key rotation:** Reads `GROQ_API_KEY_1..5` and `OPENROUTER_API_KEY_1..2` for load balancing

The LLM is used in **four distinct ways**:

### 1. Signal Rationale (Per-signal commentary)

When a BUY signal is generated, the LLM writes a 2-sentence explanation of *why* this specific setup is interesting, given the indicator values.

**Input to LLM:**
```
RSI: 58.3, MACD Hist: +0.42, ADX: 28.1, BB%: 0.61,
Volume: 1.8× average, Stoch K: 62.4
Top SHAP features: volume_ratio (0.31), rsi (0.22), adx (0.18)
```

**Output:**
> "RELIANCE is showing strong volume confirmation (1.8× average) with RSI in the healthy 55-65 momentum zone. The positive MACD histogram and ADX above 25 confirm an established uptrend with room to run."

This is cached to disk so repeated requests for the same signal don't re-query the API.

### 2. Regime Commentary (Market-wide context)

Before displaying the dashboard, the LLM generates a brief market context note covering:
- Current Nifty trend (bullish/bearish/sideways)
- Recent sector rotations
- Signal count and recent win rate
- Sectors to favour vs avoid

**Input:** Nifty % change, top/bottom sectors, signal count, recent 10-trade win rate  
**Output:** 2-3 sentence market summary (under 100 words)

### 3. Trade Post-Mortem (After trade closes)

When `OutcomeTracker` detects a trade has hit its **target or stoploss**, it fires an **async background thread** that:

1. Retrieves the **feature snapshot** saved at signal time (full indicator state)
2. Sends a post-mortem request to the LLM:

```
RELIANCE — WIN (+7.2%) in 23 days
Entry indicators: RSI 58, ADX 28, MACD +0.42, Volume 1.8×
Which indicator gave the correct signal?
```

**LLM Output:**
> "The volume ratio (1.8×) was the primary correct signal here — institutional buying confirmed the breakout. RSI in the healthy momentum zone (58) supported the thesis. The 23-day hold suggests the trend was established and orderly."

Post-mortems are saved to `postmortem_log.json` and displayed in the **Adaptive Engine** tab.

### 4. Gate Suggestions (Automatic threshold improvement)

When win rate drops below **55%** over recent trades, the LLM is asked to suggest tighter quality gate values:

**Input:**
```
Current win rate: 48.3% | Avg confidence on losses: 57.1%
Current gates: {"rsi_min": 40, "rsi_max": 75, "adx_min": 20}
Suggest improved gate values as JSON.
```

The LLM returns new gate values (e.g., raise `rsi_min` to 45, raise `adx_min` to 25) which are then fed into the `AdaptiveQualityGates` system.

### LLM Caching

To avoid redundant API calls:
- In-memory cache: `_RATIONALE_CACHE` dict keyed by hash of system+user prompts
- Disk cache: `backend/data/llm_cache/` — per-signal JSON files
- Regime commentary is **not** cached (always fresh)
- Post-mortems and gate suggestions are **not** cached (always unique)

---

## How the Adaptive Self-Learning Engine Works

The adaptive engine (`adaptive_engine.py`) is TradeFlex's **self-improvement loop**. It runs after every scan and continuously tunes signal accuracy over time.

### Components

#### 1. `OutcomeTracker` — Trade closure detection

Scans the ledger for signals generated in the last 30 days. For each signal:
- Fetches post-entry price data from Yahoo Finance
- Checks if **high ≥ target** (WIN) or **low ≤ stoploss** (LOSS)
- Records outcome, days held, regime at entry, RSI, ADX, MACD
- Triggers **incremental model retraining** for that specific symbol
- Fires **async LLM post-mortem** in a background thread

#### 2. `ThresholdCalibrator` — Dynamic probability cutoffs

After 50+ closed trades are recorded, a **Logistic Regression** is fitted on historical `(confidence, volume_ratio) → outcome` pairs. It finds the probability threshold that achieves >55% precision:

```
best_thresh = 0.55
for th in [0.50, 0.55, 0.60, ... 0.90]:
    if precision(th) > 0.55:
        best_thresh = th  # raise the bar
        break

return {
    HC_PROB_UP: min(best_thresh + 0.10, 0.80),
    STD_PROB_UP: best_thresh
}
```

**Effect:** If the model has been over-confident lately (high confidence scores but losses), the threshold automatically rises, reducing signal frequency but improving quality.

#### 3. `AdaptiveQualityGates` — Indicator range optimization

Grid-searches over RSI and ADX ranges using the outcome log to find the combination with the best **profit factor** (wins / losses):

```
Grid search:
  rsi_min in [35, 40, 45]
  rsi_max in [70, 75, 80]
  adx_min in [15, 20, 25]

Best gates saved to adaptive_gates.json
Applied on next scan cycle
```

#### 4. `PerformanceMonitor` — Circuit breaker

- **Retrain warning:** If 50-trade win rate drops below **45%**, logs a warning and triggers retraining
- **Circuit breaker:** If 20-trade win rate drops below **40%**, **halts all signal generation** until manually reset
- **Manual kill switch:** `/api/kill_switch` POST endpoint; creates `kill_switch.json` to override all scanning

#### 5. `FeatureSnapshotStore` — Entry-time memory

Every time a signal is generated, the **full indicator state** (RSI, ADX, MACD, volume ratio, BB%B, Stoch K, regime) is saved to `feature_snapshots.json`. This allows:
- LLM post-mortems to know *what the model saw* when it fired
- Incremental retraining to reproduce the exact training context
- Future causal attribution (which indicators predict wins vs losses)

#### 6. `MultibaggerFeedback` — Cross-system bonus

Stocks that appear in the Multibagger scanner (long-term compounding candidates) receive a **+0-5% probability bonus** when the ML scanner also generates a signal for them. Score of 50-100 → 0.0-0.05 bonus:

```python
bonus = min(((mb_score - 50) / 50) * 0.05, 0.05)
final_prob = ml_prob + bonus
```

#### 7. `SHAPMonitor` — Feature importance tracking

Uses SHAP (SHapley Additive exPlanations) to compute which features are driving the model's decisions. Top 5 features are logged to `shap_history.json` after each scan and included in LLM signal rationale prompts.

### Full Improvement Loop

```
Daily Scan
    │
    ├─→ Generate signals (ML + quality gates)
    │       └─→ Save feature snapshots
    │       └─→ LLM rationale attached to each signal
    │
    ├─→ OutcomeTracker (closed trade detection)
    │       └─→ Record WIN/LOSS to outcome_log.csv
    │       └─→ Incremental model retraining per symbol
    │       └─→ LLM post-mortem (async background thread)
    │
    ├─→ ThresholdCalibrator
    │       └─→ Recalibrate prob_up thresholds from outcomes
    │
    ├─→ AdaptiveQualityGates.optimize()
    │       └─→ Grid-search RSI/ADX ranges → save adaptive_gates.json
    │
    └─→ PerformanceMonitor
            └─→ Circuit breaker check (halt if win rate < 40%)
            └─→ Retrain trigger (if win rate < 45%)
```

---

## Multibagger Engine

The Multibagger engine (`multibagger_model.py`) is a **separate, independent** scoring system for identifying stocks with long-term compounding potential — independent of the swing ML model.

### Scoring (0–100 composite score)

| Component | Max Points | Logic |
|-----------|------------|-------|
| **R² of log-price vs time** | 40 pts | Smooth exponential uptrend → high score |
| **Volume accumulation** | 25 pts | Volume on up-days vs down-days ratio |
| **Return / Max Drawdown** | 20 pts | High gain with shallow drawdown = efficient trend |
| **Raw momentum (1yr return)** | 15 pts | Total return over 252 sessions |

**Hard gates before scoring:**
- Minimum 120 bars in scoring window
- 200+ bars fetched overall
- Positive log-price slope over 252-day window
- Total return > 5%

### Live Scan
- Scores all symbols in the universe in parallel (`ThreadPoolExecutor`)
- Returns top 20 ranked by score
- Results cached with timestamp; `?refresh=true` forces re-scan

### Time-Machine Backtest
- Truncates all data to `target_date`
- Scores universe *as of that date*
- Measures forward returns from `target_date` onward
- Compares against Nifty 50 benchmark (`^NSEI`)

---

## Dashboard Tabs Explained

| Tab | Description | Signal Threshold |
|-----|-------------|-----------------|
| 🎯 **High Conviction** | Strictest filter — rare but highly reliable | prob_up ≥ 72%, volume ≥ 1.5× |
| 🚀 **All NSE Buys** | Broader scan — more signals | prob_up ≥ 55%, volume ≥ 0.5× |
| ⚡ **Active Signals** | Signals still open (no TP/SL hit yet) | Filter by NSE / HC / Both |
| 🏆 **Multibagger** | Long-term compounding candidates | Score ≥ 55 (live), ≥ 40 (backtest) |
| ⭐ **My Watchlist** | Your bookmarked stocks (star icon on cards) | Manual |
| 💼 **My Portfolio** | Logged trades with P&L tracking | Manual |
| 📋 **Signal History** | All opened trades with qty and entry price | Manual log |
| 📊 **Historical Summary** | Heatmap of all past signals by date | — |
| 🧮 **Budget Planner** | Position sizing based on capital | — |
| 🤖 **Model Performance** | Adaptive engine status + LLM post-mortems | — |
| 🇺🇸 **USA Full Grid** | NYSE stock signals | prob_up ≥ 55% |

---

## How to Use Signals

### Entry
The **ENTRY** price on a card = previous day's closing price. It is not a strict limit — if the live market price is **at or below** entry, that is an ideal entry point.

> **Example:** Card shows ENTRY ₹3,669. Live price is ₹3,600. Buy at ₹3,600 — you get a better R:R ratio since target stays the same.

⚠️ If a stock gaps down 5-10% due to fundamental news (earnings, regulatory action), the AI pattern may be invalidated — use caution.

### Exits
- **TARGET:** Place a GTT Limit Sell order at the exact target price shown
- **STOPLOSS:** Honor it strictly. If price closes near or below stoploss, exit the trade

### Risk per Trade
- Never risk more than **1-2% of total capital** on a single trade
- The Budget Planner tab calculates optimal position size automatically

### Signal Priority
1. **High Conviction** signals first — these pass the most gates
2. **All NSE Buys** second — when HC is empty or for diversification
3. **Multibagger** — longer-term positions (weeks to months hold)

---

## Recent Changes (v5.0)

### UI / UX
- **Removed India All Grid tab** — sidebar decluttered; only US Full Grid remains alongside NSE-specific tabs
- **Multibagger buttons** (Live Predictions / Historical Proof) — now use theme-aware CSS variables, fully visible on both dark and warm themes
- **Watchlist feature** — star icon (☆/⭐) added to all stock cards; click to add/remove; persists to localStorage; "My Watchlist" tab shows bookmarked stocks
- **Signal History redesigned** — now shows all manually logged trades with Quantity, Entry Price, Total Investment, Date, Exit Price, and P&L; "Close Position" and delete actions included
- **Log Trade button** — added to all stock card variants (HC, NSE, Active, Multibagger, US)

### Backend / Data
- **Ticker banner fixed** — `/api/market_ticker` now directly fetches live prices from yfinance for all 13 symbols (NIFTY 50, BANKNIFTY, SENSEX, RELIANCE, TCS, HDFCBANK, ICICIBANK, INFY, SBIN, ITC, LT, KOTAKBANK, BAJFINANCE) with **1-hour caching**. Previously showed "- -" because it relied on stock scans to populate the cache
- **NSE/HC toggle on Active Signals** — filter toggle to show NSE Only, HC Only, or Both for active signals; fixes inconsistent count bug

### Bug Fixes
- Fixed active signals count inconsistency (21 vs 58 depending on tab navigation order) by introducing `activeFilter` state
- Fixed multibagger timestamp not showing after refresh (`res.timestamp || res.last_updated` fallback)
- Fixed `amountPerTrade = 0` incorrectly filtering out all signals from historical summary
- Fixed "Log Trade" button missing from stock cards in NSE and HC tabs

---

## Deployment Guide

### Prerequisites
- Oracle Cloud VM (Ubuntu) with Docker installed
- SSH key at `c:\Users\kspoo\Desktop\Keys\ssh-key-2026-03-29 (1).key`
- VM IP: `129.159.226.235`

### Deploy Frontend

```powershell
# Build
cd c:\Users\kspoo\Desktop\SWINGMASTER\frontend
npm run build

# Package
cd dist
tar -czf ..\tradeflex-deploy.tar.gz *

# Upload and deploy
scp -i "c:\...\key" tradeflex-deploy.tar.gz ubuntu@129.159.226.235:/tmp/
ssh -i "c:\...\key" ubuntu@129.159.226.235 "
  mkdir -p /tmp/tradeflex-dist &&
  tar -xzf /tmp/tradeflex-deploy.tar.gz -C /tmp/tradeflex-dist &&
  docker cp /tmp/tradeflex-dist/. swingmaster-frontend:/usr/share/nginx/html/ &&
  rm -rf /tmp/tradeflex-dist /tmp/tradeflex-deploy.tar.gz
"
```

### Deploy Backend

```powershell
scp -i "c:\...\key" backend/main.py ubuntu@129.159.226.235:/tmp/main.py
ssh -i "c:\...\key" ubuntu@129.159.226.235 "
  docker cp /tmp/main.py swingmaster-backend:/app/main.py &&
  docker restart swingmaster-backend
"
```

### Environment Variables (Backend Container)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY_1..5` | Groq API keys for LLM (round-robin) |
| `OPENROUTER_API_KEY_1..2` | OpenRouter fallback keys |
| `GROQ_MODEL` | Default: `llama-3.3-70b-versatile` |
| `OPENROUTER_MODEL` | Default: `anthropic/claude-3-haiku` |
| `LLM_SIGNAL_RATIONALE` | `true`/`false` — enable per-signal LLM commentary |
| `LLM_REGIME_COMMENTARY` | `true`/`false` — enable market context commentary |
| `LLM_POSTMORTEM` | `true`/`false` — enable trade post-mortems |
| `API_KEY` | Backend API key for protected endpoints |

### Login Credentials

| Field | Value |
|-------|-------|
| Username | `Kaushik` |
| Password | `TradeFlex@1018` |

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS v4, Recharts |
| **Backend** | FastAPI (Python 3.11) |
| **ML Engine** | XGBoost (primary), Scikit-Learn Random Forest (fallback) |
| **Feature Importance** | SHAP (SHapley Additive exPlanations) |
| **Backtesting** | VectorBT |
| **Market Data** | Yahoo Finance via `yfinance` |
| **LLM Primary** | Groq (`llama-3.3-70b-versatile`) |
| **LLM Fallback** | OpenRouter (`claude-3-haiku`) |
| **Containerization** | Docker (two containers: `swingmaster-frontend`, `swingmaster-backend`) |
| **Web Server** | Nginx (frontend), Uvicorn (backend) |
| **Deployment** | Oracle Cloud VM (Ubuntu 22.04) |
| **Data Storage** | JSON flat files + CSV (no external DB required) |

---

## Key Data Files

| File | Contents |
|------|---------|
| `backend/data/signals_ledger.json` | All historical signals with entry/target/SL |
| `backend/data/outcome_log.csv` | Closed trade outcomes (WIN/LOSS) with indicators |
| `backend/data/feature_snapshots.json` | Full indicator state at signal generation time |
| `backend/data/postmortem_log.json` | LLM-generated trade post-mortems |
| `backend/data/adaptive_gates.json` | Current optimised RSI/ADX gate values |
| `backend/data/ticker_cache.json` | Cached ticker prices (1-hour TTL) |
| `backend/data/llm_cache/` | Per-signal LLM rationale cache (disk) |
| `backend/data/shap_history.json` | Top-5 SHAP feature importance over time |
| `backend/data/mb_affinity.json` | Multibagger affinity scores for ML bonus |

---

*Previous release notes: [README_v2.3.md](README_v2.3.md)*
