# Swingmaster v2.3 — What changed and why it is better

**Git tag:** `v2.3-stable`  
This document summarizes the logic and consistency improvements shipped in v2.3 compared to earlier 2.x builds.

---

## Why v2.3 is better (high level)

| Area | Before (typical 2.2 and earlier) | v2.3 |
|------|----------------------------------|------|
| **Probability scores on history** | The model was trained on almost all bars, then probabilities were computed for the **same** bars the model had already seen. Historical “confidence” was **in-sample** and could look stronger than reality. | Probabilities use **stride walk-forward** refitting: each bar is scored with a model trained **only on prior data** (with periodic refits every 10 bars after a minimum history). Historical signals are **much closer to true out-of-sample behavior**. |
| **What the model learns vs what you trade** | Training labels used a **2×ATR target / 1.5×ATR stop** and a 40-day window, while the app showed **5×ATR target / 2×ATR stop** and the vectorbt backtest used 5R/2R. The classifier was not aligned with the risk/reward you actually see on cards. | Labels use **5×ATR target, 2×ATR stop**, and a **60-session lookahead**, matching **live levels** and **`run_backtest`** in the backend. The model’s objective matches the product. |
| **Ledger vs live BUY lists** | The immutable ledger could record rows that passed ML + volume (and HC ATR rules) **without** the same **quality gates** (MACD, RSI band, EMA20, ADX, 52-week proximity) or **today-only** filters (Nifty regime, weekly trend, delivery %). History and “live” could disagree. | Ledger writes require **`passes_quality_gates(row)`** for **every** date. For the **latest bar only**, entries also require **`market_bullish`**, **`weekly_ok`**, and **`delivery_ok`**—the same idea as the live BUY / STRONG BUY paths. |
| **Backtest error handling** | If vectorbt raised, the API could report **`final_value: 100000`** even when the US scan used a different **`init_cash`** (e.g. 1200), distorting summaries. | **`final_value`** falls back to **`init_cash`** on error. |
| **XGBoost compatibility** | Older kwargs could trigger deprecation warnings on newer XGBoost. | **`use_label_encoder`** is only passed if the installed **`XGBClassifier`** supports it. |

---

## Walk-forward logic

The NSE universe scanner and sheet-driven **`/api/scan`** path use a **classifier** (`SwingModel`: XGBoost if available, else Random Forest) on engineered indicators. Training uses **`create_labels`**, which still looks **ahead** in time to mark whether price hit target before stop within a fixed window—that is standard **supervised** training data, not live inference.

**Walk-forward applies only to how probabilities are produced for each past bar:** so historical “confidence” is not computed with a model that already memorized that same bar.

### What problem it solves

If you train once on `df[:-1]` and call `predict_proba(df)`, every row except the last was **inside the training set**. Reported probabilities on those rows are **in-sample** and tend to look better than what you would get in real trading, where you only know the past.

### Algorithm (`predict_proba_walk_forward_stride`)

Implementation: [`backend/ml_model.py`](backend/ml_model.py).

1. Initialize a series `prob_up` aligned to `df`’s index; fill with **NaN**.
2. If `len(df) <= min_train_rows` (default **120**), return (no reliable scores).
3. For each integer **`i`** from **`min_train_rows`** to **`len(df) - 1`**:
   - **Refit** a new `SwingModel` when **`i == min_train_rows`** or **`(i - min_train_rows) % stride == 0`** (default **stride 10**):
     - **Training slice:** `df.iloc[:i]` — rows with indices **`0 .. i-1` only**. Row **`i` is excluded** from training.
   - Between refits, **reuse** the model from the previous refit bar (faster; see tradeoff below).
   - Predict the **positive-class probability** for **row `i` only** and store it in `prob_up` at that index.

So at each scored bar, the model has **never** seen that bar’s features during **fit**. Leading bars stay **NaN**, so rules like `prob_up > 0.55` do not fire there.

### Stride tradeoff

- **Stride = 1:** refit every bar — closest to full walk-forward, heaviest CPU (many fits per symbol × large universe).
- **Stride = 10 (default):** refit every 10 bars; in between, the model was trained on data that ends a few bars **before** the current `i`. That is a **deliberate speed vs. strictness** compromise: still far less optimistic than scoring every bar in-sample, but not identical to refitting daily.

### Constants

| Name | Default | Meaning |
|------|---------|--------|
| `WALK_FORWARD_MIN_TRAIN` | 120 | First bar index that receives a finite `prob_up` |
| `WALK_FORWARD_STRIDE` | 10 | Refit cadence after the first fit at `min_train` |

### Where it runs

- [`main.py`](backend/main.py) — `update_universe_cache` (broad NSE + high conviction caches)
- [`main.py`](backend/main.py) — `scan_markets` (India / US lists from the sheet)

The **multibagger** pipeline below does **not** use this walk-forward step.

---

## Multibagger engine

**Module:** [`backend/multibagger_model.py`](backend/multibagger_model.py)  
**HTTP:** `GET /api/multibagger/live`, `GET /api/multibagger/backtest` (see [`main.py`](backend/main.py)).

This is a **separate** system from the swing ML scanner. There is **no** `SwingModel` / `prob_up` / ATR label training here. Instead, each stock gets a **rule-based score (0–100)** built from **price and volume behavior** over about **one trading year**.

### High-level flow

1. **Fetch** daily OHLCV (typically **2 years** for live; **5 years** when a historical `target_date` is used for backtest).
2. **Truncate** to history **on or before** `target_date` when simulating the past; forward returns use prices **after** that date.
3. **Score** the last **252** sessions (≈ 1 year) with **`calculate_multibagger_score`**.
4. **Filter** by minimum score (**55** live, **40** when `target_date` is set for backtests).
5. **Rank** all passing names by score and return the **top N** (20 live, 10 for benchmark backtest).

### Eligibility (hard gates before scoring)

- At least **120** rows in the scoring window inside `calculate_multibagger_score`.
- Live path: fetched frame must have **200+** rows (`process_symbol`).
- **Positive** slope of **log(close)** vs time over the 252-day window, and **total return > 5%** over that window. Otherwise the stock is skipped (`None`).

### What the score measures

All subscores are capped and summed; final score is capped at **99.9**.

| Component | Max points | Idea |
|-----------|------------|------|
| **R² of log-price vs time** | 40 | “Smooth” exponential-style uptrends score higher than jagged paths. |
| **Volume accumulation** | 25 | Sum of volume on **up** days vs **down** days; rewards skew toward buying pressure on green days (`(accumulation_ratio - 0.9) * 25`, clamped). |
| **Return / max drawdown** | 20 | Large gain with a **shallow** peak-to-trough drawdown in the window. |
| **Raw momentum** | 15 | Window total return, scaled and capped (200% return saturates this bucket). |

The function also reports **annualized_return** from the log-regression slope (`exp(slope * 252) - 1`), **max_drawdown**, **return_1y**, etc., for the API payload.

### Live scan (`scan_multibaggers`)

- Runs **`process_symbol`** over the symbol list in parallel (**`ThreadPoolExecutor`**, configurable `max_workers`).
- Drops `None` results; **sorts by `score` descending**; returns **`top_n`** (default **20**).

### Time-machine backtest (`run_backtest_with_benchmark`)

1. Scores the universe **as of** `target_date` (same score logic on truncated history).
2. Takes **top 10** picks.
3. **`avg_return`:** mean of each pick’s **forward_return** (first bar after `target_date` **open** → last available **close** in the sample).
4. **`nifty_return`:** same interval on **^NSEI** for a simple benchmark comparison.

This backtest is **not** the same as the swing model’s vectorbt path; it only judges whether **past** multibagger-style scores lined up with **subsequent** buy-and-hold return.

### How this differs from walk-forward swing ML

| | Swing scanner (walk-forward) | Multibagger engine |
|--|------------------------------|--------------------|
| Model | Supervised classifier (`SwingModel`) | Hand-crafted formula on price/volume |
| Training labels | ATR path hit (5R/2R, lookahead) | None (pure scoring) |
| Inference | Stride walk-forward `prob_up` | Single score on latest 252 bars |
| Use case | BUY / STRONG BUY / ledger | Long-horizon “footprint” ranking |

---

## Technical detail (for maintainers)

### 1. Training labels (`create_labels`)

- **Target:** `5.0 × ATR` (was 2.0).  
- **Stop:** `2.0 × ATR` (was 1.5).  
- **Lookahead:** `60` trading sessions (was 40).  

Constants live in [`backend/ml_model.py`](backend/ml_model.py): `LABEL_TARGET_ATR_MULT`, `LABEL_SL_ATR_MULT`, `DEFAULT_LOOKAHEAD`.  
[`main.py`](backend/main.py) calls `create_labels` with these explicitly so tuning stays in one place.

### 2. Stride walk-forward probabilities

Full step-by-step explanation: [Walk-forward logic](#walk-forward-logic).  
Implementation: **`predict_proba_walk_forward_stride`** in [`backend/ml_model.py`](backend/ml_model.py); defaults **`WALK_FORWARD_MIN_TRAIN`**, **`WALK_FORWARD_STRIDE`**.

### 3. Ledger filtering

- Helper **`ledger_entry_allowed`** in [`backend/main.py`](backend/main.py):  
  - Always: **`passes_quality_gates(row)`**.  
  - If the row date is **today’s last bar**: also **Nifty regime**, **weekly**, and **delivery** gates (same combination as live signals).

### 4. Model class rename

- **`SwingModel`** replaces the misnamed **`IntradayModel`** (daily swing logic).  
- **`IntradayModel = SwingModel`** remains as a backward-compatible alias.

### 5. Operational note

- The first full **NSE universe** scan will take **longer** than before because of repeated refits (mitigated by stride **10**, not refitting every single bar).

---

## API and deployment

- **No breaking changes** to JSON response shapes from the endpoints touched by this work.  
- Redeploy the backend as usual (e.g. Render blueprint); no separate migration for the ledger file beyond normal behavior on next scan.

---

## Related documentation

- Strategy context and optional future ideas: [`SWING_STRATEGY_IMPROVEMENTS.md`](SWING_STRATEGY_IMPROVEMENTS.md) (updated for v2.3 behavior in section 1.3 and the implementation note).

---

## Quick links

- Repository: [KaushOps/Swingmaster](https://github.com/KaushOps/Swingmaster)  
- Create a GitHub **Release** from tag **`v2.3-stable`** if you want release notes mirrored on the Releases tab.
