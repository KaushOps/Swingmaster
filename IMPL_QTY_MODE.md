# Implementation Plan: Combined Qty + Amount Gate

**Version:** v2 (revised after user clarification)

---

## 1. The Revised Logic (Plain English)

Both `qty` and `amount` are controls that work **together**, not as separate modes:

- **`qtyPerTrade`** (default: `1`) — how many shares to buy per signal
- **`amountPerTrade`** (default: `₹10,000`) — the **maximum price gate**: skip a signal if `entry × qtyPerTrade > amountPerTrade`

### Default behaviour (1 qty, ₹10,000 gate)
```
Stock: RELIANCE @ ₹1,463
  → 1 qty × ₹1,463 = ₹1,463 ≤ ₹10,000  ✅ Include, P&L = price_move × 1

Stock: MRF @ ₹1,32,000
  → 1 qty × ₹1,32,000 = ₹1,32,000 > ₹10,000  ❌ Skip

Stock: HDFCBANK @ ₹779
  → 1 qty × ₹779 = ₹779 ≤ ₹10,000  ✅ Include
```

### If user raises amount to ₹1,00,000
```
Stock: MRF @ ₹1,32,000
  → 1 qty × ₹1,32,000 = ₹1,32,000 > ₹1,00,000  ❌ Still skip

Stock: ABB @ ₹6,200
  → 1 qty × ₹6,200 = ₹6,200 ≤ ₹1,00,000  ✅ Now included (was skipped at ₹10,000)
```

### If user raises amount to ₹2,00,000
```
Stock: MRF @ ₹1,32,000
  → 1 qty × ₹1,32,000 ≤ ₹2,00,000  ✅ Now included
```

### If user raises qty to 5 with amount ₹10,000
```
Stock: RELIANCE @ ₹1,463
  → 5 qty × ₹1,463 = ₹7,315 ≤ ₹10,000  ✅ Include, P&L = price_move × 5

Stock: HDFCBANK @ ₹779
  → 5 qty × ₹779 = ₹3,895 ≤ ₹10,000  ✅ Include

Stock: TCS @ ₹2,431
  → 5 qty × ₹2,431 = ₹12,155 > ₹10,000  ❌ Skip (was included at qty=1)
```

---

## 2. The Filter Rule (Single Unified Formula)

```
// Include signal if:  qtyPerTrade × signal.entry  <=  amountPerTrade
const canAfford = (signal) => (qtyPerTrade * signal.entry) <= amountPerTrade;

// P&L for included signals:
const pnl_target   = (signal.target   - signal.entry) * qtyPerTrade;
const pnl_stoploss = (signal.stoploss - signal.entry) * qtyPerTrade;
const cost         = signal.entry * qtyPerTrade;
```

This **replaces** the current `Math.floor(amountPerTrade / stock.entry)` approach entirely.

---

## 3. What Changes in the Code

### 3a. `MainApp` — new state, defaults persisted to localStorage
```js
const [qtyPerTrade, setQtyPerTrade]   = useState(() => Number(localStorage.getItem('swing_qty')) || 1)
const [amountPerTrade, setAmountPerTrade] = useState(() => Number(localStorage.getItem('swing_amount')) || 10000)
// persist on change:
useEffect(() => localStorage.setItem('swing_qty',    qtyPerTrade),    [qtyPerTrade])
useEffect(() => localStorage.setItem('swing_amount', amountPerTrade), [amountPerTrade])
```

### 3b. `HistoryPanel` — updated filter + P&L

**Old filter (remove):**
```js
.filter(s => s.entry > 0 && s.entry <= safeAlloc)   // ← floor division approach
```
**New filter:**
```js
.filter(s => s.entry > 0 && (qtyPerTrade * s.entry) <= amountPerTrade)
```

**Old P&L (remove):**
```js
const qty = Math.floor(safeAlloc / stock.entry);
pnl += (target - entry) * qty
cost += qty * entry
```
**New P&L:**
```js
const qty = qtyPerTrade;   // fixed qty, no floor division
pnl += (target - entry) * qty
cost += qty * entry
```

### 3c. `HistoryPanel` inline controls — show BOTH inputs

Currently shows only `₹/Trade`. New UI shows both side by side:
```
Qty: [1] [Apply]   Max ₹: [10,000] [Apply]
```
Both are always visible and editable. The gate label updates:
```
"Per trade: {qty} share(s) × entry price ≤ ₹{amount}"
```

### 3d. `BudgetPlanner` — update qty display

```js
// Old:
const qty = Math.floor(amountPerTrade / s.entry);

// New:
const qty = qtyPerTrade;  // fixed qty; signal is already pre-filtered by canAfford
const capitalUsed = qty * s.entry;
```
Label changes from `"Position Sizing (Flat ₹{amountPerTrade})"` to `"Position Sizing ({qty} qty × entry)"`.

### 3e. Props threading — add `qtyPerTrade` + `setQtyPerTrade` to:
- `HistoryPanel` (×2 — NSE + HC)
- `BudgetPlanner`

---

## 4. What Does NOT Change

| Thing | Reason |
|-------|--------|
| Win rate %, Expectancy R, Profit Factor | Pure ratios — no qty involved |
| Backend, ledger, signals data | Zero backend changes needed |
| Signal deduplication logic | Unchanged |
| BudgetPlanner "Max Trade Slots" | Becomes `floor(budgetCapital / (qty × avg_entry))` — still meaningful |

---

## 5. Impact on Metrics

### ✅ Accuracy / profitability ratios — completely unaffected
Win rate, Expectancy R, Profit Factor are count-based ratios. Qty has zero effect.

### ⚠️ Display-only changes
| Metric | Before (₹10k / floor) | After (1 qty, ₹10k gate) |
|--------|----------------------|--------------------------|
| Est. P&L | `(move × floor(10000/entry))` | `move × 1` |
| Cost/trade | `floor(10000/entry) × entry` | `entry × 1` (just the stock price) |
| Signal count | All signals where `entry ≤ 10000` | All signals where `1 × entry ≤ 10000` (same result at qty=1) |

At **qty=1, amount=₹10,000**: the filter result is identical to the old `entry ≤ 10000` filter. The only change is P&L is smaller (1 share instead of floor(10000/entry) shares). This is more realistic.

### 🔍 Key implication
At default settings (qty=1, ₹10k), RELIANCE (₹1,463) gets **1 share** instead of `floor(10000/1463) = 6 shares`. P&L per signal is more conservative and realistic.

---

## 6. Files to Modify

| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add `qtyPerTrade` state + localStorage; update filter formula; update P&L calc; add qty input to HistoryPanel controls; update BudgetPlanner |

**No backend changes. No ledger changes. Estimated scope: ~60 lines in 1 file.**

---

## 7. Future: US Stocks P&L Mode (Save for Later)

US stocks behave differently from Indian markets:
- **Fractional shares** are supported on most US brokers (Robinhood, Schwab, etc.)
- "Buy $X worth" is a natural and valid US trading concept
- The `floor(amount / entry)` formula **makes sense for US stocks**

When implementing US historical P&L (currently not in the app), use:
```js
// US stocks — amount-based (fractional shares allowed)
const qty = amountPerTrade / signal.entry;          // no floor() — fractions OK
const cost = amountPerTrade;                         // always exactly the amount
const pnl  = (target - entry) / entry * amountPerTrade;  // % gain × capital

// OR whole-share US mode (for brokers without fractional):
const qty = Math.floor(amountPerTrade / signal.entry);
```

The NSE qty-first approach and US amount-first approach should be separate settings
once US historical P&L is built out. The `amountPerTrade` state can be reused for US.
