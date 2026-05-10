# Implementation Plan: IN / US Market Tab Toggle

**Version:** For v5.5 (proposed)  
**Scope:** Frontend only — backend already complete  
**Risk to existing setup:** Zero — purely additive, no existing logic removed

---

## 1. Current State (What Already Exists)

### Backend — 100% complete
| Endpoint | Status |
|----------|--------|
| `/api/us_buys` | ✅ Live — 60+ US stocks, same ML pipeline |
| `/api/us_high_conviction` | ✅ Live — strict gate same as NSE HC |
| `/api/us_refresh` | ✅ Live — protected refresh trigger |
| `/api/stock_detail_us/{symbol}` | ✅ Live — AI detail panel |
| `data/us_signals_ledger.json` | ✅ Live — persistent US ledger |
| `data/us_ticker_cache.json` | ✅ Live — USD price banner |

### Frontend — Partial
| Thing | Status |
|-------|--------|
| `US_BUYS` and `US_HC` market states in App.jsx | ✅ Exist — data fetching works |
| US HistoryPanel rendering | ✅ Exists — renders with USD |
| US StockCards (currency="$") | ✅ Exists |
| **Sidebar nav items for US_BUYS / US_HC** | ❌ Missing — removed in v5.1 cleanup |
| **IN/US top-level toggle tab** | ❌ Missing — no way to switch |
| **US signal counts in sidebar** | ❌ Missing |
| **US scan status / NiftyRegimeBanner equivalent** | ❌ Missing |

**Conclusion:** The backend and rendering logic are ready. The only gap is the **navigation UI** — the user has no way to reach US_BUYS or US_HC from the sidebar.

---

## 2. Proposed UX — IN / US Toggle

### Design concept
A **market toggle** sits at the **top of the sidebar**, above the SCANNER group. It switches the entire sidebar context between Indian and US markets.

```
┌─────────────────────────┐
│  [🇮🇳 India] [🇺🇸 US]    │  ← toggle at top of sidebar
├─────────────────────────┤
│  SCANNER                │
│  ○ High Conviction  [3] │  ← changes to US HC when US selected
│  ○ All NSE/US Buys  [7] │  ← changes to US Buys when US selected
│  ○ Active Signals   [4] │  ← shared (or future: per-market)
│  ○ Multibagger          │  ← India only (greyed out in US mode)
│                         │
│  TOOLS                  │
│  ○ Model Performance    │
│  ○ My Watchlist         │
│  ... (unchanged)        │
└─────────────────────────┘
```

When **US** is selected:
- Scanner items relabel: `All NSE Buys` → `All US Buys`, `High Conviction` → `US High Conviction`
- Scanner item IDs switch: `HC` → `US_HC`, `NSE_BUYS` → `US_BUYS`
- Multibagger is India-only → shown greyed out with tooltip "India only"
- Active Signals shows India signals regardless (no US active signals tracking yet)
- All TOOLS items remain identical

When **India** is selected (default):
- Everything exactly as today — zero change

### Main content area
No change to how content renders — the existing `market === 'US_BUYS'` and `market === 'US_HC'` blocks already work. The toggle just routes to those market IDs.

A **small flag + label banner** appears at the top of main content when US is active:
```
🇺🇸 US Market  •  60 stocks  •  NYSE/NASDAQ  •  Prices in USD
```

---

## 3. Exact Code Changes

### 3a. `Sidebar.jsx` — add `marketRegion` toggle prop

```jsx
// New prop: marketRegion = 'IN' | 'US', setMarketRegion
export default function Sidebar({ market, setMarket, marketRegion, setMarketRegion, ... }) {

  // Toggle bar at top:
  <div style={{ display:'flex', gap:4, padding:'16px 16px 0' }}>
    <button onClick={() => { setMarketRegion('IN'); setMarket('HC'); }}
      style={{ flex:1, active: marketRegion==='IN' }}>
      🇮🇳 India
    </button>
    <button onClick={() => { setMarketRegion('US'); setMarket('US_HC'); }}
      style={{ flex:1, active: marketRegion==='US' }}>
      🇺🇸 US
    </button>
  </div>

  // Scanner items become dynamic:
  const SCANNER_ITEMS = marketRegion === 'US' ? [
    { id: 'US_HC',    label: 'US High Conviction', icon: '🎯', badge: usHcCount },
    { id: 'US_BUYS',  label: 'All US Buys',        icon: '🇺🇸', badge: usCount  },
    { id: 'ACTIVE_SIGNALS', label: 'Active Signals', icon: '📡', badge: activeCount },
    { id: 'MULTIBAGGER', label: 'Multibagger', icon: '🏆', disabled: true, title: 'India only' },
  ] : [
    // existing India items — unchanged
  ];
}
```

### 3b. `MainApp` — add `marketRegion` state + pass to Sidebar

```jsx
const [marketRegion, setMarketRegion] = useState('IN')
// persist to localStorage too:
// localStorage.getItem('swing_region') || 'IN'
```

Pass new props to Sidebar:
```jsx
<Sidebar
  marketRegion={marketRegion}
  setMarketRegion={setMarketRegion}
  usHcCount={usHcData.length}
  usCount={usData.length}
  ... existing props unchanged
/>
```

### 3c. `MainApp` — US region banner in main content

```jsx
{marketRegion === 'US' && (
  <div style={{ /* small info bar */ }}>
    🇺🇸 US Market  •  NYSE / NASDAQ  •  Prices in USD  •  {usData.length} signals
  </div>
)}
```

### 3d. Sector nav pills — hide in US mode
```jsx
{trendingSectors.length > 0 && marketRegion === 'IN' && market !== 'BUDGET' && ... (
  // sector pills — unchanged, just hidden for US
)}
```

### 3e. NiftyRegimeBanner — hide in US mode
Already only renders in HC and NSE_BUYS blocks — no change needed.

---

## 4. What Does NOT Change

| Thing | Why untouched |
|-------|--------------|
| All existing NSE/HC/India rendering | `marketRegion === 'IN'` is default |
| Backend endpoints | Zero changes |
| HistoryPanel, StockCards, BudgetPlanner | Identical — already handle currency='$' |
| Portfolio, Watchlist, Signal History | Shared between regions |
| All TOOLS sidebar items | Region-independent |
| Win rate, P&L logic | Unchanged |
| US data fetching logic | Already works — just unreachable via UI |

---

## 5. Files to Modify

| File | Change | Lines est. |
|------|--------|------------|
| `frontend/src/components/Sidebar.jsx` | Add toggle bar, dynamic scanner items, disabled Multibagger in US mode | ~40 new lines |
| `frontend/src/App.jsx` | Add `marketRegion` state + localStorage; pass to Sidebar; add US banner; hide sector pills in US mode | ~20 new lines |

**Total: ~60 lines across 2 files. Zero deletions of existing logic.**

---

## 6. What This Unlocks Immediately vs Later

### Immediately on completion
- Users can toggle between 🇮🇳 India and 🇺🇸 US with a single click
- US High Conviction and US All Buys are fully accessible with signal counts
- Historical heatmap, P&L stats, signal cards all work in USD
- Clean visual distinction — flag banner + sidebar label change

### Future additions (separate releases)
- **Active Signals for US** — track open US positions
- **Multibagger for US** — long-term US stock scanner
- **US Budget Planner** — dollar-amount based position sizing
- **US NiftyRegime equivalent** — S&P 500 / QQQ regime banner (bearish suppression)
- **US qty/amount P&L** — fractional share support for USD P&L

---

## 7. Open Questions

1. **Should switching region reset to the region's default tab?**  
   My plan: India → `HC`, US → `US_HC`. Feels natural.

2. **Should `marketRegion` persist across page refresh?**  
   My plan: yes, via `localStorage('swing_region')`.

3. **Active Signals in US mode** — show only India active signals, or hide the Active Signals item entirely?  
   My plan: keep it, show India active signals (US active tracking is a future feature).

4. **Multibagger in US mode** — grey it out with "India only" label, or hide completely?  
   My plan: grey out with tooltip, so user knows it exists but isn't available for US yet.
