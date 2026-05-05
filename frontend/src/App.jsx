import { useEffect, useState, useMemo, useCallback } from 'react'
/* recharts removed — heatmap grid replaces bar chart */
import './App.css'
import Sidebar from './components/Sidebar'
import TopNavigation from './components/TopNavigation'
import StockCard, { StatusBadge } from './components/StockCard'

/* ─────────────────────────────────────────────────────────────────────────
   CHART TOOLTIPS (unchanged)
───────────────────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '10px', borderRadius: '8px', color: '#fff' }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: '0 0 5px 0', color: '#66fcf1' }}>{data.count} Signals</p>
        <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8, maxWidth: '250px', wordWrap: 'break-word', lineHeight: '1.4' }}>
          {data.stocks.join(', ')}
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic' }}>Click to view trade outcomes</p>
      </div>
    );
  }
  return null;
};

const HCTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #854d0e', padding: '10px', borderRadius: '8px', color: '#fff' }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: '0 0 5px 0', color: '#fbbf24' }}>🎯 {data.count} HC Signal{data.count > 1 ? 's' : ''}</p>
        <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8 }}>{data.stocks.join(', ')}</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#fde68a', fontStyle: 'italic' }}>Click to view details</p>
      </div>
    );
  }
  return null;
};

const StockTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const wr = data.tp + data.sl > 0 ? (data.tp / (data.tp + data.sl) * 100).toFixed(1) : 0;
    return (
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '10px', borderRadius: '8px', color: '#fff' }}>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#66fcf1' }}>{label}</p>
        <p style={{ margin: '0 0 5px 0' }}>Total Signals: {data.total}</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#4ade80' }}>Targets Hit (TP): {data.tp}</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#f87171' }}>Stop Loss Hit (SL): {data.sl}</p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#38bdf8' }}>Currently Active: {data.active}</p>
        <hr style={{ borderColor:'#334155', margin:'8px 0' }} />
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#fbbf24', fontWeight: 'bold' }}>Historical Win Rate: {wr}%</p>
      </div>
    );
  }
  return null;
};

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────── */
function formatScanTimestamp(iso) {
  if (!iso) return '';
  try {
    const hasTz = /[zZ]|[+\-]\d{2}:\d{2}$/.test(iso);
    const normalized = hasTz ? iso : `${iso}Z`;
    return new Date(normalized).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return ''; }
}

/* ─────────────────────────────────────────────────────────────────────────
   NIFTY REGIME BANNER
───────────────────────────────────────────────────────────────────────── */
function NiftyRegimeBanner({ niftyBullish, scanAt }) {
  if (niftyBullish !== true && niftyBullish !== false) return null;
  const bull = niftyBullish;
  return (
    <div className={`nifty-regime ${bull ? 'nifty-regime-bull' : 'nifty-regime-bear'}`} role="status">
      <strong>Nifty 50 vs 50-day EMA:</strong>{' '}
      {bull ? (
        <>Bullish (index above 50 EMA). New All NSE BUY and High Conviction signals are allowed when other filters pass.</>
      ) : (
        <>Bearish (index below 50 EMA). <em>New</em> BUY and High Conviction scanner entries are suppressed to protect capital. Historical ledger rows are unchanged.</>
      )}
      {scanAt ? <span className="nifty-regime-meta">Universe scan: {scanAt}</span> : null}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   STOCK DETAIL DRAWER
───────────────────────────────────────────────────────────────────────── */
function StockDetailDrawer({ symbol, onClose, isUS = false }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
  const cur = isUS ? '$' : '₹';

  useEffect(() => {
    setLoading(true);
    const endpoint = isUS ? `/api/stock_detail_us/${symbol}` : `/api/stock_detail/${symbol}`;
    fetch(`${baseUrl}${endpoint}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol, isUS]);

  const gate = (label, pass, value) => (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px',
      background: pass ? 'color-mix(in srgb, var(--up-color) 8%, transparent)' : 'color-mix(in srgb, var(--down-color) 8%, transparent)',
      borderRadius:'8px', marginBottom:'6px',
      border:`1px solid ${pass ? 'color-mix(in srgb, var(--up-color) 20%, transparent)' : 'color-mix(in srgb, var(--down-color) 20%, transparent)'}`
    }}>
      <span style={{fontSize:'0.85rem', color:'var(--text-main)'}}>{label}</span>
      <span style={{fontWeight:'bold', color: pass ? 'var(--up-color)' : 'var(--down-color)'}}>{value} {pass ? '✅' : '❌'}</span>
    </div>
  );

  return (
    <div style={{ position:'fixed', top:0, right:0, width:'min(480px, 100vw)', height:'100vh', background:'var(--bg-elevated)', borderLeft:'1px solid var(--border-subtle)', zIndex:1000, overflowY:'auto', boxShadow:'-4px 0 30px rgba(0,0,0,0.5)' }}>
      <div style={{ padding:'20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'var(--bg-elevated)', zIndex:1 }}>
        <div>
          <h2 style={{ margin:0, color:'var(--text-bright)', fontSize:'1.4rem' }}>{symbol}</h2>
          {detail && <div style={{ color:'var(--text-dim)', fontSize:'0.85rem', marginTop:'2px' }}>{detail.company_name}</div>}
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.6rem', lineHeight:1 }}>×</button>
      </div>

      {loading ? (
        <div style={{ padding:'40px', textAlign:'center', color:'var(--text-dim)' }}>Loading data...</div>
      ) : !detail ? (
        <div style={{ padding:'40px', textAlign:'center', color:'var(--down-color)' }}>Failed to load data.</div>
      ) : (
        <div style={{ padding:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
            {[['Sector', detail.sector], ['Industry', detail.industry], ['Market Cap', detail.market_cap], ['Current Price', detail.current_price ? `${cur}${Number(detail.current_price).toFixed(2)}` : 'N/A']].map(([k,v]) => (
              <div key={k} style={{ background:'var(--bg-base)', borderRadius:'10px', padding:'12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--text-dim)', marginBottom:'4px' }}>{k}</div>
                <div style={{ fontWeight:'bold', color:'var(--text-bright)', wordBreak:'break-word' }}>{v || 'N/A'}</div>
              </div>
            ))}
          </div>

          <h3 style={{ color:'var(--text-bright)', marginBottom:'12px', fontSize:'1rem' }}>🧠 Why This Signal Triggered</h3>
          {detail.signal_logic && Object.keys(detail.signal_logic).length > 0 ? (
            <div style={{ marginBottom:'20px' }}>
              {gate('MACD Bullish', detail.signal_logic.macd_hist > 0, `Hist: ${detail.signal_logic.macd_hist}`)}
              {gate('RSI Sweet Spot (45-78)', detail.signal_logic.rsi >= 45 && detail.signal_logic.rsi <= 78, `RSI: ${detail.signal_logic.rsi}`)}
              {gate('Above 20-day EMA', detail.signal_logic.above_ema20, detail.signal_logic.above_ema20 ? 'Yes' : 'No')}
              {gate('Above 50-day EMA', detail.signal_logic.above_ema50, detail.signal_logic.above_ema50 ? 'Yes' : 'No')}
              {gate('Trending Market (ADX ≥ 18)', detail.signal_logic.adx >= 18, `ADX: ${detail.signal_logic.adx}`)}
              {gate('52W High Proximity (≥40%)', detail.signal_logic.pct_from_52w_high >= 60, `At ${detail.signal_logic.pct_from_52w_high}% of high`)}
              {gate('Volume Spike', detail.signal_logic.volume_ratio >= 1.5, `${detail.signal_logic.volume_ratio}x avg`)}
              {gate('Momentum (ROC 10d)', detail.signal_logic.roc10 > 0, `${detail.signal_logic.roc10}%`)}
            </div>
          ) : <div style={{ color:'#475569', fontSize:'0.85rem', marginBottom:'20px' }}>Indicator data unavailable.</div>}

          {(detail.week_52_high || detail.week_52_low) && (
            <div style={{ marginBottom:'20px', background:'var(--bg-base)', borderRadius:'10px', padding:'14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize:'0.75rem', color:'var(--text-dim)', marginBottom:'8px' }}>52-Week Range</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem' }}>
                <span style={{ color:'var(--down-color)' }}>{cur}{Number(detail.week_52_low).toFixed(2)}</span>
                <span style={{ color:'var(--up-color)' }}>{cur}{Number(detail.week_52_high).toFixed(2)}</span>
              </div>
              <div style={{ height:'6px', background:'var(--border-muted)', borderRadius:'3px', marginTop:'6px', position:'relative' }}>
                {detail.week_52_low && detail.week_52_high && detail.current_price && (
                  <div style={{ position:'absolute', left:`${Math.min(100, Math.max(0, ((detail.current_price - detail.week_52_low)/(detail.week_52_high - detail.week_52_low))*100))}%`, top: '-3px', width:'12px', height:'12px', background:'#3b82f6', borderRadius:'50%', transform:'translateX(-50%)' }} />
                )}
              </div>
            </div>
          )}

          <h3 style={{ color:'var(--text-bright)', marginBottom:'12px', fontSize:'1rem' }}>📊 Fundamentals</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
            {[
              ['P/E Ratio', detail.pe_ratio], ['P/B Ratio', detail.pb_ratio],
              ['ROE', detail.roe != null ? `${detail.roe}%` : null],
              ['Debt/Equity', detail.debt_to_equity],
              ['Revenue Growth', detail.revenue_growth != null ? `${detail.revenue_growth}%` : null],
              ['Earnings Growth', detail.earnings_growth != null ? `${detail.earnings_growth}%` : null],
              ['Dividend Yield', detail.dividend_yield != null ? `${detail.dividend_yield}%` : null],
              ['Beta', detail.beta], ['Analyst Rating', detail.analyst_rating],
              ['Analyst Target', detail.target_mean_price ? `${cur}${detail.target_mean_price}` : null],
            ].map(([k, v]) => (
              <div key={k} style={{ background:'var(--bg-base)', borderRadius:'8px', padding:'10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>{k}</div>
                <div style={{ fontWeight:'bold', color: v ? 'var(--text-bright)' : 'var(--text-dim)', fontSize:'0.95rem' }}>{v || 'N/A'}</div>
              </div>
            ))}
          </div>

          {detail.description && detail.description !== 'No description available.' && (
            <div style={{ marginBottom:'20px' }}>
              <h3 style={{ color:'var(--text-bright)', marginBottom:'8px', fontSize:'1rem' }}>🏢 About</h3>
              <p style={{ color:'var(--text-main)', fontSize:'0.83rem', lineHeight:'1.6', margin:0 }}>{detail.description.slice(0, 500)}{detail.description.length > 500 ? '...' : ''}</p>
            </div>
          )}

          {detail.news && detail.news.length > 0 && (
            <div>
              <h3 style={{ color:'var(--text-bright)', marginBottom:'12px', fontSize:'1rem' }}>📰 Latest News</h3>
              {detail.news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" style={{ display:'block', textDecoration:'none', marginBottom:'10px', padding:'12px', background:'var(--bg-base)', borderRadius:'8px', border:'1px solid var(--border-subtle)', transition:'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent-purple)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-subtle)'}>
                  <div style={{ color:'var(--text-bright)', fontSize:'0.85rem', fontWeight:'500', marginBottom:'4px', lineHeight:'1.4' }}>{n.title}</div>
                  <div style={{ color:'var(--text-dim)', fontSize:'0.75rem' }}>{n.source} · {n.published?.slice(0, 10)}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PORTFOLIO GRID (unchanged logic)
───────────────────────────────────────────────────────────────────────── */
function PortfolioGrid({ portfolio, setPortfolio }) {
  if (portfolio.length === 0) return <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--text-dim)'}}>Your portfolio is empty. Click "+ Log" on any signal to add it here.</div>;

  const totalInvested = portfolio.filter(t => t.status==='OPEN').reduce((sum, t) => sum + (t.buyPrice * t.qty), 0);
  const realizedPnL   = portfolio.filter(t => t.status==='CLOSED').reduce((sum, t) => sum + ((t.exitPrice - t.buyPrice) * t.qty), 0);

  const closeTrade = (id) => {
    const priceStr = prompt("Enter Exit Price:");
    if (!priceStr) return;
    const exitPrice = Number(priceStr);
    if (isNaN(exitPrice)) return alert("Invalid price");
    setPortfolio(p => p.map(t => t.id === id ? { ...t, status: 'CLOSED', exitPrice } : t));
  };
  const deleteTrade = (id) => {
    if(confirm("Delete this log?")) setPortfolio(p => p.filter(t => t.id !== id));
  };

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'20px', marginBottom:'24px', padding:'20px', backgroundColor:'var(--bg-elevated)', borderRadius:'15px', border:'1px solid var(--border-subtle)' }}>
        <div>
          <div style={{fontSize:'0.85rem', color:'#94a3b8'}}>Active Investment</div>
          <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'#38bdf8'}}>₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
        </div>
        <div>
          <div style={{fontSize:'0.85rem', color:'#94a3b8'}}>Realized P&L</div>
          <div style={{fontSize:'1.8rem', fontWeight:'bold', color: realizedPnL >= 0 ? '#4ade80' : '#f87171'}}>{realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
        </div>
      </div>
      <div className="grid">
        {portfolio.map(trade => (
          <div className="card-plain" key={trade.id} style={{ borderColor: trade.status==='CLOSED' ? '#334155' : '#38bdf844' }}>
            <div className="card-header-plain">
              <h2>{trade.symbol} <span style={{fontSize:'0.9rem', color:'#94a3b8', fontWeight:'normal'}}>({trade.qty} Qty)</span></h2>
              <StatusBadge status={trade.status} />
            </div>
            <div className="stats-grid">
              <div className="stat"><span>Buy Price</span><strong>₹{trade.buyPrice.toFixed(2)}</strong></div>
              <div className="stat"><span>Invested</span><strong>₹{(trade.buyPrice * trade.qty).toFixed(2)}</strong></div>
              {trade.status === 'CLOSED' ? (
                <>
                  <div className="stat"><span>Exit Price</span><strong>₹{trade.exitPrice.toFixed(2)}</strong></div>
                  <div className="stat"><span>P&L</span><strong className={trade.exitPrice >= trade.buyPrice ? 'up' : 'down'}>{trade.exitPrice >= trade.buyPrice ? '+' : ''}₹{((trade.exitPrice - trade.buyPrice) * trade.qty).toFixed(2)}</strong></div>
                </>
              ) : (
                <div className="stat"><span>Date Logged</span><strong style={{fontSize:'0.9rem'}}>{trade.date}</strong></div>
              )}
            </div>
            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
              {trade.status === 'OPEN' && <button onClick={() => closeTrade(trade.id)} style={{flex:1, padding:'8px', background:'rgba(56, 189, 248, 0.15)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.3)', borderRadius:'8px', cursor:'pointer'}}>Close Trade</button>}
              <button onClick={() => deleteTrade(trade.id)} style={{flex: trade.status==='OPEN' ? 0.3 : 1, padding:'8px', background:'rgba(248, 113, 113, 0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'8px', cursor:'pointer'}}>{trade.status==='OPEN' ? '✕' : 'Remove Log'}</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SEARCH BAR
───────────────────────────────────────────────────────────────────────── */
function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`${baseUrl}/api/search?q=${query}`)
        .then(r => r.json())
        .then(d => { setResults(d.results || []); setLoading(false); })
        .catch(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="search-wrap">
      <input
        type="text"
        className="search-input"
        placeholder="Search NSE symbol…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="Search stocks"
      />
      {results.length > 0 && query.trim().length >= 2 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'rgba(10,17,32,0.98)', border:'1px solid rgba(148,163,184,0.2)', borderRadius:'12px', marginTop:'8px', zIndex:1000, overflow:'hidden', boxShadow:'0 16px 40px rgba(0,0,0,0.45)' }}>
          {results.map(r => (
            <div key={r.symbol} onClick={() => { onSelect(r.symbol); setQuery(''); setResults([]); }} style={{ padding:'12px 15px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems: 'center', borderBottom:'1px solid #1e293b' }} onMouseEnter={e => e.currentTarget.style.background='#1e293b'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <strong style={{color:'#66fcf1', fontSize:'0.9rem'}}>{r.symbol}</strong>
              <span style={{color:'#94a3b8', fontSize:'0.8rem', maxWidth:'140px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'right'}}>{r.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   BUDGET PLANNER (logic unchanged)
───────────────────────────────────────────────────────────────────────── */
function BudgetPlanner({ data, hcData, budgetCapital, setBudgetCapital, amountPerTrade, setAmountPerTrade, qtyPerTrade, setQtyPerTrade, logTrade, setSelectedDetail }) {
  const [localBudget, setLocalBudget] = useState(budgetCapital);
  const [localAlloc, setLocalAlloc]   = useState(amountPerTrade);
  const [localQty, setLocalQty]       = useState(qtyPerTrade || 1);

  useEffect(() => { setLocalBudget(budgetCapital); }, [budgetCapital]);
  useEffect(() => { setLocalAlloc(amountPerTrade); }, [amountPerTrade]);
  useEffect(() => { setLocalQty(qtyPerTrade || 1); }, [qtyPerTrade]);

  const allSignals = useMemo(() => [
    ...data.map(s => ({ ...s, tier: s.action === 'STRONG BUY' ? 'HC' : 'NSE' })),
    ...(hcData.length > 0 ? hcData.map(s => ({ ...s, tier: 'HC' })) : [])
  ], [data, hcData]);

  const deduped = useMemo(() => Object.values(
    allSignals.reduce((acc, s) => {
      if (!acc[s.symbol] || s.tier === 'HC') acc[s.symbol] = s;
      return acc;
    }, {})
  ), [allSignals]);

  const budgetSignals = useMemo(() => deduped
    .filter(s => s.entry > 0 && s.entry <= amountPerTrade)
    .map(s => {
      const qty = qtyPerTrade;
      const capitalUsed = qty * s.entry;
      let score = 0;
      if (s.confidence >= 72) score += 25; else if (s.confidence >= 60) score += 15; else if (s.confidence >= 55) score += 8;
      if (s.volume_ratio >= 2.0) score += 20; else if (s.volume_ratio >= 1.5) score += 15; else if (s.volume_ratio >= 1.0) score += 8;
      if (s.tier === 'HC') score += 20; else score += 10;
      if (s.entry <= 500) score += 15; else if (s.entry <= 1000) score += 10; else if (s.entry <= 1500) score += 5;
      if (s.backtest && s.backtest.win_rate >= 60) score += 10; else if (s.backtest && s.backtest.win_rate >= 50) score += 5;
      if (s.delivery_pct != null && s.delivery_pct >= 45) score += 10; else if (s.delivery_pct != null && s.delivery_pct >= 35) score += 5;
      return { ...s, qty, capitalUsed, canAfford: true, score };
    })
    .sort((a, b) => b.score - a.score)
  , [deduped, amountPerTrade, qtyPerTrade]);

  const tier1    = budgetSignals.filter(s => s.score >= 80);
  const tier2    = budgetSignals.filter(s => s.score >= 65 && s.score < 80);
  const watchlist = budgetSignals.filter(s => s.score < 65);

  const deployedWk1 = tier1.slice(0, 2).reduce((s, x) => s + x.capitalUsed, 0);
  const deployedWk2 = tier2.slice(0, 3).reduce((s, x) => s + x.capitalUsed, 0);
  const reserve     = Math.max(0, budgetCapital - deployedWk1 - deployedWk2);

  const SignalCard = ({ s }) => (
    <div style={{ background:'var(--bg-elevated)', border:`1px solid ${s.score >= 80 ? '#34d39944' : s.score >= 65 ? '#38bdf844' : '#334155'}`, borderRadius:'14px', padding:'18px', cursor:'pointer', transition:'border-color 0.2s', position:'relative' }}
      onClick={() => setSelectedDetail(s.symbol)}
      onMouseEnter={e => e.currentTarget.style.borderColor = s.score >= 80 ? '#34d399aa' : '#38bdf8aa'}
      onMouseLeave={e => e.currentTarget.style.borderColor = s.score >= 80 ? '#34d39944' : s.score >= 65 ? '#38bdf844' : '#334155'}>

      <div style={{ position:'absolute', top:'14px', right:'14px', background: s.score >= 80 ? 'linear-gradient(135deg,#059669,#34d399)' : s.score >= 65 ? 'linear-gradient(135deg,#0284c7,#38bdf8)' : '#1e293b', borderRadius:'20px', padding:'4px 10px', fontSize:'0.75rem', fontWeight:'bold', color:'#fff' }}>
        {s.score}/100
      </div>

      <div style={{ position:'absolute', top:'14px', right:'80px', fontSize:'0.62rem', color:'#64748b', fontStyle:'italic', background:'rgba(255,255,255,0.05)', padding:'2px 6px', borderRadius:'4px' }}>Click for AI details</div>

      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
        <h2 style={{ margin:0, fontSize:'1.2rem', color:'#f8fafc' }}>{s.symbol}</h2>
        <span style={{ background: s.tier === 'HC' ? 'rgba(251,191,36,0.15)' : 'rgba(56,189,248,0.1)', color: s.tier === 'HC' ? '#fbbf24' : '#38bdf8', border:`1px solid ${s.tier === 'HC' ? '#fbbf2444' : '#38bdf844'}`, borderRadius:'6px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'bold' }}>
          {s.tier === 'HC' ? '🎯 HC' : '🚀 NSE'}
        </span>
      </div>

      <div style={{ background:'rgba(52,211,153,0.06)', border:'1px solid #34d39922', borderRadius:'10px', padding:'12px', marginBottom:'12px' }}>
        <div style={{ fontSize:'0.72rem', color:'#6ee7b7', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px', fontWeight:'600' }}>📐 Position Sizing ({qtyPerTrade} qty × entry ≤ ₹{amountPerTrade.toLocaleString('en-IN')})</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
          <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Entry Price</div><div style={{ fontWeight:'bold', color:'#e2e8f0' }}>₹{s.entry.toFixed(2)}</div></div>
          <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Suggested Qty</div><div style={{ fontWeight:'bold', color:'#34d399', fontSize:'1.1rem' }}>{s.qty} shares</div></div>
          <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Capital Used</div><div style={{ fontWeight:'bold', color:'#4ade80' }}>₹{s.capitalUsed.toLocaleString('en-IN', {maximumFractionDigits:0})}</div></div>
          <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Target Amt</div><div style={{ fontWeight:'bold', color:'#fbbf24' }}>₹{amountPerTrade.toLocaleString('en-IN')}</div></div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'10px' }}>
        <div style={{ background:'var(--bg-elevated)', borderRadius:'8px', padding:'8px', textAlign:'center' }}><div style={{ fontSize:'0.65rem', color:'#64748b' }}>Target</div><div style={{ fontWeight:'bold', color:'#4ade80', fontSize:'0.9rem' }}>₹{s.target.toFixed(2)}</div></div>
        <div style={{ background:'var(--bg-elevated)', borderRadius:'8px', padding:'8px', textAlign:'center' }}><div style={{ fontSize:'0.65rem', color:'#64748b' }}>Stoploss</div><div style={{ fontWeight:'bold', color:'#f87171', fontSize:'0.9rem' }}>₹{s.stoploss.toFixed(2)}</div></div>
        <div style={{ background:'var(--bg-elevated)', borderRadius:'8px', padding:'8px', textAlign:'center' }}><div style={{ fontSize:'0.65rem', color:'#64748b' }}>Confidence</div><div style={{ fontWeight:'bold', color:'#e2e8f0', fontSize:'0.9rem' }}>{s.confidence.toFixed(1)}%</div></div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.78rem', color:'#64748b' }}>
        <span>Vol: <strong style={{ color: s.volume_ratio >= 1.5 ? '#fbbf24' : '#94a3b8' }}>{s.volume_ratio.toFixed(2)}x</strong></span>
        {s.delivery_pct != null && <span>Delivery: <strong style={{ color: s.delivery_pct >= 45 ? '#4ade80' : '#94a3b8' }}>{s.delivery_pct}%</strong></span>}
        {s.backtest && <span>Win Rate: <strong style={{ color: s.backtest.win_rate >= 60 ? '#4ade80' : '#94a3b8' }}>{s.backtest.win_rate.toFixed(0)}%</strong></span>}
      </div>

      <button onClick={e => { e.stopPropagation(); logTrade(s, s.entry); }} style={{ width:'100%', marginTop:'12px', padding:'8px', background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.3)', borderRadius:'8px', cursor:'pointer', fontSize:'0.82rem', fontWeight:'600' }}>+ Log Trade</button>
    </div>
  );

  return (
    <>
      <div style={{ background:'linear-gradient(135deg,#022c22,var(--bg-base))', border:'1px solid #059669', borderRadius:'16px', padding:'24px', marginBottom:'28px' }}>
        <h2 style={{ margin:'0 0 6px', color:'#34d399', fontSize:'1.3rem' }}>₹ Budget Friendly Swing Planner</h2>
        <p style={{ color:'#6ee7b7', margin:'0 0 20px', fontSize:'0.85rem', opacity:0.8 }}>Position sizing &amp; signal filtering calibrated to your monthly capital. Signals pulled from HC + NSE Buy tabs.</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'20px', marginBottom:'20px' }}>
          <div>
            <label style={{ fontSize:'0.8rem', color:'#6ee7b7', display:'block', marginBottom:'6px' }}>Total Portfolio Capital (₹)</label>
            <div style={{ display:'flex', gap:'8px' }}>
              <input type="number" value={localBudget} onChange={e => setLocalBudget(Number(e.target.value))} onKeyDown={e => { if(e.key==='Enter') setBudgetCapital(localBudget) }} style={{ flex:1, padding:'10px 14px', background:'var(--bg-base)', border:'1px solid #059669', borderRadius:'8px', color:'#f8fafc', fontSize:'1rem', boxSizing:'border-box', outline:'none' }} />
              <button onClick={() => setBudgetCapital(localBudget)} style={{ padding:'0 15px', background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid #34d39944', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }}>Apply</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', color:'#6ee7b7', display:'block', marginBottom:'6px' }}>Qty Per Trade (shares)</label>
            <div style={{ display:'flex', gap:'8px' }}>
              <input type="number" min="1" value={localQty} onChange={e => setLocalQty(Math.max(1, Number(e.target.value)))} onKeyDown={e => { if(e.key==='Enter') setQtyPerTrade(localQty) }} style={{ flex:1, padding:'10px 14px', background:'var(--bg-base)', border:'1px solid #059669', borderRadius:'8px', color:'#f8fafc', fontSize:'1rem', boxSizing:'border-box', outline:'none' }} />
              <button onClick={() => setQtyPerTrade(localQty)} style={{ padding:'0 15px', background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid #34d39944', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }}>Apply</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize:'0.8rem', color:'#6ee7b7', display:'block', marginBottom:'6px' }}>Max ₹ Per Trade (gate)</label>
            <div style={{ display:'flex', gap:'8px' }}>
              <input type="number" value={localAlloc} onChange={e => setLocalAlloc(Number(e.target.value))} onKeyDown={e => { if(e.key==='Enter') setAmountPerTrade(localAlloc) }} style={{ flex:1, padding:'10px 14px', background:'var(--bg-base)', border:'1px solid #059669', borderRadius:'8px', color:'#f8fafc', fontSize:'1rem', boxSizing:'border-box', outline:'none' }} />
              <button onClick={() => setAmountPerTrade(localAlloc)} style={{ padding:'0 15px', background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid #34d39944', borderRadius:'8px', cursor:'pointer', fontWeight:'bold' }}>Apply</button>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid #34d39933', borderRadius:'10px', padding:'10px 14px' }}>
              <div style={{ fontSize:'0.72rem', color:'#6ee7b7', marginBottom:'2px' }}>Max Trade Slots</div>
              <div style={{ fontSize:'1.4rem', fontWeight:'bold', color:'#34d399' }}>{budgetSignals.length > 0 ? Math.floor(budgetCapital / (budgetSignals.reduce((s,x) => s + x.capitalUsed, 0) / budgetSignals.length)) : '—'}</div>
              <div style={{ fontSize:'0.65rem', color:'#64748b' }}>by avg cost ({qtyPerTrade} qty)</div>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px' }}>
          {[
            ['Week 1 Deploy', `₹${deployedWk1.toLocaleString('en-IN')}`, '#34d399', 'Tier 1 signals (top 2)'],
            ['Week 2 Deploy', `₹${deployedWk2.toLocaleString('en-IN')}`, '#38bdf8', 'Tier 2 signals (top 3)'],
            ['Reserve',       `₹${reserve.toLocaleString('en-IN')}`,     '#fbbf24', 'Never fully deploy'],
            ['Max Positions', '4',                                         '#c084fc', 'Open at any time'],
          ].map(([label, val, color, sub]) => (
            <div key={label} style={{ background:'rgba(0,0,0,0.3)', borderRadius:'10px', padding:'12px', borderLeft:`3px solid ${color}` }}>
              <div style={{ fontSize:'0.72rem', color:'#64748b', marginBottom:'4px' }}>{label}</div>
              <div style={{ fontSize:'1.4rem', fontWeight:'bold', color }}>{val}</div>
              <div style={{ fontSize:'0.7rem', color:'#475569', marginTop:'2px' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {budgetSignals.length === 0 ? (
        <div className="no-data" style={{ textAlign:'center', padding:'60px', color:'#64748b' }}>
          <div style={{ fontSize:'2rem', marginBottom:'12px' }}>📊</div>
          <div>No budget-friendly signals loaded yet.</div>
          <div style={{ fontSize:'0.85rem', marginTop:'8px', color:'#475569' }}>Visit <strong style={{color:'#38bdf8'}}>🚀 All NSE (Buy Only)</strong> or <strong style={{color:'#fbbf24'}}>🎯 High Conviction</strong> tabs first to load signal data, then return here.</div>
        </div>
      ) : (
        <>
          {tier1.length > 0 && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <div style={{ height:'1px', flex:1, background:'#059669' }} />
                <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'0.95rem', whiteSpace:'nowrap' }}>🥇 Tier 1 — Enter Week 1 (Score ≥ 80)</span>
                <div style={{ height:'1px', flex:1, background:'#059669' }} />
              </div>
              <div className="grid" style={{ marginBottom:'28px' }}>{tier1.map(s => <SignalCard key={s.symbol} s={s} />)}</div>
            </>
          )}
          {tier2.length > 0 && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <div style={{ height:'1px', flex:1, background:'#0284c7' }} />
                <span style={{ color:'#38bdf8', fontWeight:'bold', fontSize:'0.95rem', whiteSpace:'nowrap' }}>🥈 Tier 2 — Enter Week 2 if Wk1 in profit (Score 65–79)</span>
                <div style={{ height:'1px', flex:1, background:'#0284c7' }} />
              </div>
              <div className="grid" style={{ marginBottom:'28px' }}>{tier2.map(s => <SignalCard key={s.symbol} s={s} />)}</div>
            </>
          )}
          {watchlist.length > 0 && (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                <div style={{ height:'1px', flex:1, background:'#334155' }} />
                <span style={{ color:'#64748b', fontWeight:'bold', fontSize:'0.95rem', whiteSpace:'nowrap' }}>👁 Watchlist — Hold, wait for better setup (Score &lt; 65)</span>
                <div style={{ height:'1px', flex:1, background:'#334155' }} />
              </div>
              <div className="grid">{watchlist.map(s => <SignalCard key={s.symbol} s={s} />)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   HISTORY PANEL (logic unchanged)
───────────────────────────────────────────────────────────────────────── */
function HistoryPanel({ histData, stats, selectedDate, onSelect, onClose, accentColor, bannerTheme, TooltipComponent, onLogTrade, onDetail, amountPerTrade, setAmountPerTrade, qtyPerTrade, setQtyPerTrade, isNSE }) {
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [groupBy, setGroupBy] = useState('DATE');
  const [localAlloc, setLocalAlloc] = useState(amountPerTrade);
  const [localQty, setLocalQty]     = useState(qtyPerTrade || 1);

  useEffect(() => { setLocalAlloc(amountPerTrade); }, [amountPerTrade]);
  useEffect(() => { setLocalQty(qtyPerTrade || 1); }, [qtyPerTrade]);

  const months = [...new Set(histData.map(d => d.date.substring(0, 7)))].sort().reverse();

  const filteredHistData = useMemo(() => {
    if (groupBy === 'STOCK') return [];
    let result = [];
    if (selectedMonth === 'All') {
      const g = histData.reduce((acc, obj) => {
        if (!obj.date) return acc;
        const d = obj.date.slice(0, 7);
        if (!acc[d]) acc[d] = { date: d, count: 0, signals: [], stocks: [] };
        const sigs = obj.signals || [];
        acc[d].count += sigs.length;
        acc[d].signals.push(...sigs);
        if (obj.stocks) acc[d].stocks.push(...obj.stocks);
        return acc;
      }, {});
      result = Object.values(g).reverse();
    } else {
      result = histData.filter(d => d.date.startsWith(selectedMonth)).reverse();
    }
    return result.map(item => {
      const affordableSignals = (item.signals || []).filter(s => {
        if (!s.entry || s.entry <= 0) return false;
        if (isNSE) return s.entry <= amountPerTrade;
        const effectiveAmount = (amountPerTrade && amountPerTrade > 1000) ? amountPerTrade : Infinity;
        return s.entry <= effectiveAmount;
      });
      return { ...item, count: affordableSignals.length, signals: affordableSignals, stocks: affordableSignals.map(s => s.symbol) };
    });
  }, [histData, selectedMonth, groupBy, amountPerTrade, qtyPerTrade, isNSE]);

  const stockData = useMemo(() => {
    if (groupBy !== 'STOCK') return [];
    let d = selectedMonth === 'All' ? histData : histData.filter(h => h.date.startsWith(selectedMonth));
    const counts = {};
    d.forEach(day => {
      (day.signals || [])
        .filter(s => {
          if (!s.entry || s.entry <= 0) return false;
          if (isNSE) return s.entry <= amountPerTrade;
          const effectiveAmount = (amountPerTrade && amountPerTrade > 1000) ? amountPerTrade : Infinity;
          return s.entry <= effectiveAmount;
        })
        .forEach(s => {
          if (!counts[s.symbol]) counts[s.symbol] = { symbol: s.symbol, tp: 0, sl: 0, active: 0, total: 0 };
          counts[s.symbol].total++;
          if (s.status === 'TARGET HIT') counts[s.symbol].tp++;
          else if (s.status === 'SL HIT') counts[s.symbol].sl++;
          else counts[s.symbol].active++;
        });
    });
    return Object.values(counts).sort((a,b) => b.total - a.total).slice(0, 40);
  }, [histData, selectedMonth, groupBy, amountPerTrade, qtyPerTrade, isNSE]);

  const activeDataForStats = useMemo(() => selectedMonth === 'All' ? histData : histData.filter(d => d.date.startsWith(selectedMonth)), [histData, selectedMonth]);

  const safeAlloc  = amountPerTrade || 0;

  // Deduplicate by symbol — skip a repeat signal ONLY if the previous signal
  // for that symbol is still ACTIVE (open position). If previous closed (TARGET HIT
  // or SL HIT), the new signal is a fresh trade and should be counted.
  const deduplicateBySymbol = (signals) => {
    const lastStatus = {}; // symbol -> last seen status
    return signals.filter(s => {
      const prev = lastStatus[s.symbol];
      // Allow if: first time seen, OR previous trade has closed
      const allow = !prev || prev === 'TARGET HIT' || prev === 'SL HIT';
      lastStatus[s.symbol] = s.status; // update to current signal's status
      return allow;
    });
  };

  const allSignalsInMonth = activeDataForStats
    .slice() // sort chronologically so dedup logic sees signals in order
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .flatMap(day => (day.signals || []).filter(s => {
      if (!s.entry || s.entry <= 0) return false;
      if (isNSE) return s.entry <= amountPerTrade;
      return s.entry <= safeAlloc;
    }));
  const affordableSignalsInMonth = deduplicateBySymbol(allSignalsInMonth);
  const monthlySignals = affordableSignalsInMonth.length;
  const getQty = (stock) => isNSE ? (qtyPerTrade || 1) : Math.floor(safeAlloc / stock.entry);
  const monthlyCost    = affordableSignalsInMonth.reduce((sum, stock) => sum + (getQty(stock) * stock.entry), 0);
  const monthlyPnL     = affordableSignalsInMonth.reduce((sum, stock) => {
    const qty = getQty(stock);
    if (stock.status === 'TARGET HIT') return sum + ((stock.target   - stock.entry) * qty);
    if (stock.status === 'SL HIT')     return sum + ((stock.stoploss - stock.entry) * qty);
    return sum;
  }, 0);

  // Also deduplicate for win/loss counters
  const allSignalsForStats = activeDataForStats
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .flatMap(day => (day.signals || []));
  const dedupedForStats = deduplicateBySymbol(allSignalsForStats);

  let d_total = 0, d_wins = 0, d_loss = 0, d_days = 0;
  dedupedForStats.forEach(s => {
    d_total++;
    if (s.status === 'TARGET HIT') { d_wins++; d_days += (s.days_in_trade || 0); }
    else if (s.status === 'SL HIT') { d_loss++; d_days += (s.days_in_trade || 0); }
  });
  const d_closed = d_wins + d_loss;
  const dynWinRate     = d_closed > 0 ? (d_wins / d_closed * 100).toFixed(1) : 0;
  const dynAvgDays     = d_closed > 0 ? Math.round(d_days / d_closed) : 0;
  const dynExpectancyR = d_closed > 0 ? (((d_wins * 2.5) - d_loss) / d_closed) : 0;
  const dynProfitFactor = d_loss > 0 ? ((d_wins * 2.5) / d_loss) : (d_wins > 0 ? null : 0);

  const isMonth          = selectedMonth !== 'All';
  const showWinRate      = isMonth ? dynWinRate          : (stats?.win_rate_pct || 0);
  const showWins         = isMonth ? d_wins              : (stats?.target_hit || 0);
  const showLoss         = isMonth ? d_loss              : (stats?.sl_hit || 0);
  const showTotal        = isMonth ? d_total             : (stats?.total_signals || 0);
  const showAvgDays      = isMonth ? dynAvgDays          : (stats?.avg_days_to_close || 0);
  const showExpectancyR  = isMonth ? dynExpectancyR      : (stats?.expectancy_r || 0);
  const showProfitFactor = isMonth ? dynProfitFactor     : (stats?.profit_factor_r ?? 0);

  return (
    <>
      {stats && stats.total_signals > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'24px', padding:'20px', backgroundColor: 'var(--bg-card-top)', borderRadius:'15px', border:`1px solid var(--border-subtle)`, boxShadow: 'var(--shadow-card)' }}>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color: bannerTheme === 'amber' ? '#fbbf24' : '#66fcf1' }}>{showWinRate}%</div><div style={{ fontSize:'0.8rem', color: 'var(--text-card-top)', opacity:0.8 }}>{isMonth ? `Win Rate (${selectedMonth})` : 'Historical Win Rate'}</div></div>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color:'#4ade80' }}>{showWins}</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.8 }}>Targets Hit</div></div>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color:'#f87171' }}>{showLoss}</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.8 }}>Stop Losses Hit</div></div>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color:'#60a5fa' }}>{showTotal}</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.8 }}>{isMonth ? `Signals (${selectedMonth})` : 'Total Signals (2yr)'}</div></div>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color:'#c084fc' }}>{showAvgDays || 0}d</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.8 }}>Avg Time to TP/SL</div></div>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color: showExpectancyR >= 0 ? '#4ade80' : '#f87171' }}>{showExpectancyR > 0 ? '+' : ''}{Number(showExpectancyR).toFixed(2)}R</div><div style={{ fontSize:'0.8rem', color: 'var(--text-card-top)', opacity:0.8 }}>Expectancy / trade</div></div>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color:'#38bdf8' }}>{showProfitFactor === null ? '∞' : Number(showProfitFactor).toFixed(2)}</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.8 }}>Profit Factor (R)</div></div>
          {bannerTheme !== 'amber' && (<div style={{ textAlign:'center' }}><div style={{ fontSize:'1rem', fontWeight:'700', color:'#d1fae5', marginTop:'6px' }}>Filters: AI &gt; 55% • Vol &gt; 0.5x</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.7 }}>Broad NSE universe scan</div></div>)}
          {bannerTheme === 'amber' && (<div style={{ textAlign:'center' }}><div style={{ fontSize:'1rem', fontWeight:'700', color:'#d1fae5', marginTop:'6px' }}>Criteria: AI &gt; 72% • Vol &gt; 1.5x • ATR &gt; 1.5%</div><div style={{ fontSize:'0.8rem', color:'var(--text-card-top)', opacity:0.7 }}>Stricter = fewer, higher quality</div></div>)}
          {bannerTheme === 'amber' && stats && stats.total_signals > 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-card-top)', opacity: 0.88, lineHeight: 1.55, maxWidth: '720px', margin: '0 auto' }}>
                <strong style={{ color: '#fcd34d' }}>Win rate</strong> is computed from your ledger: (targets hit) ÷ (targets + stop losses) among <em>closed</em> trades only. After logic updates (walk-forward scoring and ledger gates), the number will reflect real outcomes as new data accumulates.
              </p>
            </div>
          )}
        </div>
      )}

      {histData.length > 0 && (
        <div style={{ marginBottom:'30px', backgroundColor:'var(--panel-bg)', padding:'20px', borderRadius:'15px', border:'1px solid var(--border-subtle)', boxSizing:'border-box' }}>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:'10px', marginBottom:'15px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'15px' }}>
              <h3 style={{ margin:0, color:'var(--text-bright)', fontSize:'1.1rem' }}>Historical Summary</h3>
              <div style={{ display:'flex', background:'#1e293b', borderRadius:'8px', overflow:'hidden', border:'1px solid #334155' }}>
                <button onClick={() => setGroupBy('DATE')} style={{ padding:'6px 12px', background: groupBy === 'DATE' ? 'rgba(56,189,248,0.2)' : 'transparent', color: groupBy === 'DATE' ? '#38bdf8' : '#94a3b8', border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold' }}>By Date</button>
                <button onClick={() => setGroupBy('STOCK')} style={{ padding:'6px 12px', background: groupBy === 'STOCK' ? 'rgba(56,189,248,0.2)' : 'transparent', color: groupBy === 'STOCK' ? '#38bdf8' : '#94a3b8', border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold' }}>By Stock</button>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'15px', flexWrap:'wrap' }}>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); onSelect(null); }}
                style={{ padding:'4px 10px', borderRadius:'6px', background:'var(--bg-base)', color:'var(--text-bright)', border:`1px solid ${accentColor}44`, outline:'none', cursor:'pointer' }}>
                <option value="All">All Time</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="date" value={selectedDate || ''} onChange={(e) => {
                const dateVal = e.target.value;
                if (dateVal) {
                  const m = dateVal.substring(0, 7);
                  if (months.includes(m)) setSelectedMonth(m);
                  onSelect(dateVal);
                } else {
                  onSelect(null);
                }
              }} style={{ padding:'3px 8px', borderRadius:'6px', background:'var(--bg-base)', color:'var(--text-bright)', border:`1px solid ${accentColor}44`, outline:'none', cursor:'pointer', colorScheme:'dark', fontFamily:'inherit' }} />
              <div style={{ fontSize:'0.85rem', color:'var(--text-bright)', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
                {isNSE && (
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(52,211,153,0.06)', padding:'4px 10px', borderRadius:'8px', border:'1px solid rgba(52,211,153,0.2)' }}>
                    <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>Qty:</span>
                    <input type="number" min="1" value={localQty} onChange={e => setLocalQty(Math.max(1, Number(e.target.value)))} onKeyDown={e => { if(e.key==='Enter') setQtyPerTrade(localQty) }} style={{ width:'44px', background:'transparent', border:'none', color:'#34d399', fontWeight:'bold', fontSize:'0.85rem', outline:'none' }} />
                    <button onClick={() => setQtyPerTrade(localQty)} style={{ background:'rgba(52,211,153,0.2)', border:'none', color:'#34d399', padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', cursor:'pointer', fontWeight:'bold' }}>Apply</button>
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(56,189,248,0.06)', padding:'4px 10px', borderRadius:'8px', border:'1px solid rgba(56,189,248,0.15)' }}>
                  <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>{isNSE ? 'Max ₹:' : '₹/Trade:'}</span>
                  <input type="number" value={localAlloc} onChange={e => setLocalAlloc(Number(e.target.value))} onKeyDown={e => { if(e.key==='Enter') setAmountPerTrade(localAlloc) }} style={{ width:'70px', background:'transparent', border:'none', color:'#38bdf8', fontWeight:'bold', fontSize:'0.85rem', outline:'none' }} />
                  <button onClick={() => setAmountPerTrade(localAlloc)} style={{ background:'rgba(56,189,248,0.2)', border:'none', color:'#38bdf8', padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', cursor:'pointer', fontWeight:'bold' }}>Apply</button>
                </div>
                <span>Signals: <strong style={{color:accentColor}}>{monthlySignals}</strong></span>
                <span>Cost: <strong style={{color:accentColor}}>₹{monthlyCost.toLocaleString('en-IN')}</strong></span>
                <span>Est. P&L: <strong style={{color: monthlyPnL >= 0 ? '#4ade80' : '#f87171'}}>{monthlyPnL > 0 ? '+' : ''}₹{monthlyPnL.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0})}</strong></span>
              </div>
              <span style={{ fontSize:'0.85rem', color:accentColor }}>← Scroll → • Click bar</span>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display:'flex', gap:'20px', marginBottom:'14px', alignItems:'center', flexWrap:'wrap' }}>
            {[['#3b82f6','Active'],['#22c55e','Target Hit'],['#ef4444','Stop Loss']].map(([c,l]) => (
              <span key={l} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.78rem', color:'var(--text-main)', fontWeight:600 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block', boxShadow:`0 0 6px ${c}55` }}></span> {l}
              </span>
            ))}
            <span style={{ marginLeft:'auto', fontSize:'0.78rem', color:accentColor, fontWeight:600 }}>Click cell to expand</span>
          </div>

          {/* Heatmap grid */}
          <div style={{ overflowX:'auto', overflowY:'auto', maxHeight:'460px', paddingBottom:'6px', borderRadius:'10px' }}>
            {groupBy === 'DATE' ? (
              <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'3px', minWidth: Math.max(500, filteredHistData.length * 52) + 'px' }}>
                <tbody>
                  <tr>
                    {filteredHistData.map((entry, i) => {
                      const sigs = entry.signals || [];
                      const tp = sigs.filter(s => s.status === 'TARGET HIT').length;
                      const sl = sigs.filter(s => s.status === 'SL HIT').length;
                      const act = sigs.filter(s => s.status === 'ACTIVE').length;
                      const total = tp + sl + act;
                      const maxSigs = Math.max(...filteredHistData.map(e => (e.signals || []).length), 1);
                      const intensity = total / maxSigs;
                      const dominant = total === 0 ? 'none' : tp >= sl && tp >= act ? 'tp' : sl > tp && sl >= act ? 'sl' : 'active';
                      const colors = { tp: { bg: `rgba(34,197,94,${0.08 + intensity * 0.45})`, border: '#22c55e', text: '#4ade80' }, sl: { bg: `rgba(239,68,68,${0.08 + intensity * 0.45})`, border: '#ef4444', text: '#f87171' }, active: { bg: `rgba(59,130,246,${0.06 + intensity * 0.35})`, border: '#3b82f6', text: '#60a5fa' }, none: { bg: 'var(--bg-elevated)', border: 'var(--border-subtle)', text: 'var(--text-dim)' } };
                      const c = colors[dominant];
                      const isSelected = selectedDate && selectedDate.date === entry.date;
                      return (
                        <td key={i} onClick={() => total > 0 && onSelect(entry)}
                          title={`${entry.date} — ${total} signals\nTP: ${tp}  SL: ${sl}  Active: ${act}`}
                          style={{
                            background: c.bg, border: isSelected ? '2px solid #fbbf24' : `1px solid ${c.border}22`,
                            borderRadius: '8px', padding: '8px 4px', cursor: total > 0 ? 'pointer' : 'default',
                            textAlign: 'center', verticalAlign: 'top', transition: 'all 0.15s ease',
                            minWidth: '48px', position: 'relative'
                          }}
                          onMouseEnter={e => { if(total > 0) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${c.border}33`; }}}
                          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                        >
                          <div style={{ fontSize:'0.65rem', color:'var(--text-bright)', fontWeight:700, marginBottom:'4px', letterSpacing:'0.03em', textShadow: '0 0 8px rgba(99,102,241,0.6), 0 0 16px rgba(99,102,241,0.4), 0 0 24px rgba(99,102,241,0.2)' }}>{entry.date.slice(5)}</div>
                          {total > 0 ? (
                            <>
                              <div style={{ fontSize:'1.15rem', fontWeight:800, color: c.text, lineHeight:1, marginBottom:'5px' }}>{total}</div>
                              {/* Mini stacked bar */}
                              <div style={{ display:'flex', height:'4px', borderRadius:'2px', overflow:'hidden', gap:'1px', margin:'0 2px' }}>
                                {tp > 0 && <div style={{ flex: tp, background:'#22c55e', borderRadius:'2px' }} />}
                                {act > 0 && <div style={{ flex: act, background:'#3b82f6', borderRadius:'2px' }} />}
                                {sl > 0 && <div style={{ flex: sl, background:'#ef4444', borderRadius:'2px' }} />}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', opacity:0.4, lineHeight:1.8 }}>—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px, 1fr))', gap:'8px' }}>
                {stockData.map((s, i) => {
                  const total = s.tp + s.sl + s.active;
                  const wr = (s.tp + s.sl) > 0 ? (s.tp / (s.tp + s.sl) * 100) : 0;
                  const dominant = s.tp >= s.sl && s.tp >= s.active ? 'tp' : s.sl > s.tp && s.sl >= s.active ? 'sl' : 'active';
                  const maxTotal = Math.max(...stockData.map(x => x.tp + x.sl + x.active), 1);
                  const intensity = total / maxTotal;
                  const colors = { tp: { bg: `rgba(34,197,94,${0.06 + intensity * 0.35})`, border: '#22c55e44', text: '#4ade80' }, sl: { bg: `rgba(239,68,68,${0.06 + intensity * 0.35})`, border: '#ef444444', text: '#f87171' }, active: { bg: `rgba(59,130,246,${0.05 + intensity * 0.3})`, border: '#3b82f644', text: '#60a5fa' } };
                  const c = colors[dominant];
                  return (
                    <div key={i} onClick={() => onDetail && onDetail(s.symbol)}
                      title={`${s.symbol}\nTP: ${s.tp}  SL: ${s.sl}  Active: ${s.active}\nWin Rate: ${wr.toFixed(0)}%`}
                      style={{
                        background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: '10px', padding: '12px 10px', cursor: 'pointer',
                        textAlign: 'center', transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                    >
                      <div style={{ fontSize:'0.75rem', fontWeight:800, color:'var(--text-bright)', marginBottom:'6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.symbol.replace('.NS','')}</div>
                      <div style={{ fontSize:'1.2rem', fontWeight:800, color: c.text, marginBottom:'6px' }}>{total}</div>
                      {/* Stacked bar */}
                      <div style={{ display:'flex', height:'5px', borderRadius:'3px', overflow:'hidden', gap:'1px', marginBottom:'6px' }}>
                        {s.tp > 0 && <div style={{ flex: s.tp, background:'#22c55e', borderRadius:'3px' }} />}
                        {s.active > 0 && <div style={{ flex: s.active, background:'#3b82f6', borderRadius:'3px' }} />}
                        {s.sl > 0 && <div style={{ flex: s.sl, background:'#ef4444', borderRadius:'3px' }} />}
                      </div>
                      <div style={{ display:'flex', justifyContent:'center', gap:'6px' }}>
                        {s.tp > 0 && <span style={{ fontSize:'0.65rem', color:'#4ade80', fontWeight:700 }}>{s.tp}T</span>}
                        {s.sl > 0 && <span style={{ fontSize:'0.65rem', color:'#f87171', fontWeight:700 }}>{s.sl}S</span>}
                        {s.active > 0 && <span style={{ fontSize:'0.65rem', color:'#60a5fa', fontWeight:700 }}>{s.active}A</span>}
                      </div>
                      {(s.tp + s.sl) > 0 && <div style={{ fontSize:'0.65rem', color:'var(--text-dim)', marginTop:'4px', fontWeight:600 }}>{wr.toFixed(0)}% WR</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDate && (
        <div style={{ marginBottom:'30px', padding:'20px', backgroundColor:'var(--panel-bg)', borderRadius:'15px', border:`1px solid ${accentColor}44` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
            <h3 style={{ margin:0, color:'var(--text-bright)' }}>Trade Simulations — {selectedDate.date}</h3>
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.4rem' }}>✕</button>
          </div>
          <div className="grid">
            {(selectedDate.signals || [])
              .filter(stock => stock.entry <= amountPerTrade)
              .map((stock, i) => (
                <StockCard
                  key={`${stock.symbol}-${i}`}
                  stock={{ ...stock, action: stock.status }}
                  variant="nse"
                  currency="₹"
                  showBacktest={false}
                  onLogTrade={onLogTrade}
                  onDetail={onDetail}
                />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

import LoginPage from './components/LoginPage'

/* ═══════════════════════════════════════════════════════════════════════════
   APP — ROOT COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const SECTOR_ICONS = {
  'NIFTY IT': '💻',
  'NIFTY PHARMA': '💊',
  'NIFTY ENERGY': '⚡',
  'NIFTY AUTO': '🚗',
  'NIFTY INFRA': '🏗️',
  'NIFTY BANK': '🏦',
  'NIFTY FMCG': '🛒',
  'NIFTY METAL': '⚙️',
  'NIFTY REALTY': '🏠',
  'NIFTY MEDIA': '🎬',
  'NIFTY PSE': '🏢',
  'NIFTY FINANCIAL SERVICES': '💰',
  'NIFTY HEALTHCARE': '🏥',
  'NIFTY CONSUMER DURABLES': '📺',
  'NIFTY OIL & GAS': '🛢️',
  'NIFTY COMMODITIES': '🌾',
  'NIFTY PRIVATE BANK': '💳',
  'NIFTY PSU BANK': '🏦',
  'NIFTY MIDCAP': '📈',
  'NIFTY SMALLCAP': '📊',
};

function getSectorIcon(sectorName) {
  const upper = (sectorName || '').toUpperCase();
  for (const [key, icon] of Object.entries(SECTOR_ICONS)) {
    if (upper.includes(key) || upper.includes(key.replace('NIFTY ', ''))) return icon;
  }
  return '📁';
}

function MainApp({ onLogout }) {
  const [data, setData]                         = useState([])
  const [historicalData, setHistoricalData]     = useState([])
  const [nseStats, setNseStats]                 = useState(null)
  const [hcData, setHcData]                     = useState([])
  const [hcHistorical, setHcHistorical]         = useState([])
  const [hcStats, setHcStats]                   = useState(null)
  const [usData, setUsData]                     = useState([])
  const [usHistorical, setUsHistorical]         = useState([])
  const [usStats, setUsStats]                   = useState(null)
  const [usHcData, setUsHcData]                 = useState([])
  const [usHcHistorical, setUsHcHistorical]     = useState([])
  const [usHcStats, setUsHcStats]               = useState(null)
  const [selectedUsDate, setSelectedUsDate]     = useState(null)
  const [selectedUsHcDate, setSelectedUsHcDate] = useState(null)
  const [selectedDetail, setSelectedDetail]     = useState(null)
  const [selectedDetailIsUS, setSelectedDetailIsUS] = useState(false)
  const [selectedHistDate, setSelectedHistDate] = useState(null)
  const [selectedHcDate, setSelectedHcDate]     = useState(null)
  const [loading, setLoading]                   = useState(true)
  const [market, setMarket]                     = useState("HC")
  const [isScanningBackground, setIsScanningBackground] = useState(false)
  const [portfolio, setPortfolio]               = useState(() => {
    try { return JSON.parse(localStorage.getItem('swing_portfolio')) || []; }
    catch { return []; }
  })
  const [watchlist, setWatchlist]               = useState(() => {
    try { return JSON.parse(localStorage.getItem('swing_watchlist')) || []; }
    catch { return []; }
  })
  const [trendingSectors, setTrendingSectors]   = useState([])
  const [mbData, setMbData]                     = useState([])
  const [sectorInsight, setSectorInsight]       = useState(null)
  const [mbBacktest, setMbBacktest]             = useState(null)
  const [mbView, setMbView]                     = useState('live')
  const [mbYearsAgo, setMbYearsAgo]             = useState(1)
  const [mbLoading, setMbLoading]               = useState(false)
  const [mbLastUpdated, setMbLastUpdated]       = useState(null)
  const [mbRemoteScanning, setMbRemoteScanning] = useState(false)
  const [niftyBullish, setNiftyBullish]         = useState(null)
  const [universeScanAt, setUniverseScanAt]     = useState('')
  const [budgetCapital, setBudgetCapital]       = useState(30000)
  const [amountPerTrade, setAmountPerTrade]     = useState(() => Number(localStorage.getItem('swing_amount')) || 10000)
  const [qtyPerTrade, setQtyPerTrade]           = useState(() => Number(localStorage.getItem('swing_qty'))    || 1)
  const [budgetRiskPct, setBudgetRiskPct]       = useState(2)
  const [theme, setTheme]                       = useState(() => localStorage.getItem('swing_theme') || 'light')
  const [adaptiveStatus, setAdaptiveStatus]     = useState(null)
  const [postmortems, setPostmortems]           = useState([])
  const [activeFilter, setActiveFilter]         = useState('ALL') // 'NSE', 'HC', or 'ALL'

  // Persist amount + qty to localStorage
  useEffect(() => { localStorage.setItem('swing_amount', amountPerTrade); }, [amountPerTrade]);
  useEffect(() => { localStorage.setItem('swing_qty',    qtyPerTrade);    }, [qtyPerTrade]);

  // Theme application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('swing_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  // Adaptive status
  useEffect(() => {
    const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:8000';
    fetch(`${baseUrl}/api/adaptive_status`).then(r => r.json()).then(setAdaptiveStatus).catch(console.error);
    fetch(`${baseUrl}/api/postmortems`).then(r => r.json()).then(res => { if (res.status === 'success') setPostmortems(res.data || []); }).catch(console.error);
  }, []);

  const loadMultibagger = useCallback((refresh = false) => {
    setMbLoading(true); setMbRemoteScanning(false);
    const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:8000';
    fetch(`${baseUrl}/api/multibagger/live${refresh ? '?refresh=true' : ''}`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') { setMbData(res.data || []); if (res.timestamp || res.last_updated) setMbLastUpdated(res.timestamp || res.last_updated); setMbRemoteScanning(!!res.is_scanning); }
        setMbLoading(false);
      })
      .catch(() => setMbLoading(false));
  }, []);

  // Load initial multibagger data on mount
  useEffect(() => {
    loadMultibagger(false);
  }, [loadMultibagger]);

  useEffect(() => {
    const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
    fetch(`${baseUrl}/api/trending_sectors`).then(r => r.json()).then(res => { if (res.status === 'success') setTrendingSectors(res.data || []) }).catch(console.error);
  }, []);

  useEffect(() => { localStorage.setItem('swing_portfolio', JSON.stringify(portfolio)); }, [portfolio]);
  useEffect(() => { localStorage.setItem('swing_watchlist', JSON.stringify(watchlist)); }, [watchlist]);

  const toggleWatchlist = (stock) => {
    setWatchlist(prev => {
      const exists = prev.find(w => w.symbol === stock.symbol);
      if (exists) {
        return prev.filter(w => w.symbol !== stock.symbol);
      } else {
        return [...prev, { symbol: stock.symbol, stock, addedAt: new Date().toISOString() }];
      }
    });
  };

  const logTrade = (stock, defaultPrice) => {
    const qtyStr   = prompt(`Enter quantity of ${stock.symbol} bought:`, "1");
    if (!qtyStr) return;
    const priceStr = prompt(`Enter exact buy price for ${stock.symbol}:`, defaultPrice || stock.entry);
    if (!priceStr) return;
    const qty = Number(qtyStr); const buyPrice = Number(priceStr);
    if (isNaN(qty) || isNaN(buyPrice)) return alert("Invalid numbers entered.");
    setPortfolio(p => [...p, { id: Date.now(), symbol: stock.symbol, buyPrice, qty, status: 'OPEN', exitPrice: null, date: new Date().toISOString().split('T')[0] }]);
    alert(`${qty} shares of ${stock.symbol} successfully added to your Portfolio!`);
  };

  const loadSectorInsight = (sector) => {
    setSectorInsight({ sector, loading: true, data: null, error: null });
    const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
    fetch(`${baseUrl}/api/sector_leader?sector=${encodeURIComponent(sector)}`)
      .then(r => r.json())
      .then(res => { if (res.status === 'success') setSectorInsight({ sector, loading: false, data: res.leader, error: null }); else setSectorInsight({ sector, loading: false, data: null, error: res.message }); })
      .catch(() => setSectorInsight({ sector, loading: false, data: null, error: "Failed to connect to backend." }));
  };

  // Data fetching
  useEffect(() => {
    if (market === 'BUDGET') {
      setLoading(false);
      const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
      if (hcData.length === 0) {
        fetch(`${baseUrl}/api/high_conviction`).then(r => r.json()).then(result => {
          setHcData(result.data || []);
          if (result.historical) setHcHistorical(result.historical);
          if (result.backtest_summary) setHcStats(result.backtest_summary);
          if (typeof result.market_bullish === 'boolean') setNiftyBullish(result.market_bullish);
          if (result.last_updated) setUniverseScanAt(formatScanTimestamp(result.last_updated));
        }).catch(console.error);
      }
      if (nseStats === null) {
        fetch(`${baseUrl}/api/scan_universe_buys`).then(r => r.json()).then(result => {
          setData(result.data || []);
          if (result.historical) setHistoricalData(result.historical);
          if (result.backtest_summary) setNseStats(result.backtest_summary);
          if (typeof result.market_bullish === 'boolean') setNiftyBullish(result.market_bullish);
          if (result.last_updated) setUniverseScanAt(formatScanTimestamp(result.last_updated));
        }).catch(console.error);
      }
      return;
    }
    if (market === 'ACTIVE_SIGNALS' || market === 'PORTFOLIO' || market === 'MULTIBAGGER' || market === 'ADAPTIVE') { setLoading(false); return; }

    if (market === 'US_BUYS' || market === 'US_HC') {
      setLoading(false);
      const baseUrl = import.meta.env.PROD ? '' : 'http://localhost:8000';
      if (market === 'US_BUYS' && usStats === null) {
        setLoading(true);
        fetch(`${baseUrl}/api/us_buys`).then(r => r.json()).then(res => {
          setUsData(res.data || []); setUsHistorical(res.historical || []); setUsStats(res.backtest_summary || {}); setLoading(false);
        }).catch(() => setLoading(false));
      }
      if (market === 'US_HC' && usHcStats === null) {
        setLoading(true);
        fetch(`${baseUrl}/api/us_high_conviction`).then(r => r.json()).then(res => {
          setUsHcData(res.data || []); setUsHcHistorical(res.historical || []); setUsHcStats(res.backtest_summary || {}); setLoading(false);
        }).catch(() => setLoading(false));
      }
      return;
    }

    let ignore = false;
    const isNSEBuys = market === "NSE_BUYS";
    const isHC      = market === "HC";

    if (isHC && hcData.length > 0)    { setLoading(false); return; }
    if (isNSEBuys && nseStats !== null) { setLoading(false); return; }

    if (isHC)           { setHcData([]); setHcHistorical([]); setHcStats(null); }
    else if (isNSEBuys) { setHistoricalData([]); setNseStats(null); }

    setSelectedHistDate(null); setSelectedHcDate(null); setLoading(true);

    const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
    const url = isHC ? `${baseUrl}/api/high_conviction` : isNSEBuys ? `${baseUrl}/api/scan_universe_buys` : `${baseUrl}/api/scan?market=${market}`;

    fetch(url).then(r => r.json()).then(result => {
      if (ignore) return;
      if (isHC) { setHcData(result.data || []); } else { setData(result.data || []); }
      if (typeof result.market_bullish === 'boolean') setNiftyBullish(result.market_bullish);
      if (result.last_updated) setUniverseScanAt(formatScanTimestamp(result.last_updated));
      if (result.historical) {
        if (isHC)      { setHcHistorical(result.historical); setHcStats(result.backtest_summary || null); }
        else if (isNSEBuys) { setHistoricalData(result.historical); setNseStats(result.backtest_summary || null); }
      }
      setIsScanningBackground(!!(result.is_scanning && (result.data || []).length === 0));
      setLoading(false);
    }).catch(e => { if (!ignore) { console.error(e); setLoading(false); } });

    return () => { ignore = true; };
  }, [market]);

  const currency = (market === 'US_BUYS' || market === 'US_HC') ? '$' : '₹';
  const isUSMarket = market === 'US_BUYS' || market === 'US_HC';
  const capLabel  = market === "US" ? "$1.2K Cap" : "₹1L Cap";

  const activeSignals = useMemo(() => {
    // Determine which data sources to include based on filter
    let sources = [];
    if (activeFilter === 'ALL') sources = [...historicalData, ...hcHistorical];
    else if (activeFilter === 'NSE') sources = historicalData;
    else if (activeFilter === 'HC') sources = hcHistorical;
    
    return Object.values(
      sources
        .flatMap(day => (day.signals || []).map(s => ({ ...s, signalDate: day.date })))
        .filter(s => s.status === 'ACTIVE')
        .reduce((acc, s) => { acc[s.symbol] = s; return acc; }, {})
    ).sort((a, b) => (b.growth_pct || 0) - (a.growth_pct || 0));
  }, [historicalData, hcHistorical, activeFilter]);

  /* ─── Render ─── */
  return (
    <>
      {/* Sidebar */}
      <Sidebar
        market={market}
        setMarket={setMarket}
        mbData={mbData}
        mbLoading={mbLoading}
        loadMultibagger={loadMultibagger}
        niftyBullish={niftyBullish}
        hcCount={hcData.length}
        nseCount={data.length}
        activeCount={activeSignals.length}
        watchlistCount={watchlist.length}
      />

      {/* Top navigation bar */}
      <TopNavigation
        theme={theme}
        toggleTheme={toggleTheme}
        universeScanAt={universeScanAt}
        searchBar={<SearchBar onSelect={symbol => setSelectedDetail(symbol)} />}
        onLogout={onLogout}
      />

      {/* Main content area */}
      <main className="main-content">
        
        {/* Sector Nav Pills */}
        {trendingSectors.length > 0 && market !== 'BUDGET' && market !== 'PORTFOLIO' && market !== 'ADAPTIVE' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }} className="hide-on-mobile">
            <button style={{ padding: '6px 16px', borderRadius: 99, background: 'var(--accent-purple)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem' }}>All Sectors</button>
            {trendingSectors.slice(0, 5).map(sector => (
              <button
                key={sector.sector}
                onClick={() => loadSectorInsight(sector.sector)}
                style={{
                  padding: '6px 16px', borderRadius: 99, border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)', color: 'var(--text-main)',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                {sector.sector} <span style={{ opacity: 0.8 }}>{getSectorIcon(sector.sector)}</span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="loader">Scanning Markets… This may take a moment.</div>
        ) : (
          <>
            {isScanningBackground && (
               <div style={{
                 padding: '12px 20px', 
                 background: 'var(--bg-card-top)', 
                 borderRadius: '12px', 
                 marginBottom: '20px', 
                 border: '1px solid var(--border-subtle)',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '12px',
                 boxShadow: 'var(--shadow-card)'
               }}>
                 <div className="pulse-dot"></div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-card-top)' }}>
                   <strong>Scanning Markets:</strong> AI is currently analyzing latest NSE data. New signals will appear shortly.
                 </span>
               </div>
            )}

            {/* ── HIGH CONVICTION ── */}
            {market === "HC" && (
              <>
                <NiftyRegimeBanner niftyBullish={niftyBullish} scanAt={universeScanAt} />
                <HistoryPanel
                  key="hc-panel"
                  histData={hcHistorical}
                  stats={hcStats}
                  selectedDate={selectedHcDate}
                  onSelect={setSelectedHcDate}
                  onClose={() => setSelectedHcDate(null)}
                  accentColor="#fbbf24"
                  bannerTheme="amber"
                  TooltipComponent={HCTooltip}
                  onLogTrade={logTrade}
                  onDetail={setSelectedDetail}
                  amountPerTrade={amountPerTrade}
                  setAmountPerTrade={setAmountPerTrade}
                  qtyPerTrade={qtyPerTrade}
                  setQtyPerTrade={setQtyPerTrade}
                  isNSE={true}
                />
                {!selectedHcDate && (
                  <div className="grid">
                    {hcData.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px'}}>No High Conviction signals today. Thresholds are intentionally strict — quality over quantity.</div>}
                    {hcData.map(stock => (
                      <StockCard
                        key={stock.symbol}
                        stock={stock}
                        variant="hc"
                        currency="₹"
                        onLogTrade={logTrade}
                        onDetail={setSelectedDetail}
                        isWatchlisted={watchlist.some(w => w.symbol === stock.symbol)}
                        onToggleWatchlist={toggleWatchlist}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── NSE BUY ONLY ── */}
            {market === "NSE_BUYS" && (
              <>
                <NiftyRegimeBanner niftyBullish={niftyBullish} scanAt={universeScanAt} />
                <HistoryPanel
                  key="nse-panel"
                  histData={historicalData}
                  stats={nseStats}
                  selectedDate={selectedHistDate}
                  onSelect={setSelectedHistDate}
                  onClose={() => setSelectedHistDate(null)}
                  accentColor="#66fcf1"
                  bannerTheme="teal"
                  TooltipComponent={CustomTooltip}
                  onLogTrade={logTrade}
                  onDetail={setSelectedDetail}
                  amountPerTrade={amountPerTrade}
                  setAmountPerTrade={setAmountPerTrade}
                  qtyPerTrade={qtyPerTrade}
                  setQtyPerTrade={setQtyPerTrade}
                  isNSE={true}
                />
                {!selectedHistDate && (
                  <div className="grid">
                    {data.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center'}}>No active BUY signals found today.</div>}
                    {data.map(stock => (
                      <StockCard
                        key={stock.symbol}
                        stock={stock}
                        variant="nse"
                        currency="₹"
                        isWatchlisted={watchlist.some(w => w.symbol === stock.symbol)}
                        onToggleWatchlist={toggleWatchlist}
                        onLogTrade={logTrade}
                        onDetail={setSelectedDetail}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── US BUYS ── */}
            {market === 'US_BUYS' && (
              <>
                <HistoryPanel
                  key="us-buys-panel"
                  histData={usHistorical}
                  stats={usStats}
                  selectedDate={selectedUsDate}
                  onSelect={setSelectedUsDate}
                  onClose={() => setSelectedUsDate(null)}
                  accentColor="#22d3ee"
                  bannerTheme="cyan"
                  TooltipComponent={CustomTooltip}
                  onLogTrade={logTrade}
                  onDetail={sym => { setSelectedDetailIsUS(true); setSelectedDetail(sym); }}
                  amountPerTrade={amountPerTrade}
                  setAmountPerTrade={setAmountPerTrade}
                />
                <div className="grid" style={{ marginTop: 24 }}>
                  {usData.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px'}}>🇺🇸 US scan running... signals will appear shortly.</div>}
                  {usData.map(stock => (
                    <StockCard key={stock.symbol} stock={stock} variant="nse" currency="$"
                      onLogTrade={logTrade}
                      onDetail={sym => { setSelectedDetailIsUS(true); setSelectedDetail(sym); }}
                      isWatchlisted={watchlist.some(w => w.symbol === stock.symbol)}
                      onToggleWatchlist={toggleWatchlist}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── US HIGH CONVICTION ── */}
            {market === 'US_HC' && (
              <>
                <HistoryPanel
                  key="us-hc-panel"
                  histData={usHcHistorical}
                  stats={usHcStats}
                  selectedDate={selectedUsHcDate}
                  onSelect={setSelectedUsHcDate}
                  onClose={() => setSelectedUsHcDate(null)}
                  accentColor="#f59e0b"
                  bannerTheme="amber"
                  TooltipComponent={HCTooltip}
                  onLogTrade={logTrade}
                  onDetail={sym => { setSelectedDetailIsUS(true); setSelectedDetail(sym); }}
                  amountPerTrade={amountPerTrade}
                  setAmountPerTrade={setAmountPerTrade}
                />
                <div className="grid" style={{ marginTop: 24 }}>
                  {usHcData.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px'}}>🎯 No US High Conviction signals at this time.</div>}
                  {usHcData.map(stock => (
                    <StockCard key={stock.symbol} stock={stock} variant="hc" currency="$"
                      onLogTrade={logTrade}
                      onDetail={sym => { setSelectedDetailIsUS(true); setSelectedDetail(sym); }}
                      isWatchlisted={watchlist.some(w => w.symbol === stock.symbol)}
                      onToggleWatchlist={toggleWatchlist}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── WATCHLIST ── */}
            {market === "WATCHLIST" && (
              <>
                <div style={{ marginBottom:'24px', padding:'20px', backgroundColor:'var(--bg-elevated)', borderRadius:'15px', border:'1px solid var(--border-subtle)', display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center' }}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#fbbf24'}}>{watchlist.length}</div><div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>Watchlisted Stocks</div></div>
                  <div style={{fontSize:'0.85rem', color:'var(--text-main)', marginLeft:'auto'}}>Click ⭐ on any stock card to add/remove from watchlist.</div>
                </div>
                {watchlist.length === 0 ? (
                  <div className="no-data" style={{textAlign:'center', padding:'60px'}}>
                    No stocks in watchlist yet.<br/>
                    <span style={{fontSize:'0.9rem', color:'var(--text-dim)'}}>Click the ⭐ star icon on any stock card to add it here.</span>
                  </div>
                ) : (
                  <div className="grid">
                    {watchlist.map((w, i) => (
                      <StockCard
                        key={w.symbol}
                        stock={w.stock}
                        variant="nse"
                        currency="₹"
                        onLogTrade={logTrade}
                        onDetail={setSelectedDetail}
                        isWatchlisted={true}
                        onToggleWatchlist={toggleWatchlist}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── PORTFOLIO ── */}
            {market === "PORTFOLIO" && (
              <PortfolioGrid portfolio={portfolio} setPortfolio={setPortfolio} />
            )}

            {/* ── MULTIBAGGER ── */}
            {market === "MULTIBAGGER" && (
              <>
                <div style={{ marginBottom:'24px', padding:'24px', background:'linear-gradient(135deg, #1a0533 0%, var(--bg-base) 100%)', borderRadius:'15px', border:'1px solid #7c3aed44' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
                    <div>
                      <h2 style={{ color:'#e2e8f0', margin:0, fontSize:'1.3rem' }}>🧠 Renaissance Multibagger Engine</h2>
                      <p style={{ color:'#94a3b8', margin:'4px 0 0', fontSize:'0.85rem' }}>Quantitative anomaly detection · R² trend analysis · Volume accumulation scoring</p>
                    </div>
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
                      <button onClick={() => setMbView('live')} style={{ padding:'8px 16px', borderRadius:'8px', border: mbView==='live' ? '1px solid #a855f7' : '1px solid var(--border-muted)', background: mbView==='live' ? 'rgba(168,85,247,0.2)' : 'var(--bg-elevated)', color: mbView==='live' ? '#a855f7' : 'var(--text-main)', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600', boxShadow: mbView==='live' ? '0 2px 8px rgba(168,85,247,0.25)' : 'none' }}>📡 Live Predictions</button>
                      <button onClick={() => { setMbView('backtest'); if (!mbBacktest) { setMbLoading(true); const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000"; fetch(`${baseUrl}/api/multibagger/backtest?years_ago=${mbYearsAgo}`).then(r=>r.json()).then(res=>{setMbBacktest(res);setMbLoading(false)}).catch(()=>setMbLoading(false)); } }} style={{ padding:'8px 16px', borderRadius:'8px', border: mbView==='backtest' ? '1px solid #a855f7' : '1px solid var(--border-muted)', background: mbView==='backtest' ? 'rgba(168,85,247,0.2)' : 'var(--bg-elevated)', color: mbView==='backtest' ? '#a855f7' : 'var(--text-main)', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600', boxShadow: mbView==='backtest' ? '0 2px 8px rgba(168,85,247,0.25)' : 'none' }}>⏳ Historical Proof</button>
                    </div>
                  </div>

                  {mbView === 'live' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap', marginTop:'12px', padding:'12px 16px', background:'rgba(168,85,247,0.08)', borderRadius:'10px', border:'1px solid #7c3aed33' }}>
                      <span style={{ fontSize:'0.85rem', color:'#c084fc' }}>
                        {mbLastUpdated ? <><span style={{ color:'#94a3b8' }}>Last scan: </span><strong style={{ color: '#c084fc' }}>{formatScanTimestamp(mbLastUpdated)}</strong></> : <span style={{ color:'#94a3b8' }}>No scan yet — click Refresh to run.</span>}
                      </span>
                      <button type="button" disabled={mbLoading} onClick={() => loadMultibagger(true)} style={{ marginLeft:'auto', padding:'8px 18px', borderRadius:'8px', border:'1px solid #a855f7', background: mbLoading ? '#334155' : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color:'#fff', cursor: mbLoading ? 'not-allowed' : 'pointer', fontSize:'0.85rem', fontWeight:'700', boxShadow:'0 4px 14px rgba(124,58,237,0.3)', opacity: mbLoading ? 0.6 : 1 }}>{mbLoading ? 'Scanning…' : '↻ Refresh Scan'}</button>
                      {mbRemoteScanning && <span style={{ fontSize:'0.8rem', color:'#c084fc', width:'100%' }}>⏳ A full scan is still running on the server — refresh again shortly.</span>}
                    </div>
                  )}

                  {mbView === 'backtest' && (
                    <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap', marginTop:'12px' }}>
                      <span style={{ fontSize:'0.85rem', color:'#c084fc' }}>
                        {mbLastUpdated ? <><span style={{ color:'#94a3b8' }}>Last live scan: </span><strong style={{ color: '#c084fc' }}>{formatScanTimestamp(mbLastUpdated)}</strong></> : <span style={{ color:'#94a3b8' }}>No live scan yet — switch to Live Predictions to run.</span>}
                      </span>
                      <div style={{ display:'flex', gap:'8px', marginLeft:'auto' }}>
                        {[1, 2, 3].map(y => (
                          <button key={y} onClick={() => { setMbYearsAgo(y); setMbBacktest(null); setMbLoading(true); const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000"; fetch(`${baseUrl}/api/multibagger/backtest?years_ago=${y}`).then(r=>r.json()).then(res=>{setMbBacktest(res);setMbLoading(false)}).catch(()=>setMbLoading(false)); }} style={{ padding:'6px 14px', borderRadius:'8px', border: mbYearsAgo===y ? '1px solid #a855f7' : '1px solid #334155', background: mbYearsAgo===y ? 'rgba(168,85,247,0.2)' : 'transparent', color: mbYearsAgo===y ? '#c084fc' : '#64748b', cursor:'pointer', fontSize:'0.8rem' }}>{y} Year{y>1?'s':''} Ago</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {mbView === 'backtest' && mbBacktest && !mbLoading && (
                    <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
                      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color: mbBacktest.avg_return >= 0 ? '#4ade80' : '#f87171' }}>{mbBacktest.avg_return > 0 ? '+' : ''}{mbBacktest.avg_return}%</div><div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>AI Portfolio Return</div></div>
                      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color: mbBacktest.nifty_return >= 0 ? '#4ade80' : '#f87171' }}>{mbBacktest.nifty_return > 0 ? '+' : ''}{mbBacktest.nifty_return}%</div><div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Nifty 50 Benchmark</div></div>
                      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color:'#c084fc' }}>{mbBacktest.num_picks}</div><div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Stocks Picked</div></div>
                      <div style={{ textAlign:'center' }}><div style={{ fontSize:'2rem', fontWeight:'800', color: (mbBacktest.avg_return - mbBacktest.nifty_return) >= 0 ? '#4ade80' : '#f87171' }}>{(mbBacktest.avg_return - mbBacktest.nifty_return) > 0 ? '+' : ''}{(mbBacktest.avg_return - mbBacktest.nifty_return).toFixed(1)}%</div><div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Alpha vs Nifty</div></div>
                    </div>
                  )}
                </div>

                {mbLoading ? (
                  <div className="loader">🧠 Renaissance engine scanning {mbView === 'backtest' ? 'historical data' : '60+ NSE stocks'}…<br /><span style={{fontSize:'0.9rem',opacity:0.6}}>This may take 30-60 seconds.</span></div>
                ) : (
                  <div className="grid">
                    {(mbView === 'live' ? mbData : (mbBacktest?.picks || [])).map((stock, i) => (
                      <StockCard
                        key={stock.symbol}
                        stock={{ ...stock, action: 'STRONG BUY', entry: stock.current_price, confidence: stock.score }}
                        variant="multibagger"
                        currency="₹"
                        showBacktest={false}
                        rank={i + 1}
                        onDetail={setSelectedDetail}
                        isWatchlisted={watchlist.some(w => w.symbol === stock.symbol)}
                        onToggleWatchlist={toggleWatchlist}
                      />
                    ))}
                    {mbView === 'live' && mbLastUpdated && mbData.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'60px'}}>No multibagger candidates found matching the strict criteria.</div>}
                    {mbView === 'backtest' && mbBacktest && (mbBacktest.picks || []).length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'60px'}}>No multibagger candidates found in this historical period.</div>}
                  </div>
                )}
              </>
            )}

            {/* ── ACTIVE_SIGNALS ── */}
            {market === "ACTIVE_SIGNALS" && (
              <>
                <div style={{ marginBottom:'24px', padding:'20px', backgroundColor:'#0d1f12', borderRadius:'15px', border:'1px solid #166534', display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center' }}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#4ade80'}}>{activeSignals.length}</div><div style={{fontSize:'0.8rem', color:'#86efac', opacity:0.8}}>Open Positions</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#4ade80'}}>{activeSignals.filter(s=>s.growth_pct>=0).length}</div><div style={{fontSize:'0.8rem', color:'#86efac', opacity:0.8}}>In Profit</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#f87171'}}>{activeSignals.filter(s=>s.growth_pct<0).length}</div><div style={{fontSize:'0.8rem', color:'#fca5a5', opacity:0.8}}>Below Entry</div></div>
                  <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px' }}>
                    <div style={{ display:'flex', gap:'6px', background:'rgba(0,0,0,0.3)', padding:'4px', borderRadius:'8px' }}>
                      <button onClick={() => setActiveFilter('NSE')} style={{ padding:'6px 12px', borderRadius:'6px', border:'none', background: activeFilter==='NSE' ? '#22c55e' : 'transparent', color: activeFilter==='NSE' ? '#fff' : '#86efac', cursor:'pointer', fontSize:'0.75rem', fontWeight:'700' }}>NSE Only</button>
                      <button onClick={() => setActiveFilter('HC')} style={{ padding:'6px 12px', borderRadius:'6px', border:'none', background: activeFilter==='HC' ? '#fbbf24' : 'transparent', color: activeFilter==='HC' ? '#000' : '#86efac', cursor:'pointer', fontSize:'0.75rem', fontWeight:'700' }}>HC Only</button>
                      <button onClick={() => setActiveFilter('ALL')} style={{ padding:'6px 12px', borderRadius:'6px', border:'none', background: activeFilter==='ALL' ? '#3b82f6' : 'transparent', color: activeFilter==='ALL' ? '#fff' : '#86efac', cursor:'pointer', fontSize:'0.75rem', fontWeight:'700' }}>Both</button>
                    </div>
                    <div style={{ fontSize:'0.8rem', color:'#86efac', opacity:0.7 }}>Signals still open (no TP/SL hit). Sorted best to worst.</div>
                  </div>
                </div>
                {activeSignals.length === 0 ? (
                  <div className="no-data" style={{textAlign:'center', padding:'60px'}}>Loading active signals... Switch to All NSE or HC tab first so data can load.</div>
                ) : (
                  <div className="grid">
                    {activeSignals.map((stock, i) => (
                      <StockCard
                        key={`${stock.symbol}-${stock.signalDate}-${i}`}
                        stock={{ ...stock, action: 'ACTIVE' }}
                        variant="active"
                        currency="₹"
                        showBacktest={false}
                        onLogTrade={logTrade}
                        onDetail={setSelectedDetail}
                        isWatchlisted={watchlist.some(w => w.symbol === stock.symbol)}
                        onToggleWatchlist={toggleWatchlist}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── BUDGET ── */}
            {market === "BUDGET" && (
              <BudgetPlanner
                data={data}
                hcData={hcData}
                budgetCapital={budgetCapital}
                setBudgetCapital={setBudgetCapital}
                amountPerTrade={amountPerTrade}
                setAmountPerTrade={setAmountPerTrade}
                qtyPerTrade={qtyPerTrade}
                setQtyPerTrade={setQtyPerTrade}
                logTrade={logTrade}
                setSelectedDetail={setSelectedDetail}
              />
            )}

            {/* ── SIGNAL HISTORY ── */}
            {market === "SIGNAL_HISTORY" && (
              <>
                <div style={{ marginBottom:'24px', padding:'20px', backgroundColor:'var(--bg-elevated)', borderRadius:'15px', border:'1px solid var(--border-subtle)', display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center' }}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#3b82f6'}}>{portfolio.length}</div><div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>Opened Trades</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#22c55e'}}>{portfolio.filter(p => p.status === 'OPEN').length}</div><div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>Active Positions</div></div>
                  <div style={{textAlign:'center'}}><div style={{fontSize:'2rem', fontWeight:'800', color:'#f59e0b'}}>{portfolio.filter(p => p.status === 'CLOSED').length}</div><div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>Closed Trades</div></div>
                  <div style={{fontSize:'0.85rem', color:'var(--text-main)', marginLeft:'auto'}}>View all your trade entries with quantity and buy price.</div>
                </div>
                {portfolio.length === 0 ? (
                  <div className="no-data" style={{textAlign:'center', padding:'60px'}}>
                    No trades logged yet.<br/>
                    <span style={{fontSize:'0.9rem', color:'var(--text-dim)'}}>Click "Log Trade" on any stock card to add entries here.</span>
                  </div>
                ) : (
                  <div className="grid">
                    {portfolio.map((trade, i) => (
                      <div key={trade.id} style={{ background:'var(--bg-card)', borderRadius:'12px', border:'1px solid var(--border-subtle)', padding:'20px', position:'relative' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                          <h3 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'var(--text-bright)' }}>{trade.symbol}</h3>
                          <span style={{ padding:'4px 10px', borderRadius:'6px', fontSize:'0.75rem', fontWeight:600, background: trade.status === 'OPEN' ? '#22c55e22' : '#f59e0b22', color: trade.status === 'OPEN' ? '#22c55e' : '#f59e0b' }}>{trade.status}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                          <div>
                            <div style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>Quantity</div>
                            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)' }}>{trade.qty} shares</div>
                          </div>
                          <div>
                            <div style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>Entry Price</div>
                            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)' }}>₹{trade.buyPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>Total Investment</div>
                            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)' }}>₹{(trade.qty * trade.buyPrice).toFixed(2)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>Date</div>
                            <div style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)' }}>{trade.date}</div>
                          </div>
                        </div>
                        {trade.status === 'CLOSED' && (
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', paddingTop:'12px', borderTop:'1px solid var(--border-subtle)' }}>
                            <div>
                              <div style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>Exit Price</div>
                              <div style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-main)' }}>₹{trade.exitPrice?.toFixed(2) || '-'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:'0.75rem', color:'var(--text-dim)' }}>P&L</div>
                              <div style={{ fontSize:'1.1rem', fontWeight:700, color: (trade.exitPrice - trade.buyPrice) >= 0 ? '#22c55e' : '#ef4444' }}>
                                {trade.exitPrice ? `₹${((trade.exitPrice - trade.buyPrice) * trade.qty).toFixed(2)}` : '-'}
                              </div>
                            </div>
                          </div>
                        )}
                        <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                          {trade.status === 'OPEN' && (
                            <button onClick={() => closeTrade(trade.id)} style={{ flex:1, padding:'8px', borderRadius:'6px', border:'none', background:'#3b82f6', color:'#fff', fontSize:'0.8rem', fontWeight:600, cursor:'pointer' }}>
                              Close Position
                            </button>
                          )}
                          <button onClick={() => deleteTrade(trade.id)} style={{ padding:'8px 12px', borderRadius:'6px', border:'1px solid var(--border-muted)', background:'transparent', color:'var(--text-dim)', fontSize:'0.8rem', cursor:'pointer' }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── ADAPTIVE ENGINE ── */}
        {market === "ADAPTIVE" && (
          <div style={{ animation: 'fade-in 0.4s ease-out', paddingBottom: '30px' }}>
            <div style={{ marginBottom: '24px', padding: '24px', background: 'linear-gradient(135deg, rgba(30,27,75,0.7) 0%, rgba(15,23,42,0.9) 100%)', borderRadius: '16px', border: '1px solid #6366f144', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h2 style={{ color: '#c7d2fe', margin: '0 0 6px 0', fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{ fontSize: '1.8rem' }}>🧠</span> Adaptive ML Engine
                    {adaptiveStatus && (<span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', padding: '3px 8px', borderRadius: '12px', border: '1px solid #6366f155', marginLeft: '8px' }}>v{adaptiveStatus.engine_version || '1.0.0'}</span>)}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0', fontSize: '0.9rem', maxWidth: '600px' }}>The quantitative engine continuously learns from closed trades. Probability thresholds and filter gates automatically calibrate daily to optimize the profit factor and win-rate.</p>
                </div>
                {adaptiveStatus && adaptiveStatus.outcome_stats && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}><div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Data Points</div><div style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 'bold' }}>{adaptiveStatus.outcome_stats.total_trades_logged || 0}</div></div>
                    <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.05)' }}><div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Overall WR</div><div style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 'bold' }}>{adaptiveStatus.outcome_stats.overall_win_rate || 0}%</div></div>
                  </div>
                )}
              </div>
              {adaptiveStatus?.retrain_recommended && (
                <div style={{ marginTop: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef444455', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span> Model Retrain Recommended: The moving average win-rate has dropped below standard baseline.
                </div>
              )}
            </div>

            {!adaptiveStatus ? (
              <div className="loader">Connecting to Engine Core...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                <div className="card-plain" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <div className="card-header-plain" style={{ marginBottom: '20px', borderBottom: 'none', paddingBottom: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.1rem' }}>Calibrated Thresholds</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Logistic Regression updated</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: '10px', position: 'relative' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 500 }}>Standard Probability</div><div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>≥ {adaptiveStatus.calibrated_thresholds?.STD_PROB_UP?.toFixed(2)}</div><div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '0.65rem', color: 'var(--text-main)', background: 'var(--border-subtle)', padding: '2px 6px', borderRadius: '4px' }}>Base</div></div>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: '10px', position: 'relative' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 500 }}>High Conviction Prob</div><div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>≥ {adaptiveStatus.calibrated_thresholds?.HC_PROB_UP?.toFixed(2)}</div><div style={{ position: 'absolute', top: '14px', right: '14px', fontSize: '0.65rem', color: 'var(--accent-purple)', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Strict</div></div>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: '10px' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 500 }}>Standard Vol Spike</div><div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>≥ {adaptiveStatus.calibrated_thresholds?.STD_VOL_RATIO?.toFixed(1)}x</div></div>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: '10px' }}><div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 500 }}>HC Vol Spike</div><div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>≥ {adaptiveStatus.calibrated_thresholds?.HC_VOL_RATIO?.toFixed(1)}x</div></div>
                  </div>
                </div>

                <div className="card-plain" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                  <div className="card-header-plain" style={{ marginBottom: '20px', borderBottom: 'none', paddingBottom: 0 }}>
                    <h3 style={{ margin: 0, color: 'var(--accent-purple)', fontSize: '1.1rem' }}>Optimized Quality Gates</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Grid-Search updated</div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>RSI Sweet Spot</span><span style={{ fontSize: '0.85rem', color: 'var(--accent-purple)', fontWeight: 'bold' }}>{adaptiveStatus.optimized_gates?.rsi_min} — {adaptiveStatus.optimized_gates?.rsi_max}</span></div>
                    <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', position: 'relative' }}><div style={{ position: 'absolute', left: `${adaptiveStatus.optimized_gates?.rsi_min}%`, width: `${(adaptiveStatus.optimized_gates?.rsi_max || 100) - (adaptiveStatus.optimized_gates?.rsi_min || 0)}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-purple), #8b5cf6)', borderRadius: '3px' }} /></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', marginBottom: '10px' }}><div><div style={{ fontSize: '0.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>Trend Strength (ADX)</div><div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>Minimum directional movement</div></div><div style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>≥ {adaptiveStatus.optimized_gates?.adx_min}</div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}><div><div style={{ fontSize: '0.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>MACD Required</div><div style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>Must show bullish histogram</div></div><div style={{ color: adaptiveStatus.optimized_gates?.macd_positive ? 'var(--up-color)' : 'var(--text-main)', fontWeight: 'bold' }}>{adaptiveStatus.optimized_gates?.macd_positive ? 'True ✅' : 'False'}</div></div>
                </div>
              </div>
            )}
            
            {/* LLM Postmortems Section */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ color: 'var(--accent-purple)', fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🤖</span> LLM Trade Post-Mortems
              </h3>
              {postmortems.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  {postmortems.map((pm, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px' }}>
                      {pm.type === "batch_insights" ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--text-bright)' }}>Batch Learning Insights ({pm.trades} trades)</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                              {pm.timestamp ? new Date(pm.timestamp).toLocaleDateString() : ''}
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                            {pm.insights}
                          </p>
                        </>
                      ) : (
                        <>
                          {/* Header Row: Symbol + Signal Type + Outcome + Date */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '1.2rem', color: 'var(--text-bright)' }}>{pm.symbol}</strong>
                              <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '5px', fontWeight: 'bold',
                                background: pm.outcome === 'WIN' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: pm.outcome === 'WIN' ? 'var(--up-color)' : 'var(--down-color)',
                              }}>{pm.outcome}</span>
                              <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '5px', fontWeight: 'bold', letterSpacing: '0.5px',
                                background: pm.signal_type === 'HC' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)',
                                color: pm.signal_type === 'HC' ? '#fbbf24' : '#60a5fa',
                              }}>{pm.signal_type === 'HC' ? '🎯 HIGH CONVICTION' : '📊 STANDARD BUY'}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signal Date</div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 600 }}>{pm.date || ''}</div>
                            </div>
                          </div>

                          {/* Trade Stats Row */}
                          {(pm.entry_price || pm.pnl_pct !== undefined) && (
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
                              {pm.entry_price != null && (
                                <div style={{ minWidth: '80px' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entry</div>
                                  <div style={{ fontSize: '0.95rem', color: 'var(--text-bright)', fontWeight: 600 }}>₹{pm.entry_price}</div>
                                </div>
                              )}
                              {pm.exit_price != null && (
                                <div style={{ minWidth: '80px' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exit</div>
                                  <div style={{ fontSize: '0.95rem', color: 'var(--text-bright)', fontWeight: 600 }}>₹{pm.exit_price}</div>
                                </div>
                              )}
                              {pm.pnl_pct != null && (
                                <div style={{ minWidth: '70px' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>P&L</div>
                                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: pm.pnl_pct >= 0 ? 'var(--up-color)' : 'var(--down-color)' }}>{pm.pnl_pct >= 0 ? '+' : ''}{pm.pnl_pct}%</div>
                                </div>
                              )}
                              {pm.days_held != null && (
                                <div style={{ minWidth: '60px' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Held</div>
                                  <div style={{ fontSize: '0.95rem', color: 'var(--text-bright)', fontWeight: 600 }}>{pm.days_held}d</div>
                                </div>
                              )}
                              {pm.confidence != null && (
                                <div style={{ minWidth: '70px' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confidence</div>
                                  <div style={{ fontSize: '0.95rem', color: '#a78bfa', fontWeight: 600 }}>{pm.confidence}%</div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Indicators Row */}
                          {pm.indicators && Object.values(pm.indicators).some(v => v != null) && (
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              {pm.indicators.rsi != null && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontWeight: 500 }}>RSI: {pm.indicators.rsi}</span>
                              )}
                              {pm.indicators.adx != null && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontWeight: 500 }}>ADX: {pm.indicators.adx}</span>
                              )}
                              {pm.indicators.macd_hist != null && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: pm.indicators.macd_hist >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: pm.indicators.macd_hist >= 0 ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 500 }}>MACD: {pm.indicators.macd_hist}</span>
                              )}
                              {pm.indicators.volume_ratio != null && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 500 }}>Vol: {pm.indicators.volume_ratio}x</span>
                              )}
                              {pm.indicators.bb_pct != null && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(244,114,182,0.1)', color: '#f472b6', fontWeight: 500 }}>BB%: {pm.indicators.bb_pct}</span>
                              )}
                              {pm.indicators.stoch_k != null && (
                                <span style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(34,211,238,0.1)', color: '#22d3ee', fontWeight: 500 }}>Stoch K: {pm.indicators.stoch_k}</span>
                              )}
                            </div>
                          )}

                          {/* LLM Analysis Text */}
                          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                            {pm.postmortem || "No analysis available."}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
                  <span style={{ fontSize: '2rem', opacity: 0.8 }}>🕵️‍♂️</span>
                  <p style={{ color: 'var(--text-main)', marginTop: '12px', fontSize: '0.95rem', fontWeight: 500 }}>No trades have closed yet. Once a trade hits its target or stoploss, the LLM will analyze the outcome and post its insights here.</p>
                </div>
              )}
            </div>
            
          </div>
        )}
        
        {/* ── SETTINGS ── */}
        {market === "SETTINGS" && (
          <div style={{ animation: 'fade-in 0.4s ease-out', display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            {/* Trading Parameters */}
            <div className="card-plain" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
              <h3 style={{ margin: '0 0 20px', color: 'var(--accent-purple)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>💰 Trading Parameters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Total Portfolio Capital (₹)</label>
                  <input type="number" value={budgetCapital} onChange={e => setBudgetCapital(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-bright)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Amount Per Trade (₹)</label>
                  <input type="number" value={amountPerTrade} onChange={e => setAmountPerTrade(Number(e.target.value))} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-bright)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Risk Per Trade (%)</label>
                  <input type="number" value={budgetRiskPct} onChange={e => setBudgetRiskPct(Number(e.target.value))} min={0.5} max={10} step={0.5} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-bright)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Max Positions</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>{Math.floor(budgetCapital / amountPerTrade)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Risk Amount</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--down-color)' }}>₹{Math.round(amountPerTrade * budgetRiskPct / 100)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Preferences */}
            <div className="card-plain" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
              <h3 style={{ margin: '0 0 20px', color: 'var(--accent-purple)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🎨 Display & Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div><div style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 600 }}>Theme</div><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Switch between light and dark</div></div>
                  <button onClick={toggleTheme} style={{ padding: '6px 16px', borderRadius: '8px', background: 'var(--accent-purple)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div><div style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 600 }}>Default Market</div><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Starting scanner tab</div></div>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>High Conviction</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div><div style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 600 }}>Currency</div><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Display currency for prices</div></div>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>₹ INR</span>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="card-plain" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
              <h3 style={{ margin: '0 0 20px', color: 'var(--accent-purple)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>🗄️ Data Management</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div><div style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 600 }}>Portfolio Entries</div><div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Locally stored trade logs</div></div>
                  <span style={{ color: 'var(--text-bright)', fontWeight: 'bold' }}>{portfolio.length}</span>
                </div>
                <button onClick={() => { if (confirm('Clear all portfolio data? This cannot be undone.')) { setPortfolio([]); localStorage.removeItem('swing_portfolio'); } }} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Clear Portfolio Data</button>
                <button onClick={() => { sessionStorage.removeItem('tf_auth'); window.location.reload(); }} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Sign Out</button>
              </div>
            </div>

            {/* App Info */}
            <div className="card-plain" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
              <h3 style={{ margin: '0 0 20px', color: 'var(--accent-purple)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>ℹ️ About TradeFlex</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[['Version', 'v5.0'], ['Engine', 'Adaptive ML + LLM Post-Mortem'], ['Markets', 'NSE (India), US Equities'], ['Data Source', 'Yahoo Finance + Google Sheets'], ['AI Models', 'Groq LLaMA 3.3 70B + OpenRouter Claude'], ['SSL', "Let's Encrypt"]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{k}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-bright)', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '40px 0 20px', color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 600 }}>
          Developed by <span style={{ color: '#ef4444' }}>❤️</span> Kaushik Poojari
        </div>
      </main>

      {/* Stock detail drawer */}
      {selectedDetail && (
        <>
          <div onClick={() => { setSelectedDetail(null); setSelectedDetailIsUS(false); }} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, backdropFilter:'blur(2px)' }} />
          <StockDetailDrawer symbol={selectedDetail} isUS={selectedDetailIsUS} onClose={() => { setSelectedDetail(null); setSelectedDetailIsUS(false); }} />
        </>
      )}

      {/* Sector insight modal */}
      {sectorInsight && (
        <>
          <div onClick={() => setSectorInsight(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, backdropFilter:'blur(2px)' }} />
          <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%, -50%)', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderRadius:'16px', padding:'24px', zIndex:1000, minWidth:'320px', boxShadow:'var(--shadow-hover)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ margin:0, color:'#f8fafc', fontSize:'1.2rem', display:'flex', alignItems:'center', gap:'8px' }}><span style={{ fontSize:'1.4rem' }}>🏆</span>{sectorInsight.sector} Leader</h3>
              <button onClick={() => setSectorInsight(null)} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            {sectorInsight.loading ? (
              <div style={{ padding:'30px', textAlign:'center', color:'#94a3b8' }}><div style={{ marginBottom:'12px' }}>Hunting for the top gainer...</div></div>
            ) : sectorInsight.error ? (
              <div style={{ padding:'20px', textAlign:'center', color:'#f87171' }}>{sectorInsight.error}</div>
            ) : sectorInsight.data ? (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'20px', cursor:'pointer', transition:'transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(56,189,248,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; }}
                onClick={() => { setSectorInsight(null); setSelectedDetail(sectorInsight.data.symbol); }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                  <h2 style={{ margin:0, fontSize:'1.6rem', color:'#38bdf8' }}>{sectorInsight.data.symbol}</h2>
                  <div style={{ background: sectorInsight.data.change_pct >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: sectorInsight.data.change_pct >= 0 ? '#4ade80' : '#f87171', padding:'6px 12px', borderRadius:'8px', fontWeight:'bold', fontSize:'1.1rem' }}>{sectorInsight.data.change_pct > 0 ? '+' : ''}{sectorInsight.data.change_pct}%</div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'16px' }}>
                  <span style={{ color:'#94a3b8', fontSize:'0.9rem' }}>Current Price</span>
                  <strong style={{ color:'#f8fafc', fontSize:'1.1rem' }}>₹{sectorInsight.data.current_price}</strong>
                </div>
                <div style={{ marginTop:'16px', fontSize:'0.8rem', color:'#64748b', textAlign:'center' }}>Click to analyze fundamentals</div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('tf_auth') === 'true';
  });

  const handleLogout = () => {
    sessionStorage.removeItem('tf_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {
      sessionStorage.setItem('tf_auth', 'true');
      setIsAuthenticated(true);
    }} />;
  }

  return <MainApp onLogout={handleLogout} />;
}
