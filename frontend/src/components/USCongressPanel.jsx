import { useState, useEffect, useMemo, useRef } from 'react';

const BUY_COLOR  = '#39ff8f';
const SELL_COLOR = '#ff3b3b';
const ACCENT     = '#38bdf8';

const AMOUNT_RANK = {
  '$1,001 - $15,000':         1,
  '$15,001 - $50,000':        2,
  '$50,001 - $100,000':       3,
  '$100,001 - $250,000':      4,
  '$250,001 - $500,000':      5,
  '$500,001 - $1,000,000':    6,
  '$1,000,001 - $5,000,000':  7,
  'Over $5,000,000':          8,
};

/* ── Stat pill ── */
function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: color || 'var(--text-bright)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

/* ── Side badge ── */
function SideBadge({ isBuy }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 5, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em',
      background: isBuy ? 'rgba(57,255,143,0.13)' : 'rgba(255,59,59,0.13)',
      color: isBuy ? BUY_COLOR : SELL_COLOR,
      border: `1px solid ${isBuy ? BUY_COLOR + '44' : SELL_COLOR + '44'}`,
    }}>{isBuy ? 'BUY' : 'SELL'}</span>
  );
}

/* ── Senator detail drawer ── */
function SenatorDrawer({ senator, trades, onClose }) {
  const [tradeFilter, setTradeFilter] = useState('ALL');
  const [sortBy, setSortBy]           = useState('date');
  const [tickerFilter, setTickerFilter] = useState('');

  const senatorTrades = useMemo(() => {
    let t = trades.filter(x => x.senator === senator);
    if (tradeFilter === 'BUY')  t = t.filter(x => x.is_buy);
    if (tradeFilter === 'SELL') t = t.filter(x => !x.is_buy);
    if (tickerFilter.trim()) {
      const q = tickerFilter.trim().toUpperCase();
      t = t.filter(x => x.ticker.toUpperCase().includes(q) || x.company.toUpperCase().includes(q));
    }
    if (sortBy === 'amount') t = [...t].sort((a, b) => (AMOUNT_RANK[b.amount] || 0) - (AMOUNT_RANK[a.amount] || 0));
    if (sortBy === 'ticker') t = [...t].sort((a, b) => a.ticker.localeCompare(b.ticker));
    return t;
  }, [senator, trades, tradeFilter, sortBy, tickerFilter]);

  /* per-ticker breakdown */
  const tickerBreakdown = useMemo(() => {
    const map = {};
    trades.filter(x => x.senator === senator).forEach(t => {
      const s = t.ticker;
      if (!map[s]) map[s] = { ticker: s, company: t.company, buys: 0, sells: 0, maxAmount: 0 };
      if (t.is_buy) map[s].buys++;
      else map[s].sells++;
      const rank = AMOUNT_RANK[t.amount] || 0;
      if (rank > map[s].maxAmount) { map[s].maxAmount = rank; map[s].maxAmountLabel = t.amount; }
    });
    return Object.values(map).sort((a, b) => (b.buys + b.sells) - (a.buys + a.sells));
  }, [senator, trades]);

  const allTrades  = useMemo(() => trades.filter(x => x.senator === senator), [trades, senator]);
  const allBuys    = useMemo(() => allTrades.filter(t => t.is_buy).length,  [allTrades]);
  const allSells   = useMemo(() => allTrades.filter(t => !t.is_buy).length, [allTrades]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        width: 'min(780px, 95vw)', height: '100vh', overflowY: 'auto',
        background: 'var(--bg-base)', borderLeft: `2px solid ${ACCENT}44`,
        padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: ACCENT, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Senator Profile</div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--text-bright)' }}>🏛️ {senator}</h2>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '1rem',
          }}>✕</button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 0, background: 'var(--bg-elevated)',
          borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden',
        }}>
          {[
            { label: 'Total Trades', value: allTrades.length, color: 'var(--text-bright)' },
            { label: 'Buys',         value: allBuys,           color: BUY_COLOR },
            { label: 'Sells',        value: allSells,          color: SELL_COLOR },
            { label: 'Unique Stocks', value: tickerBreakdown.length, color: ACCENT },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '16px 8px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}>
              <Stat {...s} />
            </div>
          ))}
        </div>

        {/* Buy/Sell ratio bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <span style={{ color: BUY_COLOR, fontWeight: 700 }}>Buys {allTrades.length > 0 ? Math.round(allBuys / allTrades.length * 100) : 0}%</span>
            <span style={{ color: SELL_COLOR, fontWeight: 700 }}>Sells {allTrades.length > 0 ? Math.round(allSells / allTrades.length * 100) : 0}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: `rgba(255,59,59,0.25)`, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: allTrades.length > 0 ? (allBuys / allTrades.length * 100)+'%' : '0%', background: BUY_COLOR, borderRadius: 4 }} />
          </div>
        </div>

        {/* Stock Portfolio Breakdown */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Portfolio Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {tickerBreakdown.map(t => (
              <div key={t.ticker} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 12px', borderRadius: 8,
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-bright)', minWidth: 60 }}>{t.ticker}</span>
                <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.company}</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {t.buys  > 0 && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: BUY_COLOR  }}>▲ {t.buys}×</span>}
                  {t.sells > 0 && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: SELL_COLOR }}>▼ {t.sells}×</span>}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{t.maxAmountLabel || ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade History Table */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Trade History</div>

          {/* Table filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {['ALL','BUY','SELL'].map(f => (
              <button key={f} onClick={() => setTradeFilter(f)} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                border: tradeFilter === f ? `1px solid ${ACCENT}` : '1px solid var(--border-subtle)',
                background: tradeFilter === f ? `rgba(56,189,248,0.15)` : 'transparent',
                color: tradeFilter === f ? ACCENT : 'var(--text-dim)',
              }}>{f}</button>
            ))}
            <input
              placeholder="Filter by stock…"
              value={tickerFilter}
              onChange={e => setTickerFilter(e.target.value)}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: '0.78rem',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
                color: 'var(--text-main)', outline: 'none', width: 150,
              }}
            />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: '0.78rem',
              border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
              color: 'var(--text-main)', outline: 'none', marginLeft: 'auto',
            }}>
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
              <option value="ticker">Sort: Ticker</option>
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{senatorTrades.length} trades</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                  {['Traded','Filed','Type','Ticker','Company','Amount','Owner',''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {senatorTrades.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 12px', color: 'var(--text-bright)', whiteSpace: 'nowrap', fontWeight: 600 }}>{t.transaction_date || '—'}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{t.filed_date || '—'}</td>
                    <td style={{ padding: '11px 12px' }}><SideBadge isBuy={t.is_buy} /></td>
                    <td style={{ padding: '11px 12px', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-bright)' }}>{t.ticker}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-main)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.company}</td>
                    <td style={{ padding: '11px 12px', fontWeight: 700, color: t.is_buy ? BUY_COLOR : SELL_COLOR, whiteSpace: 'nowrap' }}>{t.amount}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-main)', fontWeight: 500 }}>{t.owner || 'Self'}</td>
                    <td style={{ padding: '11px 12px' }}>
                      {t.ptr_link ? (
                        <a href={t.ptr_link} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>View ↗</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {senatorTrades.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>No trades match filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PANEL
══════════════════════════════════════════════ */
export default function USCongressPanel() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.dataset.theme === 'dark'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /* Global search */
  const [globalQ,     setGlobalQ]     = useState('');
  const [sideFilter,  setSideFilter]  = useState('ALL');
  const [view,        setView]        = useState('feed');   /* feed | senators | tickers */

  /* Senator drawer */
  const [activeSenator, setActiveSenator] = useState(null);

  /* Senator search autocomplete */
  const [senQ,      setSenQ]      = useState('');
  const [showDrop,  setShowDrop]  = useState(false);
  const senRef = useRef();

  const load = (force = false) => {
    setLoading(true); setError(null);
    fetch('/api/congress_trades')
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') { setData(res); setLastUpdated(res.timestamp); }
        else setError(res.message || 'Failed');
        setLoading(false);
      })
      .catch(e => { setError(String(e)); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  /* All raw trades from backend */
  const allTrades = useMemo(() => data?.recent_trades || [], [data]);

  /* Senator list for autocomplete */
  const senatorList = useMemo(() => {
    const set = new Set(allTrades.map(t => t.senator));
    return [...set].sort();
  }, [allTrades]);

  const senatorSuggestions = useMemo(() => {
    if (!senQ.trim()) return [];
    const q = senQ.trim().toLowerCase();
    return senatorList.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
  }, [senQ, senatorList]);

  /* Parse MM/DD/YYYY or YYYY-MM-DD → comparable string YYYY-MM-DD */
  const parseDate = (d) => {
    if (!d) return '';
    if (d.includes('-')) return d; // already YYYY-MM-DD
    const [m, day, y] = d.split('/');
    return `${y}-${m?.padStart(2,'0')}-${day?.padStart(2,'0')}`;
  };

  /* Feed: filtered + sorted by filed date desc */
  const feedTrades = useMemo(() => {
    let t = allTrades;
    if (sideFilter === 'BUY')  t = t.filter(x => x.is_buy);
    if (sideFilter === 'SELL') t = t.filter(x => !x.is_buy);
    if (globalQ.trim()) {
      const q = globalQ.trim().toLowerCase();
      t = t.filter(x =>
        x.ticker.toLowerCase().includes(q) ||
        x.senator.toLowerCase().includes(q) ||
        x.company.toLowerCase().includes(q)
      );
    }
    return [...t].sort((a, b) => parseDate(b.filed_date).localeCompare(parseDate(a.filed_date)));
  }, [allTrades, sideFilter, globalQ]);

  /* Senator leaderboard */
  const senatorStats = useMemo(() => {
    const map = {};
    allTrades.forEach(t => {
      if (!map[t.senator]) map[t.senator] = { senator: t.senator, total: 0, buys: 0, sells: 0, tickers: new Set() };
      map[t.senator].total++;
      if (t.is_buy) map[t.senator].buys++; else map[t.senator].sells++;
      map[t.senator].tickers.add(t.ticker);
    });
    return Object.values(map)
      .map(s => ({ ...s, tickers: s.tickers.size }))
      .sort((a, b) => b.total - a.total);
  }, [allTrades]);

  const topTickers = data?.top_tickers || [];

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{
        marginBottom: 20, padding: '20px 24px',
        background: dark ? 'linear-gradient(135deg,#00111f 0%,#070d14 100%)' : 'var(--bg-elevated)',
        borderRadius: 14, border: `1px solid ${ACCENT}33`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-bright)', fontWeight: 800 }}>🏛️ US Senate Stock Tracker</h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Senate only (House PDFs not machine-readable) · {data?.total_trades?.toLocaleString() || '—'} stock trades · {senatorList.length} senators · 2024–present
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {lastUpdated && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(lastUpdated).toLocaleDateString()}</span>}
            <button onClick={() => load(true)} disabled={loading} style={{
              padding: '6px 16px', borderRadius: 8, border: `1px solid ${ACCENT}`,
              background: `linear-gradient(135deg,#0369a1,${ACCENT})`, opacity: loading ? 0.5 : 1,
              color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
            }}>{loading ? '…' : '↻ Refresh'}</button>
          </div>
        </div>

        {/* KPI strip */}
        {data && (
          <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            <Stat label="Total Stock Trades" value={data.total_trades?.toLocaleString()} color={ACCENT} />
            <Stat label="Unique Senators"    value={senatorList.length}                  color="var(--text-bright)" />
            <Stat label="Unique Stocks"      value={topTickers.length + '+'}             color="var(--text-bright)" />
            <Stat label="Buys on Record"     value={allTrades.filter(t=>t.is_buy).length.toLocaleString()}  color={BUY_COLOR} />
            <Stat label="Sells on Record"    value={allTrades.filter(t=>!t.is_buy).length.toLocaleString()} color={SELL_COLOR} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 16, background: 'rgba(255,59,59,0.1)', border: '1px solid #ff3b3b44', borderRadius: 10, color: SELL_COLOR, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-dim)' }}>
          🏛️ Loading Senate disclosures…
          <div style={{ fontSize: '0.82rem', marginTop: 8, opacity: 0.6 }}>Scraping live eFD — first load takes 3–5 minutes. Cached for 6 hours after.</div>
        </div>
      )}

      {data && (
        <>
          {/* ── SENATOR SEARCH BAR ── */}
          <div style={{
            marginBottom: 20, padding: '14px 18px',
            background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)',
            display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>🔍 Search Senator</span>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }} ref={senRef}>
              <input
                placeholder="Type senator name…"
                value={senQ}
                onChange={e => { setSenQ(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                style={{
                  width: '100%', padding: '9px 14px', borderRadius: 8, fontSize: '0.88rem',
                  border: `1px solid ${ACCENT}66`, background: 'var(--bg-base)',
                  color: 'var(--text-bright)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {showDrop && senatorSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 200,
                  background: 'var(--bg-elevated)', border: `1px solid ${ACCENT}55`,
                  borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                }}>
                  {senatorSuggestions.map(s => (
                    <div key={s} onClick={() => { setSenQ(''); setShowDrop(false); setActiveSenator(s); }}
                      style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => e.currentTarget.style.background = `rgba(56,189,248,0.12)`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      🏛️ {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>or browse below</span>
          </div>

          {/* ── VIEW TABS ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { id: 'feed',     label: '📋 Trade Feed' },
              { id: 'senators', label: '👤 Senators'   },
              { id: 'tickers',  label: '🔥 Hot Tickers' },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                padding: '8px 18px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                border: view === v.id ? `1px solid ${ACCENT}` : '1px solid var(--border-subtle)',
                background: view === v.id ? `rgba(56,189,248,0.15)` : 'var(--bg-elevated)',
                color: view === v.id ? ACCENT : 'var(--text-main)',
              }}>{v.label}</button>
            ))}
          </div>

          {/* ── TRADE FEED ── */}
          {view === 'feed' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {['ALL','BUY','SELL'].map(f => (
                  <button key={f} onClick={() => setSideFilter(f)} style={{
                    padding: '5px 14px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    border: sideFilter === f ? `1px solid ${ACCENT}` : '1px solid var(--border-subtle)',
                    background: sideFilter === f ? `rgba(56,189,248,0.15)` : 'transparent',
                    color: sideFilter === f ? ACCENT : 'var(--text-dim)',
                  }}>{f}</button>
                ))}
                <input
                  placeholder="Search ticker, senator, company…"
                  value={globalQ}
                  onChange={e => setGlobalQ(e.target.value)}
                  style={{
                    marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem',
                    border: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
                    color: 'var(--text-main)', outline: 'none', minWidth: 240,
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{feedTrades.length} trades</span>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border-subtle)' }}>
                      {['Traded','Filed','Type','Ticker','Company','Amount','Senator','Owner',''].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feedTrades.slice(0, 150).map((t, i) => (
                      <tr key={i}
                        style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.12s' }}
                        onClick={() => setActiveSenator(t.senator)}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-bright)', whiteSpace: 'nowrap', fontWeight: 600 }}>{t.transaction_date || '—'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-dim)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{t.filed_date || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><SideBadge isBuy={t.is_buy} /></td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-bright)' }}>{t.ticker}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-main)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.company}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: t.is_buy ? BUY_COLOR : SELL_COLOR, whiteSpace: 'nowrap' }}>{t.amount}</td>
                        <td style={{ padding: '12px 16px', color: ACCENT, fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.88rem' }}
                          onClick={e => { e.stopPropagation(); setActiveSenator(t.senator); }}>
                          {t.senator}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 500 }}>{t.owner || 'Self'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {t.ptr_link
                            ? <a href={t.ptr_link} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ color: ACCENT, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 }}>View ↗</a>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {feedTrades.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>No trades match your filter.</td></tr>
                    )}
                  </tbody>
                </table>
                {feedTrades.length > 150 && (
                  <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-dim)', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)' }}>
                    Showing 150 of {feedTrades.length} — use the search to narrow down
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── SENATORS LEADERBOARD ── */}
          {view === 'senators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {senatorStats.map((s, i) => {
                const buyPct = s.total > 0 ? (s.buys / s.total) * 100 : 0;
                const medal = i < 3 ? ['#ffd700','#c0c0c0','#cd7f32'][i] : null;
                return (
                  <div key={s.senator}
                    onClick={() => setActiveSenator(s.senator)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                      borderRadius: 12, cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT + '88'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', minWidth: 32, color: medal || 'var(--text-dim)' }}>#{i+1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-bright)', marginBottom: 5 }}>🏛️ {s.senator}</div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,59,59,0.2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: buyPct+'%', background: BUY_COLOR, borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <Stat label="Total"   value={s.total}   color="var(--text-bright)" />
                      <Stat label="Buys"    value={s.buys}    color={BUY_COLOR} />
                      <Stat label="Sells"   value={s.sells}   color={SELL_COLOR} />
                      <Stat label="Stocks"  value={s.tickers} color={ACCENT} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: ACCENT, fontWeight: 700, opacity: 0.7 }}>View →</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── HOT TICKERS ── */}
          {view === 'tickers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topTickers.map((t, i) => {
                const total   = t.buy_count + t.sell_count;
                const buyPct  = total > 0 ? (t.buy_count / total) * 100 : 0;
                return (
                  <div key={t.ticker} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12,
                  }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-dim)', minWidth: 32 }}>#{i+1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-bright)' }}>{t.ticker}</span>
                        {t.current_price && <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>${t.current_price.toLocaleString()}</span>}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginLeft: 'auto', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.company}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,59,59,0.2)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: buyPct+'%', background: BUY_COLOR, borderRadius: 3 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      <Stat label="Buys"     value={t.buy_count}          color={BUY_COLOR}  />
                      <Stat label="Sells"    value={t.sell_count}         color={SELL_COLOR} />
                      <Stat label="Buy Rate" value={Math.round(buyPct)+'%'} color={ACCENT}   />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── SENATOR DETAIL DRAWER ── */}
      {activeSenator && (
        <SenatorDrawer
          senator={activeSenator}
          trades={allTrades}
          onClose={() => setActiveSenator(null)}
        />
      )}
    </div>
  );
}
