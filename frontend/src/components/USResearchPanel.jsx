import { useState, useEffect, useMemo } from 'react';
import { stockDataMap, formatLargeNumber, formatPercent } from '../lib/usResearch';

/* ── Neon palette — only applied in dark mode ── */
const N = {
  cyan:   '#00f5ff',
  pink:   '#ff2d78',
  purple: '#bf5fff',
  red:    '#ff3b3b',
  green:  '#39ff8f',
  amber:  '#ffb800',
};

export default function USResearchPanel({ onSelectTicker, liveSignals = [] }) {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [sortBy, setSortBy] = useState('marketCap');
  const [dark, setDark]     = useState(() => document.documentElement.dataset.theme === 'dark');

  /* Track theme changes */
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.dataset.theme === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const allStocks = useMemo(() => Object.values(stockDataMap), []);

  const sectors = useMemo(() => {
    const s = new Set(allStocks.map(s => s.info.sector));
    return ['All', ...Array.from(s).sort()];
  }, [allStocks]);

  const liveSignalMap = useMemo(() => {
    const m = {};
    liveSignals.forEach(s => { m[s.symbol] = s; });
    return m;
  }, [liveSignals]);

  const filtered = useMemo(() => {
    let result = allStocks.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.info.ticker.toLowerCase().includes(q) || s.info.name.toLowerCase().includes(q);
      const matchSector = sector === 'All' || s.info.sector === sector;
      return matchSearch && matchSector;
    });
    result.sort((a, b) => {
      if (sortBy === 'marketCap') return (b.info.marketCap||0) - (a.info.marketCap||0);
      if (sortBy === 'change')    return (b.info.changePercent||0) - (a.info.changePercent||0);
      if (sortBy === 'pe')        return (a.info.peRatio||0) - (b.info.peRatio||0);
      if (sortBy === 'ticker')    return a.info.ticker.localeCompare(b.info.ticker);
      return 0;
    });
    return result;
  }, [allStocks, search, sector, sortBy]);

  /* ── Theme-conditional styles ── */
  const headerBg    = dark ? '#000000' : 'var(--bg-elevated)';
  const headerBorder= dark ? `1px solid ${N.cyan}30` : '1px solid var(--border-subtle)';
  const headerShadow= dark ? `0 0 40px ${N.pink}18` : 'var(--shadow-card)';
  const titleColor  = dark ? N.cyan : 'var(--text-bright)';
  const titleShadow = dark ? `0 0 18px ${N.cyan}, 0 0 40px ${N.cyan}66` : 'none';
  const statBg      = dark ? '#0a0a0a' : 'var(--bg-card)';
  const inputBg     = dark ? '#0a0a0a' : 'var(--bg-elevated)';
  const inputBorder = dark ? `1px solid ${N.cyan}30` : '1px solid var(--border-subtle)';
  const resultsBg   = dark ? `${N.purple}12` : 'var(--bg-elevated)';
  const resultsColor= dark ? N.purple : 'var(--text-dim)';
  const resultsBorder= dark ? `1px solid ${N.purple}40` : '1px solid var(--border-subtle)';

  const inputStyle = {
    background: inputBg,
    border: inputBorder,
    borderRadius: 8,
    color: 'var(--text-bright)',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    outline: 'none',
    padding: '9px 14px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ animation: 'fade-in 0.3s ease-out' }}>

      <style>{`
        @keyframes neon-flicker { 0%,19%,21%,23%,25%,54%,56%,100%{opacity:1} 20%,24%,55%{opacity:0.6} }
        .us-input:focus { outline: none; border-color: ${dark ? N.cyan : 'var(--accent-purple)'} !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '24px 28px 20px', marginBottom: 24,
        background: headerBg, borderRadius: 16,
        border: headerBorder, boxShadow: headerShadow,
      }}>
        {/* Dark-only: cyber grid + glows */}
        {dark && <>
          <div style={{ position:'absolute', inset:0, borderRadius:16, pointerEvents:'none', opacity:0.12,
            backgroundImage:`linear-gradient(${N.cyan}33 1px,transparent 1px),linear-gradient(90deg,${N.cyan}33 1px,transparent 1px)`,
            backgroundSize:'40px 40px' }} />
          <div style={{ position:'absolute', top:-60, right:40, width:160, height:160, borderRadius:'50%',
            background:`radial-gradient(circle,${N.red}55 0%,transparent 70%)`, filter:'blur(20px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px',
            background:`linear-gradient(90deg,transparent,${N.cyan},transparent)`, opacity:0.35, pointerEvents:'none' }} />
        </>}

        <div style={{ position:'relative', display:'flex', flexWrap:'wrap', gap:20, alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
              <span style={{ fontSize:'1.6rem' }}>🔬</span>
              <h2 style={{ margin:0, fontSize:'1.5rem', fontWeight:900, letterSpacing: dark ? '0.05em' : '0',
                color: titleColor, textShadow: titleShadow }}>
                US Equity Research
              </h2>
            </div>
            <p style={{ margin:0, fontSize:'0.8rem', color:'var(--text-dim)' }}>
              {Object.keys(stockDataMap).length} stocks · Financials · Analyst ratings · DCF · Investment theses
            </p>
          </div>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { val: Object.keys(stockDataMap).length, label:'Stocks',       color: dark ? N.cyan   : 'var(--accent-purple)' },
              { val: liveSignals.length,               label:'Live Signals', color: dark ? N.green  : 'var(--up-color)' },
              { val: sectors.length - 1,               label:'Sectors',      color: dark ? N.purple : 'var(--text-dim)' },
            ].map(m => (
              <div key={m.label} style={{ textAlign:'center', padding:'10px 16px', background: statBg, borderRadius:10,
                border: dark ? `1px solid ${m.color}35` : '1px solid var(--border-subtle)',
                boxShadow: dark ? `0 0 14px ${m.color}18` : 'none' }}>
                <div style={{ fontSize:'1.7rem', fontWeight:900, color: m.color,
                  textShadow: dark ? `0 0 10px ${m.color}` : 'none', lineHeight:1 }}>{m.val}</div>
                <div style={{ fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.08em', textTransform:'uppercase', marginTop:4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 220px' }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-dim)', fontSize:'0.9rem' }}>⌕</span>
          <input className="us-input" type="text" placeholder="Search ticker or company…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft:34, width:'100%', boxSizing:'border-box' }} />
        </div>
        <select className="us-input" value={sector} onChange={e => setSector(e.target.value)} style={inputStyle}>
          {sectors.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sectors' : s}</option>)}
        </select>
        <select className="us-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
          <option value="marketCap">↓ Market Cap</option>
          <option value="change">↓ % Change</option>
          <option value="pe">↑ P/E Ratio</option>
          <option value="ticker">A→Z Ticker</option>
        </select>
        <div style={{ padding:'9px 14px', borderRadius:8, border: resultsBorder,
          background: resultsBg, color: resultsColor, fontSize:'0.75rem', fontWeight:700, whiteSpace:'nowrap' }}>
          {filtered.length} results
        </div>
      </div>

      {/* ── CARDS GRID ── */}
      <div className="grid">
        {filtered.map(s => {
          const annual      = (s.financials||[]).filter(f => f.periodType==='annual');
          const latest      = annual.length > 0 ? annual[annual.length-1] : null;
          const prev        = annual.length >= 2 ? annual[annual.length-2] : null;
          const revGrowth   = prev && latest && prev.revenue>0 ? ((latest.revenue-prev.revenue)/prev.revenue)*100 : null;
          const grossMargin = latest && latest.revenue>0 ? (latest.grossProfit/latest.revenue)*100 : null;
          const earnings    = (s.earnings||[]).filter(e => e.epsActual!==null).slice(-1)[0];
          const surprise    = earnings?.surprise ?? null;
          const signal      = liveSignalMap[s.info.ticker];
          const rating      = s.analysts?.length>0 ? s.analysts[s.analysts.length-1]?.rating : null;
          const price       = s.info.price ?? 0;
          const changePct   = s.info.changePercent ?? 0;
          const up          = changePct >= 0;

          /* Dark-mode neon card accents */
          const cardBorder   = dark && signal ? `1px solid ${N.green}55`
                             : dark           ? `1px solid ${N.cyan}22`
                             : signal         ? '1px solid rgba(16,185,129,0.35)'
                             :                  '1px solid var(--border-subtle)';
          const cardShadow   = dark && signal ? `0 0 18px ${N.green}22, var(--shadow-card)`
                             : dark           ? `0 0 10px ${N.cyan}12, var(--shadow-card)`
                             :                  'var(--shadow-card)';
          const cardTopBg    = dark ? '#050505' : 'var(--bg-card-top)';

          return (
            <div key={s.info.ticker} className="stock-card"
              style={{ background: dark ? '#0a0a0a' : 'var(--bg-card)', border: cardBorder,
                borderRadius:'var(--radius-lg)', boxShadow: cardShadow,
                transition:'transform 0.25s ease, box-shadow 0.25s ease',
                cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column' }}
              onClick={() => onSelectTicker(s.info.ticker)}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='var(--shadow-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=cardShadow; }}
            >
              {/* Top header band */}
              <div style={{ background: cardTopBg, padding:'18px 22px', position:'relative' }}>
                {/* Dark: neon top line */}
                {dark && <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px',
                  background:`linear-gradient(90deg,transparent,${signal?N.green:N.cyan}88,transparent)` }} />}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize:'0.72rem', fontWeight:600 }}>
                    {s.info.sector || 'Equities'}
                  </span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {signal && (
                      <span style={{ background: dark ? `${N.green}18` : 'rgba(16,185,129,0.12)',
                        color: dark ? N.green : '#10b981',
                        border: `1px solid ${dark ? N.green+'44' : 'rgba(16,185,129,0.3)'}`,
                        padding:'3px 8px', borderRadius:99, fontSize:'0.62rem', fontWeight:800,
                        textShadow: dark ? `0 0 6px ${N.green}` : 'none' }}>◉ LIVE</span>
                    )}
                    <span style={{ background: dark ? 'rgba(99,102,241,0.2)' : '#3b82f6',
                      color: dark ? '#a78bfa' : '#fff',
                      border: dark ? '1px solid rgba(99,102,241,0.4)' : 'none',
                      padding:'3px 10px', borderRadius:99, fontSize:'0.68rem', fontWeight:800 }}>
                      {rating || 'RESEARCH'}
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                  <h2 style={{ margin:0, fontSize:'1.4rem', fontWeight:800, letterSpacing:'-0.01em',
                    color: dark ? N.cyan : 'var(--text-card-top)',
                    textShadow: dark ? `0 0 14px ${N.cyan}88` : 'none' }}>{s.info.ticker}</h2>
                  <span style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#94a3b8', fontSize:'0.8rem', fontWeight:600 }}>
                    ${price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding:'18px 22px', flex:1, display:'flex', flexDirection:'column' }}>
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', fontWeight:600, color:'var(--text-dim)', marginBottom:6 }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>{s.info.name}</span>
                    <span style={{ color: up ? 'var(--up-color)' : 'var(--down-color)', fontWeight:700 }}>{formatPercent(changePct)}</span>
                  </div>
                  <div style={{ height:5, background:'var(--border-subtle)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,Math.abs(changePct)*5)}%`,
                      background: up ? 'var(--up-color)' : 'var(--down-color)', borderRadius:3 }} />
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center', marginBottom:16 }}>
                  {[
                    { label:'Mkt Cap',    val: formatLargeNumber(s.info.marketCap), color:'var(--text-bright)' },
                    { label:'P/E',        val: s.info.peRatio ? `${s.info.peRatio.toFixed(1)}x` : '—', color:'var(--text-bright)', mid:true },
                    { label:'Rev Growth', val: revGrowth!=null ? formatPercent(revGrowth) : '—',
                      color: revGrowth==null ? 'var(--text-bright)' : revGrowth>=0 ? 'var(--up-color)' : 'var(--down-color)' },
                  ].map((m,i) => (
                    <div key={i} style={{ borderLeft: m.mid ? '1px solid var(--border-subtle)' : 'none',
                      borderRight: m.mid ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ fontSize:'0.67rem', color:'var(--text-dim)', fontWeight:600, marginBottom:3 }}>{m.label}</div>
                      <div style={{ fontSize:'0.95rem', fontWeight:800, color: m.color }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ flex:1 }} />

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {grossMargin != null && (
                      <span style={{ background:'rgba(99,102,241,0.1)', color:'var(--accent-purple)',
                        padding:'3px 8px', borderRadius:99, fontSize:'0.62rem', fontWeight:700 }}>
                        GM {grossMargin.toFixed(1)}%
                      </span>
                    )}
                    {surprise != null && (
                      <span style={{ background: surprise>=0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: surprise>=0 ? 'var(--up-color)' : 'var(--down-color)',
                        padding:'3px 8px', borderRadius:99, fontSize:'0.62rem', fontWeight:700 }}>
                        EPS {surprise>=0?'+':''}{surprise.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <button style={{ background:'transparent', border:'1px solid var(--border-subtle)',
                    color:'var(--text-dim)', padding:'3px 10px', borderRadius:6,
                    fontSize:'0.62rem', fontWeight:700, cursor:'pointer' }}>
                    Details ➔
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-dim)', fontSize:'0.9rem' }}>
          No results found
        </div>
      )}
    </div>
  );
}
