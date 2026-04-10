import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import './App.css'

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

const FilterToolbar = ({ filters, setFilters }) => {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Filters:</span>
      <select 
        value={filters.sortBy} 
        onChange={e => setFilters({...filters, sortBy: e.target.value})}
        style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', fontSize: '0.85rem' }}
      >
        <option value="confidence">Sort by AI Confidence</option>
        <option value="volume">Sort by Volume Surge</option>
        <option value="growth">Sort by Today's Gain</option>
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
        <input 
          type="checkbox" 
          checked={filters.highConfidence} 
          onChange={e => setFilters({...filters, highConfidence: e.target.checked})} 
        />
        Confidence {'>'} 75%
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
        <input 
          type="checkbox" 
          checked={filters.highVolume} 
          onChange={e => setFilters({...filters, highVolume: e.target.checked})} 
        />
        Vol Surge {'>'} 2x
      </div>
    </div>
  );
};

const SectorGauge = ({ portfolio }) => {
  const sectors = portfolio.reduce((acc, trade) => {
    const sec = trade.sector || 'Unknown';
    acc[sec] = (acc[sec] || 0) + (trade.buyPrice * trade.qty);
    return acc;
  }, {});
  
  const total = Object.values(sectors).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '16px', border: 'var(--glass-border)', marginBottom: '30px' }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sector Concentration</h3>
      <div style={{ display: 'flex', gap: '8px', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
        {Object.entries(sectors).map(([name, value], i) => (
          <div 
            key={name}
            style={{ 
              width: `${(value/total)*100}%`, 
              background: `hsl(${i * 45}, 70%, 60%)`,
              height: '100%'
            }} 
            title={`${name}: ${((value/total)*100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '12px' }}>
        {Object.entries(sectors).map(([name, value], i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: `hsl(${i * 45}, 70%, 60%)` }} />
            <span style={{ color: '#94a3b8' }}>{name} ({((value/total)*100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const cls = status === 'TARGET HIT' ? 'target-hit' : status === 'SL HIT' ? 'sl-hit' : status === 'STRONG BUY' ? 'strong-buy' : status === 'BUY' ? 'buy' : 'active';
  return <span className={`badge ${cls}`}>{status}</span>;
};

function StockDetailDrawer({ symbol, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`${baseUrl}/api/stock_detail/${symbol}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  const gate = (label, pass, value) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background: pass ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', borderRadius:'8px', marginBottom:'6px', border:`1px solid ${pass ? '#4ade8033' : '#f8717133'}` }}>
      <span style={{fontSize:'0.85rem', color:'#94a3b8'}}>{label}</span>
      <span style={{fontWeight:'bold', color: pass ? '#4ade80' : '#f87171'}}>{value} {pass ? '✅' : '❌'}</span>
    </div>
  );

  return (
    <AnimatePresence>
      {symbol && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, backdropFilter:'blur(4px)' }} 
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position:'fixed', top:0, right:0, width:'min(480px, 100vw)', height:'100vh', background:'rgba(15, 23, 42, 0.85)', backdropFilter:'blur(16px)', borderLeft:'1px solid rgba(56,189,248,0.2)', zIndex:1000, overflowY:'auto', boxShadow:'-10px 0 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding:'20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, background:'rgba(15, 23, 42, 0.95)', zIndex:1, backdropFilter:'blur(10px)' }}>
        <div>
          <h2 style={{ margin:0, color:'#f8fafc', fontSize:'1.4rem' }}>{symbol}</h2>
          {detail && <div style={{ color:'#64748b', fontSize:'0.85rem', marginTop:'2px' }}>{detail.company_name}</div>}
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.6rem', lineHeight:1 }}>×</button>
      </div>

      {loading ? (
        <div style={{ padding:'40px', textAlign:'center', color:'#64748b' }}>Loading data...</div>
      ) : !detail ? (
        <div style={{ padding:'40px', textAlign:'center', color:'#f87171' }}>Failed to load data.</div>
      ) : (
        <div style={{ padding:'20px' }}>

          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
            {[['Sector', detail.sector], ['Industry', detail.industry], ['Market Cap', detail.market_cap], ['Current Price', detail.current_price ? `₹${Number(detail.current_price).toFixed(2)}` : 'N/A']].map(([k,v]) => (
              <div key={k} style={{ background:'#1e293b', borderRadius:'10px', padding:'12px' }}>
                <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:'4px' }}>{k}</div>
                <div style={{ fontWeight:'bold', color:'#e2e8f0', wordBreak:'break-word' }}>{v || 'N/A'}</div>
              </div>
            ))}
          </div>

          {/* Signal Logic */}
          <h3 style={{ color:'#e2e8f0', marginBottom:'12px', fontSize:'1rem' }}>🧠 Why This Signal Triggered</h3>
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

          {/* 52W Range */}
          {(detail.week_52_high || detail.week_52_low) && (
            <div style={{ marginBottom:'20px', background:'#1e293b', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:'8px' }}>52-Week Range</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem' }}>
                <span style={{ color:'#f87171' }}>₹{Number(detail.week_52_low).toFixed(2)}</span>
                <span style={{ color:'#4ade80' }}>₹{Number(detail.week_52_high).toFixed(2)}</span>
              </div>
              <div style={{ height:'6px', background:'#334155', borderRadius:'3px', marginTop:'6px', position:'relative' }}>
                {detail.week_52_low && detail.week_52_high && detail.current_price && (
                  <div style={{ position:'absolute', left:`${Math.min(100, Math.max(0, ((detail.current_price - detail.week_52_low)/(detail.week_52_high - detail.week_52_low))*100))}%`, top: '-3px', width:'12px', height:'12px', background:'#38bdf8', borderRadius:'50%', transform:'translateX(-50%)' }} />
                )}
              </div>
            </div>
          )}

          {/* Fundamentals */}
          <h3 style={{ color:'#e2e8f0', marginBottom:'12px', fontSize:'1rem' }}>📊 Fundamentals</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
            {[
              ['P/E Ratio', detail.pe_ratio],
              ['P/B Ratio', detail.pb_ratio],
              ['ROE', detail.roe != null ? `${detail.roe}%` : null],
              ['Debt/Equity', detail.debt_to_equity],
              ['Revenue Growth', detail.revenue_growth != null ? `${detail.revenue_growth}%` : null],
              ['Earnings Growth', detail.earnings_growth != null ? `${detail.earnings_growth}%` : null],
              ['Dividend Yield', detail.dividend_yield != null ? `${detail.dividend_yield}%` : null],
              ['Beta', detail.beta],
              ['Analyst Rating', detail.analyst_rating],
              ['Analyst Target', detail.target_mean_price ? `₹${detail.target_mean_price}` : null],
            ].map(([k, v]) => (
              <div key={k} style={{ background:'#1e293b', borderRadius:'8px', padding:'10px' }}>
                <div style={{ fontSize:'0.72rem', color:'#64748b' }}>{k}</div>
                <div style={{ fontWeight:'bold', color: v ? '#e2e8f0' : '#334155', fontSize:'0.95rem' }}>{v || 'N/A'}</div>
              </div>
            ))}
          </div>

          {/* Business Description */}
          {detail.description && detail.description !== 'No description available.' && (
            <div style={{ marginBottom:'20px' }}>
              <h3 style={{ color:'#e2e8f0', marginBottom:'8px', fontSize:'1rem' }}>🏢 About</h3>
              <p style={{ color:'#94a3b8', fontSize:'0.83rem', lineHeight:'1.6', margin:0 }}>{detail.description.slice(0, 500)}{detail.description.length > 500 ? '...' : ''}</p>
            </div>
          )}

          {/* News */}
          {detail.news && detail.news.length > 0 && (
            <div>
              <h3 style={{ color:'#e2e8f0', marginBottom:'12px', fontSize:'1rem' }}>📰 Latest News</h3>
              {detail.news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" style={{ display:'block', textDecoration:'none', marginBottom:'10px', padding:'12px', background:'#1e293b', borderRadius:'8px', border:'1px solid #334155', transition:'border-color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#38bdf8'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#334155'}>
                  <div style={{ color:'#e2e8f0', fontSize:'0.85rem', fontWeight:'500', marginBottom:'4px', lineHeight:'1.4' }}>{n.title}</div>
                  <div style={{ color:'#475569', fontSize:'0.75rem' }}>{n.source} · {n.published?.slice(0, 10)}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      </motion.div>
      </>
      )}
    </AnimatePresence>
  );
}

function StockGrid({ data, currency, capLabel, onLogTrade, onDetail }) {
  if (!data || data.length === 0) return <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--text-dim)'}}>No active signals at this time.</div>;
  
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div className="grid" variants={containerVars} initial="hidden" animate="show">
      {data.map(stock => (
        <motion.div className="card" key={stock.symbol} variants={itemVars} onClick={() => onDetail && onDetail(stock.symbol)} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <h2>{stock.symbol}</h2>
            <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
              <StatusBadge status={stock.action || stock.status} />
              {onLogTrade && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onLogTrade(stock, stock.entry); }} 
                  style={{background:'rgba(56,189,248,0.1)', border:`1px solid var(--accent-color)`, color:'var(--accent-color)', borderRadius:'8px', padding:'6px 12px', fontSize:'0.75rem', cursor:'pointer', fontWeight:'bold'}}
                >+ Log</button>
              )}
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat"><span>Entry</span><strong>{currency}{stock.entry.toFixed(2)}</strong></div>
            <div className="stat"><span>Target</span><strong className="up">{currency}{stock.target.toFixed(2)}</strong></div>
            <div className="stat"><span>Stoploss</span><strong className="down">{currency}{stock.stoploss.toFixed(2)}</strong></div>
            <div className="stat"><span>Confidence</span><strong>{stock.confidence.toFixed(1)}%</strong></div>
            <div className="stat"><span>Vol Spike</span><strong className={stock.volume_ratio > 1.5 ? 'up' : 'wait'}>{stock.volume_ratio.toFixed(2)}x</strong></div>
            {stock.growth_pct !== undefined && <div className="stat"><span>Growth</span><strong className={stock.growth_pct >= 0 ? 'up' : 'down'}>{stock.growth_pct.toFixed(1)}%</strong></div>}
          </div>
          {stock.backtest && (
            <div className="backtest-section">
              <h3>1-3 Month Swing Backtest ({capLabel})</h3>
              <div className="bt-stats">
                <div>Win Rate: <span>{stock.backtest.win_rate.toFixed(1)}%</span></div>
                <div>Sharpe: <span>{stock.backtest.sharpe_ratio.toFixed(2)}</span></div>
                <div>Drawdown: <span className="down">{stock.backtest.max_drawdown.toFixed(1)}%</span></div>
                <div>Return: <span className={stock.backtest.total_return >= 0 ? 'up' : 'down'}>{stock.backtest.total_return.toFixed(1)}%</span></div>
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

function PortfolioGrid({ portfolio, setPortfolio }) {
  if (portfolio.length === 0) return <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--text-dim)'}}>Your portfolio is empty. Click "+ Log" on any signal to add it here.</div>;

  const totalInvested = portfolio.filter(t => t.status==='OPEN').reduce((sum, t) => sum + (t.buyPrice * t.qty), 0);
  const realizedPnL = portfolio.filter(t => t.status==='CLOSED').reduce((sum, t) => sum + ((t.exitPrice - t.buyPrice) * t.qty), 0);

  const closeTrade = (id) => {
    const priceStr = prompt("Enter Exit Price:");
    if (!priceStr) return;
    const exitPrice = Number(priceStr);
    if (isNaN(exitPrice)) return alert("Invalid price");
    setPortfolio(p => p.map(t => t.id === id ? { ...t, status: 'CLOSED', exitPrice } : t));
  };
  
  const addNote = (id) => {
    const note = prompt("Add a trade note (e.g., 'Target reached', 'Stopped out early'):");
    if (note !== null) {
      setPortfolio(p => p.map(t => t.id === id ? { ...t, notes: note } : t));
    }
  };

  const deleteTrade = (id) => {
    if(confirm("Delete this log?")) setPortfolio(p => p.filter(t => t.id !== id));
  };

  return (
    <>
      <SectorGauge portfolio={portfolio} />
      
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'20px', marginBottom:'24px', padding:'25px', background:'var(--panel-bg)', borderRadius:'20px', border:'var(--glass-border)', backdropFilter:'blur(10px)' }}>
         <div>
           <div style={{fontSize:'0.8rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px'}}>Active Investment</div>
           <div style={{fontSize:'2rem', fontWeight:'bold', color:'#38bdf8'}}>₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
         </div>
         <div>
           <div style={{fontSize:'0.8rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px'}}>Realized P&L</div>
           <div style={{fontSize:'2rem', fontWeight:'bold', color: realizedPnL >= 0 ? '#4ade80' : '#f87171'}}>{realizedPnL >= 0 ? '+' : ''}₹{realizedPnL.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
         </div>
      </div>

      <div className="grid">
        {portfolio.map(trade => (
          <div className="card" key={trade.id} style={{ borderColor: trade.status==='CLOSED' ? 'rgba(255,255,255,0.05)' : 'rgba(56,189,248,0.3)' }}>
            <div className="card-header">
              <h2 style={{ fontSize: '1.4rem' }}>{trade.symbol} <span style={{fontSize:'0.85rem', color:'#64748b', fontWeight:'normal'}}>({trade.qty} Qty)</span></h2>
              <StatusBadge status={trade.status} />
            </div>
            {trade.notes && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '15px', fontStyle: 'italic', borderLeft: '3px solid var(--accent-color)' }}>
                "{trade.notes}"
              </div>
            )}
            <div className="stats-grid">
              <div className="stat"><span>Buy Price</span><strong>₹{trade.buyPrice.toFixed(2)}</strong></div>
              <div className="stat"><span>Invested</span><strong>₹{(trade.buyPrice * trade.qty).toFixed(2)}</strong></div>
              {trade.status === 'CLOSED' ? (
                <>
                  <div className="stat"><span>Exit Price</span><strong>₹{trade.exitPrice.toFixed(2)}</strong></div>
                  <div className="stat"><span>P&L</span><strong className={trade.exitPrice >= trade.buyPrice ? 'up' : 'down'}>{trade.exitPrice >= trade.buyPrice ? '+' : ''}₹{((trade.exitPrice - trade.buyPrice) * trade.qty).toFixed(2)}</strong></div>
                </>
              ) : (
                <div className="stat"><span>Date Logged</span><strong style={{fontSize:'1rem'}}>{trade.date}</strong></div>
              )}
            </div>
            <div style={{display:'flex', gap:'8px', marginTop:'10px'}}>
              {trade.status === 'OPEN' && <button onClick={() => closeTrade(trade.id)} style={{flex:1, padding:'10px', background:'rgba(56, 189, 248, 0.1)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.2)', borderRadius:'10px', cursor:'pointer', fontWeight:'600', fontSize:'0.85rem'}}>Close Position</button>}
              <button onClick={() => addNote(trade.id)} style={{ padding:'10px', background:'rgba(255,255,255,0.05)', color:'#94a3b8', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', cursor:'pointer', fontSize:'0.85rem' }}>📝</button>
              <button onClick={() => deleteTrade(trade.id)} style={{ padding:'10px', background:'rgba(248, 113, 113, 0.05)', color:'#f87171', border:'1px solid rgba(248,113,113,0.1)', borderRadius:'10px', cursor:'pointer', fontSize:'0.85rem' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
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
    <div style={{ position:'relative', width: '320px', marginLeft: 'auto', marginRight: '15px' }}>
      <input 
        type="text" 
        placeholder="🔍 Search NSE stock / company..." 
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width:'100%', padding:'10px 15px', borderRadius:'8px', border:'1px solid #334155', background:'#1e293b', color:'#e2e8f0', outline:'none', fontSize:'0.9rem' }}
      />
      {results.length > 0 && query.trim().length >= 2 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#0f172a', border:'1px solid #334155', borderRadius:'8px', marginTop:'5px', zIndex:1000, overflow:'hidden', boxShadow:'0 10px 25px rgba(0,0,0,0.5)' }}>
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

function HistoryPanel({ histData, stats, selectedDate, onSelect, onClose, accentColor, bannerTheme, TooltipComponent, onLogTrade, onDetail }) {
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [groupBy, setGroupBy] = useState('DATE'); // 'DATE' or 'STOCK'
  const months = [...new Set(histData.map(d => d.date.substring(0, 7)))].sort().reverse();
  
  const filteredHistData = useMemo(() => {
    if (groupBy === 'STOCK') return [];
    let result = [];
    if (selectedMonth === 'All') {
      const g = histData.reduce((acc, obj) => {
        const d = obj.date.slice(0, 7);
        if (!acc[d]) acc[d] = { date: d, count: 0, signals: [], stocks: [] };
        acc[d].count += obj.count;
        acc[d].signals.push(...obj.signals);
        if (obj.stocks) acc[d].stocks.push(...obj.stocks);
        return acc;
      }, {});
      result = Object.values(g).reverse();
    } else {
      result = histData.filter(d => d.date.startsWith(selectedMonth)).reverse();
    }
    return result.map(item => ({
      ...item,
      stocks: item.stocks && item.stocks.length > 0 ? item.stocks : item.signals.map(s => s.symbol)
    }));
  }, [histData, selectedMonth, groupBy]);

  const stockData = useMemo(() => {
    if (groupBy !== 'STOCK') return [];
    let d = selectedMonth === 'All' ? histData : histData.filter(h => h.date.startsWith(selectedMonth));
    const counts = {};
    d.forEach(day => {
      day.signals.forEach(s => {
        if (!counts[s.symbol]) counts[s.symbol] = { symbol: s.symbol, tp: 0, sl: 0, active: 0, total: 0 };
        counts[s.symbol].total++;
        if (s.status === 'TARGET HIT') counts[s.symbol].tp++;
        else if (s.status === 'SL HIT') counts[s.symbol].sl++;
        else counts[s.symbol].active++;
      });
    });
    return Object.values(counts).sort((a,b) => b.total - a.total).slice(0, 40); // Top 40
  }, [histData, selectedMonth, groupBy]);

  const chartWidth = Math.max(1200, (groupBy === 'DATE' ? filteredHistData.length : stockData.length) * 22);
  const monthlySignals = filteredHistData.reduce((sum, day) => sum + day.count, 0);
  const allocPerTrade = 10000; // Simulated constant allocation per trade for realistic P&L
  const monthlyCost = filteredHistData.reduce((sum, day) => sum + (day.signals.length * allocPerTrade), 0);
  const monthlyPnL = filteredHistData.reduce((sum, day) => {
    return sum + day.signals.reduce((s, stock) => {
      if (!stock.entry || stock.entry === 0) return s;
      const qty = allocPerTrade / stock.entry;
      if (stock.status === 'TARGET HIT') return s + ((stock.target - stock.entry) * qty);
      if (stock.status === 'SL HIT') return s + ((stock.stoploss - stock.entry) * qty);
      return s;
    }, 0);
  }, 0);

  // Calculate Dynamic Stats based on the active month
  let d_total = 0, d_wins = 0, d_loss = 0, d_days = 0;
  filteredHistData.forEach(day => {
    (day.signals || []).forEach(s => {
      d_total++;
      if (s.status === 'TARGET HIT') { d_wins++; d_days += (s.days_in_trade || 0); }
      else if (s.status === 'SL HIT') { d_loss++; d_days += (s.days_in_trade || 0); }
    });
  });
  const d_closed = d_wins + d_loss;
  const dynWinRate = d_closed > 0 ? (d_wins / d_closed * 100).toFixed(1) : 0;
  const dynAvgDays = d_closed > 0 ? Math.round(d_days / d_closed) : 0;
  
  const isMonth = selectedMonth !== 'All';
  const showWinRate = isMonth ? dynWinRate : (stats?.win_rate_pct || 0);
  const showWins = isMonth ? d_wins : (stats?.target_hit || 0);
  const showLoss = isMonth ? d_loss : (stats?.sl_hit || 0);
  const showTotal = isMonth ? d_total : (stats?.total_signals || 0);
  const showAvgDays = isMonth ? dynAvgDays : (stats?.avg_days_to_close || 0);

  return (
    <>
      {stats && stats.total_signals > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'24px', padding:'20px', backgroundColor: bannerTheme === 'amber' ? '#1c1410' : '#0f1e1c', borderRadius:'15px', border:`1px solid ${bannerTheme === 'amber' ? '#78350f' : '#0d4038'}` }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color: bannerTheme === 'amber' ? '#fbbf24' : '#66fcf1' }}>{showWinRate}%</div>
            <div style={{ fontSize:'0.8rem', color: bannerTheme === 'amber' ? '#fde68a' : '#a7f3d0', opacity:0.8 }}>{isMonth ? `Win Rate (${selectedMonth})` : 'Historical Win Rate'}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#4ade80' }}>{showWins}</div>
            <div style={{ fontSize:'0.8rem', color:'#86efac', opacity:0.8 }}>Targets Hit</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#f87171' }}>{showLoss}</div>
            <div style={{ fontSize:'0.8rem', color:'#fca5a5', opacity:0.8 }}>Stop Losses Hit</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#60a5fa' }}>{showTotal}</div>
            <div style={{ fontSize:'0.8rem', color:'#93c5fd', opacity:0.8 }}>{isMonth ? `Signals (${selectedMonth})` : 'Total Signals (2yr)'}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#c084fc' }}>{showAvgDays || 0}d</div>
            <div style={{ fontSize:'0.8rem', color:'#d8b4fe', opacity:0.8 }}>Avg Time to TP/SL</div>
          </div>
          {bannerTheme !== 'amber' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'1rem', fontWeight:'700', color:'#d1fae5', marginTop:'6px' }}>Filters: AI &gt; 55% • Vol &gt; 0.5x</div>
              <div style={{ fontSize:'0.8rem', color:'#a7f3d0', opacity:0.7 }}>Broad NSE universe scan</div>
            </div>
          )}
          {bannerTheme === 'amber' && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'1rem', fontWeight:'700', color:'#d1fae5', marginTop:'6px' }}>Criteria: AI &gt; 72% • Vol &gt; 1.5x • ATR &gt; 1.5%</div>
              <div style={{ fontSize:'0.8rem', color:'#a7f3d0', opacity:0.7 }}>Stricter = fewer, higher quality</div>
            </div>
          )}
        </div>
      )}

      {histData.length > 0 && (
        <div style={{ marginBottom:'30px', backgroundColor:'var(--panel-bg)', padding:'20px', borderRadius:'15px', border:'1px solid var(--border-color)', boxSizing:'border-box' }}>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:'10px', marginBottom:'15px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'15px' }}>
              <h3 style={{ margin:0, color:'var(--text-main)', fontSize:'1.1rem' }}>Historical Summary</h3>
              <div style={{ display:'flex', background:'#1e293b', borderRadius:'8px', overflow:'hidden', border:'1px solid #334155' }}>
                <button 
                  onClick={() => setGroupBy('DATE')} 
                  style={{ padding:'6px 12px', background: groupBy === 'DATE' ? 'rgba(56,189,248,0.2)' : 'transparent', color: groupBy === 'DATE' ? '#38bdf8' : '#94a3b8', border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold' }}>By Date</button>
                <button 
                  onClick={() => setGroupBy('STOCK')} 
                  style={{ padding:'6px 12px', background: groupBy === 'STOCK' ? 'rgba(56,189,248,0.2)' : 'transparent', color: groupBy === 'STOCK' ? '#38bdf8' : '#94a3b8', border:'none', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold' }}>By Stock</button>
              </div>
            </div>
            
            <div style={{ display:'flex', alignItems:'center', gap:'15px', flexWrap:'wrap' }}>
              <select 
                value={selectedMonth} 
                onChange={(e) => { setSelectedMonth(e.target.value); onSelect(null); }}
                style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-color)', color: 'var(--text-bright)', border: `1px solid ${accentColor}44`, outline: 'none', cursor: 'pointer' }}
              >
                <option value="All">All Time</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              
              {selectedMonth !== 'All' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-bright)', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <span>Signals: <strong style={{color:accentColor}}>{monthlySignals}</strong></span>
                  <span>Cost (10k/Trade): <strong style={{color:accentColor}}>₹{monthlyCost.toLocaleString('en-IN')}</strong></span>
                  <span>Est. P&L: <strong style={{color: monthlyPnL >= 0 ? '#4ade80' : '#f87171'}}>{monthlyPnL > 0 ? '+' : ''}₹{monthlyPnL.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0})}</strong></span>
                </div>
              )}
              <span style={{ fontSize:'0.85rem', color:accentColor }}>← Scroll → • Click bar</span>
            </div>
          </div>
          <div style={{ overflowX:'auto', paddingBottom:'4px' }}>
            {groupBy === 'DATE' ? (
              <BarChart width={chartWidth} height={210} data={filteredHistData} margin={{ top:5, right:10, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickFormatter={(t) => t.slice(5)} tickMargin={8} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} width={28} />
                <ChartTooltip content={<TooltipComponent />} cursor={{ fill:'#334155', opacity:0.4 }} />
                <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={36} onClick={(d) => onSelect(d.payload)} style={{cursor:'pointer'}}>
                  {filteredHistData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={selectedDate && selectedDate.date === entry.date ? '#fbbf24' : accentColor} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart width={chartWidth} height={210} data={stockData} margin={{ top:5, right:10, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="symbol" stroke="#94a3b8" fontSize={9} tickFormatter={t => t.replace('.NS','')} tickMargin={8} interval={0} angle={-35} textAnchor="end" height={50} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} width={28} />
                <ChartTooltip content={<StockTooltip />} cursor={{ fill:'#334155', opacity:0.4 }} />
                <Bar dataKey="tp" stackId="a" fill="#4ade80" onClick={d => d && onDetail && onDetail(d.payload.symbol)} style={{cursor:'pointer'}} />
                <Bar dataKey="active" stackId="a" fill="#38bdf8" onClick={d => d && onDetail && onDetail(d.payload.symbol)} style={{cursor:'pointer'}} />
                <Bar dataKey="sl" stackId="a" fill="#f87171" radius={[4,4,0,0]} onClick={d => d && onDetail && onDetail(d.payload.symbol)} style={{cursor:'pointer'}} />
              </BarChart>
            )}
          </div>
        </div>
      )}
      {selectedDate && (
        <div style={{ marginBottom:'30px', padding:'20px', backgroundColor:'var(--panel-bg)', borderRadius:'15px', border:`1px solid ${accentColor}44` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
            <h3 style={{ margin:0, color:'var(--text-main)' }}>Trade Simulations — {selectedDate.date}</h3>
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.4rem' }}>✕</button>
          </div>
          <div className="grid">
            {selectedDate.signals.map((stock, i) => (
              <div className="card" key={`${stock.symbol}-${i}`} style={{ borderColor: stock.status === 'TARGET HIT' ? '#22c55e44' : stock.status === 'SL HIT' ? '#ef444444' : '#3b82f644', cursor:'pointer' }} onClick={() => onDetail && onDetail(stock.symbol)}>
                <div className="card-header">
                  <h2>{stock.symbol}</h2>
                  <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <StatusBadge status={stock.status} />
                    {onLogTrade && <button onClick={() => onLogTrade(stock, stock.entry)} style={{background:'transparent', border:`1px solid ${accentColor}`, color:accentColor, borderRadius:'4px', padding:'4px 8px', fontSize:'0.75rem', cursor:'pointer'}}>+ Log</button>}
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat"><span>Entry</span><strong>₹{stock.entry.toFixed(2)}</strong></div>
                  <div className="stat"><span>Target</span><strong className="up">₹{stock.target.toFixed(2)}</strong></div>
                  <div className="stat"><span>Stoploss</span><strong className="down">₹{stock.stoploss.toFixed(2)}</strong></div>
                  {stock.confidence && <div className="stat"><span>Confidence</span><strong>{stock.confidence.toFixed(1)}%</strong></div>}
                  {stock.status === 'ACTIVE' && (
                    <div className="stat"><span>Growth since entry</span><strong className={stock.growth_pct >= 0 ? 'up' : 'down'}>{stock.growth_pct > 0 ? '+' : ''}{stock.growth_pct.toFixed(1)}%</strong></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const [data, setData]                   = useState([])
  const [historicalData, setHistoricalData] = useState([])
  const [nseStats, setNseStats]           = useState(null)
  const [hcData, setHcData]               = useState([])
  const [hcHistorical, setHcHistorical]   = useState([])
  const [hcStats, setHcStats]             = useState(null)
  const [selectedHistDate, setSelectedHistDate] = useState(null)
  const [selectedHcDate, setSelectedHcDate]     = useState(null)
  const [loading, setLoading]             = useState(true)
  const [market, setMarket]               = useState("HC")
  const [isScanningBackground, setIsScanningBackground] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [portfolio, setPortfolio]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('swing_portfolio')) || []; }
    catch { return []; }
  });
  const [trendingSectors, setTrendingSectors] = useState([]);
  const [mbData, setMbData] = useState([]);
  const [mbTimestamp, setMbTimestamp] = useState(null);
  const [sectorInsight, setSectorInsight] = useState(null);
  const [mbBacktest, setMbBacktest] = useState(null);
  const [mbView, setMbView] = useState('live'); // 'live' | 'backtest'
  const [mbYearsAgo, setMbYearsAgo] = useState(1);
  const [mbLoading, setMbLoading] = useState(false);
  const [budgetCapital, setBudgetCapital] = useState(30000);
  const [budgetRiskPct, setBudgetRiskPct] = useState(2);
  const [marketBullish, setMarketBullish] = useState(true);
  const [filters, setFilters] = useState({ sortBy: 'confidence', highConfidence: false, highVolume: false });

  const filteredData = useMemo(() => {
    let result = [...data];
    if (filters.highConfidence) result = result.filter(s => s.confidence > 75);
    if (filters.highVolume) result = result.filter(s => s.volume_ratio > 2);
    
    return result.sort((a, b) => {
      if (filters.sortBy === 'confidence') return b.confidence - a.confidence;
      if (filters.sortBy === 'volume') return b.volume_ratio - a.volume_ratio;
      if (filters.sortBy === 'growth') return (b.growth_pct || 0) - (a.growth_pct || 0);
      return 0;
    });
  }, [data, filters]);

  useEffect(() => {
    // Fetch trending sectors once on load
    const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
    fetch(`${baseUrl}/api/trending_sectors`, { cache: 'no-store' })
      .then(r => r.json())
      .then(res => { if (res.status === 'success') setTrendingSectors(res.data) })
      .catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('swing_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const logTrade = (stock, defaultPrice) => {
    const qtyStr = prompt(`Enter quantity of ${stock.symbol} bought:`, "1");
    if (!qtyStr) return;
    const priceStr = prompt(`Enter exact buy price for ${stock.symbol}:`, defaultPrice || stock.entry);
    if (!priceStr) return;
    const qty = Number(qtyStr);
    const buyPrice = Number(priceStr);
    if (isNaN(qty) || isNaN(buyPrice)) return alert("Invalid numbers entered.");
    
    // Try to capture sector from stock object if it exists (e.g. from HC data)
    const trade = { 
      id: Date.now(), 
      symbol: stock.symbol, 
      buyPrice, 
      qty, 
      status: 'OPEN', 
      exitPrice: null, 
      date: new Date().toISOString().split('T')[0],
      sector: stock.sector || 'General'
    };
    setPortfolio(p => [...p, trade]);
    alert(`${qty} shares of ${stock.symbol} successfully added to your Portfolio!`);
  };

  const loadSectorInsight = (sector) => {
    setSectorInsight({ sector, loading: true, data: null, error: null });
    const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
    fetch(`${baseUrl}/api/sector_leader?sector=${encodeURIComponent(sector)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') {
          setSectorInsight({ sector, loading: false, data: res.leader, error: null });
        } else {
          setSectorInsight({ sector, loading: false, data: null, error: res.message });
        }
      })
      .catch((e) => setSectorInsight({ sector, loading: false, data: null, error: "Failed to connect to backend." }));
  };

  useEffect(() => {
    // BUDGET tab: auto-fetch HC + NSE data if not already loaded
    if (market === 'BUDGET') {
      setLoading(false);
      const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
      if (hcData.length === 0) {
        fetch(`${baseUrl}/api/high_conviction`, { cache: 'no-store' })
          .then(r => r.json())
          .then(result => {
            setHcData(result.data || []);
            setMarketBullish(result.market_bullish !== false);
            if (result.historical) setHcHistorical(result.historical.slice(-120));
            if (result.backtest_summary) setHcStats(result.backtest_summary);
          })
          .catch(console.error);
      }
      if (nseStats === null) {
        fetch(`${baseUrl}/api/scan_universe_buys`, { cache: 'no-store' })
          .then(r => r.json())
          .then(result => {
            setData(result.data || []);
            setMarketBullish(result.market_bullish !== false);
            if (result.historical) setHistoricalData(result.historical.slice(-120));
            if (result.backtest_summary) setNseStats(result.backtest_summary);
          })
          .catch(console.error);
      }
      return;
    }

    // Other view-only tabs
    if (market === 'ACTIVE_SIGNALS' || market === 'PORTFOLIO' || market === 'MULTIBAGGER') {
      setLoading(false);
      return;
    }

    let ignore = false;
    
    // Check if we already have data for this market to avoid refetching on every tab click
    const isNSEBuys = market === "NSE_BUYS";
    const isHC      = market === "HC";
    const isIN      = market === "IN";
    const isUS      = market === "US";
    
    // Custom caching check without wiping everything
    if (isHC && hcData.length > 0) { setLoading(false); return; }
    if (isNSEBuys && nseStats !== null) { setLoading(false); return; }
    
    // To separate IN vs US which both share 'data' var, wipe 'data' ONLY if switching between IN and US
    // We already do setData([]) below to force loading state
    
    // Only reset data for the current tab
    if (isHC) { setHcData([]); setHcHistorical([]); setHcStats(null); }
    else if (isNSEBuys) { setHistoricalData([]); setNseStats(null); }
    else if (isIN || isUS) { setData([]); setHistoricalData([]); setHcHistorical([]); setNseStats(null); setHcStats(null); }
    
    setSelectedHistDate(null); setSelectedHcDate(null); setLoading(true);

    const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000";
    let url = isHC ? `${baseUrl}/api/high_conviction`
            : isNSEBuys ? `${baseUrl}/api/scan_universe_buys`
            : `${baseUrl}/api/scan?market=${market}`;

    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(result => {
        if (ignore) return;
        setData(result.data || []);
        setMarketBullish(result.market_bullish !== false);
        if (result.historical) {
          if (isHC) {
            setHcHistorical(result.historical.slice(-120));
            setHcStats(result.backtest_summary || null);
          } else if (isNSEBuys) {
            setHistoricalData(result.historical.slice(-120));
            setNseStats(result.backtest_summary || null);
          }
        }
        setIsScanningBackground(!!(result.is_scanning && (result.data || []).length === 0));
        setLoading(false);
      })
      .catch(e => { if (!ignore) { console.error(e); setLoading(false); } });

    return () => { ignore = true; };
  }, [market]);

  const currency = market === "US" ? "$" : "₹";
  const capLabel = market === "US" ? "$1.2K Cap" : "₹1L Cap";

  // Collect all ACTIVE signals from both NSE and HC historical data
  // Deduplicate by symbol — keep only the most recent signal date per stock
  const activeSignals = Object.values(
    [...historicalData, ...hcHistorical]
      .flatMap(day => (day.signals || []).map(s => ({ ...s, signalDate: day.date })))
      .filter(s => s.status === 'ACTIVE')
      .reduce((acc, s) => {
        if (!acc[s.symbol] || s.signalDate > acc[s.symbol].signalDate) {
          acc[s.symbol] = s;
        }
        return acc;
      }, {})
  ).sort((a, b) => b.growth_pct - a.growth_pct);

  return (
    <>
    <div className="container">
      <header className="header" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
          <div>
            <h1 style={{ margin: 0 }}>OmniQuant <span className="highlight">AI</span></h1>
            <p className="subtitle" style={{ margin: '5px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Algorithmic Equity Prediction Matrix
              <span style={{ 
                background: marketBullish ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                color: marketBullish ? '#4ade80' : '#f87171', 
                border: `1px solid ${marketBullish ? '#22c55e44' : '#ef444444'}`,
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.7rem', 
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Market: {marketBullish ? 'Bullish 📈' : 'Bearish 📉'}
              </span>
            </p>
          </div>
          <SearchBar onSelect={symbol => setSelectedDetail(symbol)} />
        </div>
        <div className="tabs">
          <button className={`tab ${market === "IN"       ? "active" : ""}`} onClick={() => setMarket("IN")}>🇮🇳 India (NSE)</button>
          <button className={`tab ${market === "US"       ? "active" : ""}`} onClick={() => setMarket("US")}>🇺🇸 USA (NYSE)</button>
          <button className={`tab ${market === "NSE_BUYS" ? "active" : ""}`} onClick={() => setMarket("NSE_BUYS")}>🚀 All NSE (Buy Only)</button>
          <button className={`tab ${market === "HC"       ? "active" : ""}`} onClick={() => setMarket("HC")} style={{ borderColor: market === "HC" ? "#fbbf24" : undefined, color: market === "HC" ? "#fbbf24" : undefined }}>🎯 High Conviction</button>
          <button className={`tab ${market === "ACTIVE_SIGNALS" ? "active" : ""}`} onClick={() => setMarket("ACTIVE_SIGNALS")} style={{ borderColor: market === "ACTIVE_SIGNALS" ? "#4ade80" : undefined, color: market === "ACTIVE_SIGNALS" ? "#4ade80" : undefined }}>🟢 Active Signals</button>
          <button className={`tab ${market === "BUDGET" ? "active" : ""}`} onClick={() => setMarket("BUDGET")} style={{ borderColor: market === "BUDGET" ? "#34d399" : undefined, color: market === "BUDGET" ? "#34d399" : undefined }}>₹ Budget Friendly</button>
          <button className={`tab ${market === "PORTFOLIO" ? "active" : ""}`} onClick={() => setMarket("PORTFOLIO")}>💼 My Portfolio</button>
          <button className={`tab ${market === "MULTIBAGGER" ? "active" : ""}`} onClick={() => { setMarket("MULTIBAGGER"); if (mbData.length === 0 && !mbLoading) { setMbLoading(true); const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000"; fetch(`${baseUrl}/api/multibagger/live`, { cache: 'no-store' }).then(r=>r.json()).then(res=>{setMbData(res.data||[]);setMbTimestamp(res.timestamp||new Date().toISOString());setMbLoading(false)}).catch(()=>setMbLoading(false)); } }} style={{ borderColor: market === "MULTIBAGGER" ? "#a855f7" : undefined, color: market === "MULTIBAGGER" ? "#a855f7" : undefined }}>🚀 Multibaggers</button>
        </div>

        {trendingSectors.length > 0 && (
          <div style={{ marginTop:'20px', display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'10px', scrollbarWidth:'none', msOverflowStyle:'none' }}>
            <span style={{color:'#94a3b8', fontSize:'0.85rem', display:'flex', alignItems:'center', whiteSpace:'nowrap', letterSpacing:'1px', textTransform:'uppercase'}}>🔥 Trending Sectors</span>
            {trendingSectors.map(s => (
              <button key={s.sector} onClick={() => loadSectorInsight(s.sector)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius:'12px', padding:'6px 14px', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap', border:`1px solid ${s.change_pct >= 0 ? '#166534' : '#7f1d1d'}`, cursor:'pointer', color:'inherit', transition:'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                <span style={{fontWeight:'bold', color:'#e2e8f0'}}>{s.sector.replace('NIFTY ','')}</span>
                <span style={{color: s.change_pct >= 0 ? '#4ade80' : '#f87171', fontWeight:'600'}}>{s.change_pct > 0 ? '+' : ''}{s.change_pct}%</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {loading ? (
        <div className="loader">Scanning Markets... This may take a moment.</div>
      ) : isScanningBackground ? (
        <div className="loader">🤖 AI is crunching 60+ NSE Stocks...<br/><span style={{fontSize:'1rem',opacity:0.6}}>Refresh in ~1 minute when caching completes.</span></div>
      ) : (
        <>
          {/* HIGH CONVICTION VIEW */}
          {market === "HC" && (
            <>
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
              />

              {!selectedHcDate && (
                <div style={{ padding: '0 0 20px 0' }}>
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-bright)' }}>High Conviction Radar</h2>
                    <span style={{ fontSize: '0.8rem', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(251,191,36,0.2)' }}>Top 1% Setups</span>
                  </div>
                  {!marketBullish && data.length === 0 ? (
                    <div className="no-data" style={{ textAlign:'center', padding:'60px', background:'rgba(239,68,68,0.03)', borderRadius:'15px', border:'1px dashed #ef444444' }}>
                      <div style={{ fontSize:'2.5rem', marginBottom:'15px' }}>🛡️</div>
                      <h3 style={{ color:'#f87171', margin:'0 0 8px' }}>Signals Paused: Bearish Market</h3>
                      <p style={{ color:'#94a3b8', maxWidth:'400px', margin:'0 auto', fontSize:'0.9rem' }}>Nifty 50 is currently below its 50-day EMA. Buying signals are automatically suppressed for capital safety until the trend reverses.</p>
                    </div>
                  ) : (
                    <StockGrid data={data} currency="₹" capLabel="₹1L Cap" onLogTrade={logTrade} onDetail={setSelectedDetail} />
                  )}
                </div>
              )}
            </>
          )}

          {/* NSE BUY ONLY VIEW */}
          {market === "NSE_BUYS" && (
            <>
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
              />
              {!selectedHistDate && (
                <>
                  {!marketBullish && data.length === 0 && (
                    <div className="no-data" style={{ textAlign:'center', padding:'40px', background:'rgba(239,68,68,0.03)', borderRadius:'15px', border:'1px dashed #ef444444', marginBottom:'20px' }}>
                      <p style={{ color:'#f87171', fontWeight:'600', margin:0 }}>⚠️ Bearish Market Regime Detected. NSE Buy signals are currently locked for safety.</p>
                    </div>
                  )}
                  <StockGrid data={data} currency="₹" capLabel="₹1L Cap" onLogTrade={logTrade} onDetail={setSelectedDetail} />
                </>
              )}
            </>
          )}

          {/* IN / US VIEWS */}
          {(market === "IN" || market === "US") && (
            <>
              <FilterToolbar filters={filters} setFilters={setFilters} />
              <StockGrid data={filteredData} currency={currency} capLabel={capLabel} onLogTrade={logTrade} onDetail={setSelectedDetail} />
            </>
          )}

          {/* ACTIVE SIGNALS VIEW */}
          {market === "ACTIVE_SIGNALS" && (
            <div style={{ padding: '0 0 20px 0' }}>
               <div style={{ marginBottom: '20px' }}>
                 <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-bright)' }}>Live Performance Tracking</h2>
                 <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Tracking historical BUY signals through current market cycle</p>
               </div>
               <StockGrid data={activeSignals} currency="₹" capLabel="₹1L Cap" onLogTrade={logTrade} onDetail={setSelectedDetail} />
            </div>
          )}

          {/* PORTFOLIO VIEW */}
          {market === "PORTFOLIO" && (
            <PortfolioGrid portfolio={portfolio} setPortfolio={setPortfolio} />
          )}

          {/* MULTIBAGGER VIEW */}
          {market === "MULTIBAGGER" && (
            <>
              <div style={{ marginBottom:'24px', padding:'24px', background:'linear-gradient(135deg, #1a0533 0%, #0f172a 100%)', borderRadius:'15px', border:'1px solid #7c3aed44' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
                  <div>
                    <h2 style={{ color:'#e2e8f0', margin:0, fontSize:'1.3rem' }}>🧠 Renaissance Multibagger Engine</h2>
                    <p style={{ color:'#94a3b8', margin:'4px 0 0', fontSize:'0.85rem' }}>Quantitative anomaly detection · R² trend analysis · Volume accumulation scoring</p>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => setMbView('live')} style={{ padding:'8px 16px', borderRadius:'8px', border: mbView==='live' ? '1px solid #a855f7' : '1px solid #334155', background: mbView==='live' ? 'rgba(168,85,247,0.15)' : 'transparent', color: mbView==='live' ? '#c084fc' : '#94a3b8', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600' }}>📡 Live Predictions</button>
                    <button onClick={() => { setMbView('backtest'); if (!mbBacktest) { setMbLoading(true); const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000"; fetch(`${baseUrl}/api/multibagger/backtest?years_ago=${mbYearsAgo}`, { cache: 'no-store' }).then(r=>r.json()).then(res=>{setMbBacktest(res);setMbLoading(false)}).catch(()=>setMbLoading(false)); } }} style={{ padding:'8px 16px', borderRadius:'8px', border: mbView==='backtest' ? '1px solid #a855f7' : '1px solid #334155', background: mbView==='backtest' ? 'rgba(168,85,247,0.15)' : 'transparent', color: mbView==='backtest' ? '#c084fc' : '#94a3b8', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600' }}>⏳ Historical Proof</button>
                    <button onClick={() => { setMbLoading(true); setMbView('live'); const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000"; fetch(`${baseUrl}/api/multibagger/live`, { cache: 'no-store' }).then(r=>r.json()).then(res=>{setMbData(res.data||[]);setMbTimestamp(res.timestamp||new Date().toISOString());setMbLoading(false)}).catch(()=>setMbLoading(false)); }} style={{ padding:'8px 16px', borderRadius:'8px', border:'1px solid #334155', background:'transparent', color:'#94a3b8', cursor:'pointer', fontSize:'0.85rem', fontWeight:'600' }}>🔄 Refresh Scan</button>
                  </div>
                </div>

                {mbTimestamp && mbView === 'live' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(124, 58, 237, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.2)', width: 'fit-content', marginBottom: '20px', marginTop: '-10px' }}>
                    <span style={{ fontSize: '1rem' }}>🕒</span>
                    <span style={{ fontSize: '0.85rem', color: '#c084fc' }}>
                      Last Scanned: <strong style={{ color: '#fff', marginLeft: '4px' }}>{new Date(mbTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                    </span>
                  </div>
                )}

                {mbView === 'backtest' && (
                  <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
                    {[1, 2, 3].map(y => (
                      <button key={y} onClick={() => { setMbYearsAgo(y); setMbBacktest(null); setMbLoading(true); const baseUrl = import.meta.env.PROD ? "" : "http://localhost:8000"; fetch(`${baseUrl}/api/multibagger/backtest?years_ago=${y}`, { cache: 'no-store' }).then(r=>r.json()).then(res=>{setMbBacktest(res);setMbLoading(false)}).catch(()=>setMbLoading(false)); }} style={{ padding:'6px 14px', borderRadius:'8px', border: mbYearsAgo===y ? '1px solid #a855f7' : '1px solid #334155', background: mbYearsAgo===y ? 'rgba(168,85,247,0.2)' : 'transparent', color: mbYearsAgo===y ? '#c084fc' : '#64748b', cursor:'pointer', fontSize:'0.8rem' }}>{y} Year{y>1?'s':''} Ago</button>
                    ))}
                  </div>
                )}

                {mbView === 'backtest' && mbBacktest && !mbLoading && (
                  <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'2rem', fontWeight:'800', color: mbBacktest.avg_return >= 0 ? '#4ade80' : '#f87171' }}>{mbBacktest.avg_return > 0 ? '+' : ''}{mbBacktest.avg_return}%</div>
                      <div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>AI Portfolio Return</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'2rem', fontWeight:'800', color: mbBacktest.nifty_return >= 0 ? '#4ade80' : '#f87171' }}>{mbBacktest.nifty_return > 0 ? '+' : ''}{mbBacktest.nifty_return}%</div>
                      <div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Nifty 50 Benchmark</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'2rem', fontWeight:'800', color:'#c084fc' }}>{mbBacktest.num_picks}</div>
                      <div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Stocks Picked</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'2rem', fontWeight:'800', color: (mbBacktest.avg_return - mbBacktest.nifty_return) >= 0 ? '#4ade80' : '#f87171' }}>{(mbBacktest.avg_return - mbBacktest.nifty_return) > 0 ? '+' : ''}{(mbBacktest.avg_return - mbBacktest.nifty_return).toFixed(1)}%</div>
                      <div style={{ fontSize:'0.8rem', color:'#94a3b8' }}>Alpha vs Nifty</div>
                    </div>
                  </div>
                )}
              </div>

              {mbLoading ? (
                <div className="loader">🧠 Renaissance engine scanning {mbView === 'backtest' ? 'historical data' : '60+ NSE stocks'}...<br/><span style={{fontSize:'0.9rem',opacity:0.6}}>This may take 30-60 seconds.</span></div>
              ) : (
                <div className="grid">
                  {(mbView === 'live' ? mbData : (mbBacktest?.picks || [])).map((stock, i) => (
                    <div className="card mb-legacy-card" key={stock.symbol} style={{ borderColor:'#7c3aed44', cursor:'pointer' }} onClick={() => setSelectedDetail(stock.symbol)}>
                      <div className="card-header">
                        <h2 style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ color:'#c084fc', fontSize:'0.75rem' }}>#{i+1}</span>
                          {stock.symbol}
                        </h2>
                        <div style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', padding:'4px 12px', borderRadius:'20px', fontSize:'0.85rem', fontWeight:'bold', color:'#fff' }}>{stock.score}</div>
                      </div>
                      <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
                        <span style={{ background:'rgba(168,85,247,0.1)', border:'1px solid #7c3aed44', borderRadius:'6px', padding:'3px 8px', fontSize:'0.7rem', color:'#c084fc' }}>R² {stock.r_squared}</span>
                        <span style={{ background:'rgba(74,222,128,0.1)', border:'1px solid #16653444', borderRadius:'6px', padding:'3px 8px', fontSize:'0.7rem', color:'#4ade80' }}>+{stock.return_1y}% 1Y</span>
                        <span style={{ background:'rgba(56,189,248,0.1)', border:'1px solid #0284c744', borderRadius:'6px', padding:'3px 8px', fontSize:'0.7rem', color:'#38bdf8' }}>Acc {stock.accumulation_ratio}x</span>
                        <span style={{ background:'rgba(251,191,36,0.1)', border:'1px solid #92400e44', borderRadius:'6px', padding:'3px 8px', fontSize:'0.7rem', color:'#fbbf24' }}>DD {stock.max_drawdown}%</span>
                      </div>
                      <div className="stats-grid">
                        <div className="stat"><span>Price</span><strong>₹{stock.current_price}</strong></div>
                        <div className="stat"><span>1Y Return</span><strong className="up">+{stock.return_1y}%</strong></div>
                        {stock.forward_return !== undefined && (
                          <div className="stat"><span>Fwd Return</span><strong className={stock.forward_return >= 0 ? 'up' : 'down'}>{stock.forward_return > 0 ? '+' : ''}{stock.forward_return}%</strong></div>
                        )}
                        <div className="stat"><span>Score</span><strong style={{color:'#c084fc'}}>{stock.score}/100</strong></div>
                      </div>
                      
                      <div style={{ background:'rgba(124, 58, 237, 0.05)', borderRadius:'8px', padding:'12px', marginTop:'14px', border:'1px dashed #7c3aed44' }}>
                        <div style={{ fontSize:'0.75rem', fontWeight:'bold', color:'#c084fc', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Why it scored {stock.score}/100</div>
                        <ul style={{ margin:0, paddingLeft:'16px', fontSize:'0.75rem', color:'#94a3b8', lineHeight:'1.5' }}>
                          <li style={{marginBottom:'4px'}}><strong style={{color:'#cbd5e1'}}>Trend Smoothness (R² {stock.r_squared}):</strong> Highly linear uptrend indicating strong, continuous institutional backing.</li>
                          <li style={{marginBottom:'4px'}}><strong style={{color:'#cbd5e1'}}>Volume Acc. ({stock.accumulation_ratio}x):</strong> Buying volume heavily outweighs selling volume on up-days vs down-days.</li>
                          <li style={{marginBottom:'0'}}><strong style={{color:'#cbd5e1'}}>Drawdown Efficiency ({stock.max_drawdown}%):</strong> Generated massive +{stock.return_1y}% return relative to very limited, suppressed drawdowns over the year.</li>
                        </ul>
                      </div>
                    </div>
                  ))}
                  {(mbView === 'live' ? mbData : (mbBacktest?.picks || [])).length === 0 && (
                    <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'60px'}}>No multibagger candidates found matching the strict criteria.</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ACTIVE SIGNALS VIEW */}
          {market === "ACTIVE_SIGNALS" && (
            <>
              <div style={{ marginBottom:'24px', padding:'20px', backgroundColor:'#0d1f12', borderRadius:'15px', border:'1px solid #166534', display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center' }}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'2rem', fontWeight:'800', color:'#4ade80'}}>{activeSignals.length}</div>
                  <div style={{fontSize:'0.8rem', color:'#86efac', opacity:0.8}}>Open Positions</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'2rem', fontWeight:'800', color:'#4ade80'}}>{activeSignals.filter(s=>s.growth_pct>=0).length}</div>
                  <div style={{fontSize:'0.8rem', color:'#86efac', opacity:0.8}}>In Profit</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'2rem', fontWeight:'800', color:'#f87171'}}>{activeSignals.filter(s=>s.growth_pct<0).length}</div>
                  <div style={{fontSize:'0.8rem', color:'#fca5a5', opacity:0.8}}>Below Entry</div>
                </div>
                <div style={{fontSize:'0.85rem', color:'#86efac', marginLeft:'auto', opacity:0.7}}>Signals still open (no TP/SL hit). Sorted best to worst.</div>
              </div>
              {activeSignals.length === 0 ? (
                <div className="no-data" style={{textAlign:'center', padding:'60px'}}>Loading active signals... Switch to All NSE or HC tab first so data can load.</div>
              ) : (
                <div className="grid">
                  {activeSignals.map((stock, i) => (
                    <div className="card" key={`${stock.symbol}-${stock.signalDate}-${i}`} style={{ borderColor:'#4ade8044', cursor:'pointer' }} onClick={() => setSelectedDetail(stock.symbol)}>
                      <div className="card-header">
                        <h2>{stock.symbol}</h2>
                        <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px'}}>
                          <span className={`badge ${stock.growth_pct >= 0 ? 'target-hit' : 'sl-hit'}`}>{stock.growth_pct >= 0 ? '▲' : '▼'} {stock.growth_pct > 0 ? '+' : ''}{stock.growth_pct.toFixed(1)}%</span>
                          <span style={{fontSize:'0.7rem', color:'#94a3b8'}}>Signal: {stock.signalDate}</span>
                        </div>
                      </div>
                      <div className="stats-grid">
                        <div className="stat"><span>Entry</span><strong>₹{stock.entry.toFixed(2)}</strong></div>
                        <div className="stat"><span>Target</span><strong className="up">₹{stock.target.toFixed(2)}</strong></div>
                        <div className="stat"><span>Stoploss</span><strong className="down">₹{stock.stoploss.toFixed(2)}</strong></div>
                        <div className="stat"><span>Confidence</span><strong>{stock.confidence ? stock.confidence.toFixed(1) : 'N/A'}%</strong></div>
                      </div>
                      <button onClick={() => logTrade(stock, stock.entry)} style={{width:'100%', marginTop:'12px', padding:'8px', background:'rgba(74,222,128,0.1)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.3)', borderRadius:'8px', cursor:'pointer', fontSize:'0.85rem'}}>+ Log This Trade</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* BUDGET FRIENDLY VIEW */}
          {market === "BUDGET" && (() => {
            const riskPerTrade = budgetCapital * (budgetRiskPct / 100);

            // Gather all signals from both NSE and HC
            const allSignals = [
              ...data.map(s => ({ ...s, tier: s.action === 'STRONG BUY' ? 'HC' : 'NSE' })),
              ...(hcData.length > 0 ? hcData.map(s => ({ ...s, tier: 'HC' })) : [])
            ];

            // Deduplicate by symbol, prefer HC
            const deduped = Object.values(
              allSignals.reduce((acc, s) => {
                if (!acc[s.symbol] || s.tier === 'HC') acc[s.symbol] = s;
                return acc;
              }, {})
            );

            // Filter: price must allow at least 3 shares within budgetCapital
            const budgetSignals = deduped
              .filter(s => s.entry > 0 && s.entry <= budgetCapital / 3)
              .map(s => {
                const stopGap = s.entry - s.stoploss;
                const qty = stopGap > 0 ? Math.max(1, Math.floor(riskPerTrade / stopGap)) : 1;
                const capitalUsed = qty * s.entry;
                const canAfford = capitalUsed <= budgetCapital * 0.45; // max 45% per trade

                // Signal score 0-100
                let score = 0;
                if (s.confidence >= 72) score += 25;
                else if (s.confidence >= 60) score += 15;
                else if (s.confidence >= 55) score += 8;
                if (s.volume_ratio >= 2.0) score += 20;
                else if (s.volume_ratio >= 1.5) score += 15;
                else if (s.volume_ratio >= 1.0) score += 8;
                if (s.tier === 'HC') score += 20;
                else score += 10;
                if (s.entry <= 500) score += 15;
                else if (s.entry <= 1000) score += 10;
                else if (s.entry <= 1500) score += 5;
                if (s.backtest && s.backtest.win_rate >= 60) score += 10;
                else if (s.backtest && s.backtest.win_rate >= 50) score += 5;
                if (s.delivery_pct != null && s.delivery_pct >= 45) score += 10;
                else if (s.delivery_pct != null && s.delivery_pct >= 35) score += 5;

                const tier1 = score >= 80 && canAfford;
                const tier2 = score >= 65 && score < 80 && canAfford;

                return { ...s, qty, capitalUsed, canAfford, score, stopGap, tier1, tier2 };
              })
              .sort((a, b) => b.score - a.score);

            const tier1 = budgetSignals.filter(s => s.score >= 80);
            const tier2 = budgetSignals.filter(s => s.score >= 65 && s.score < 80);
            const watchlist = budgetSignals.filter(s => s.score < 65);

            const deployedWk1 = tier1.slice(0, 2).reduce((s, x) => s + x.capitalUsed, 0);
            const deployedWk2 = tier2.slice(0, 3).reduce((s, x) => s + x.capitalUsed, 0);
            const reserve = Math.max(0, budgetCapital - deployedWk1 - deployedWk2);

            const SignalCard = ({ s }) => (
              <div style={{ background:'#0f172a', border:`1px solid ${s.score >= 80 ? '#34d39944' : s.score >= 65 ? '#38bdf844' : '#334155'}`, borderRadius:'14px', padding:'18px', cursor:'pointer', transition:'border-color 0.2s', position:'relative' }}
                onClick={() => setSelectedDetail(s.symbol)}
                onMouseEnter={e => e.currentTarget.style.borderColor = s.score >= 80 ? '#34d399aa' : '#38bdf8aa'}
                onMouseLeave={e => e.currentTarget.style.borderColor = s.score >= 80 ? '#34d39944' : s.score >= 65 ? '#38bdf844' : '#334155'}>

                <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Click for AI details</div>

                {/* Score badge */}
                <div style={{ position:'absolute', top:'14px', right:'14px', background: s.score >= 80 ? 'linear-gradient(135deg,#059669,#34d399)' : s.score >= 65 ? 'linear-gradient(135deg,#0284c7,#38bdf8)' : '#1e293b', borderRadius:'20px', padding:'4px 10px', fontSize:'0.75rem', fontWeight:'bold', color:'#fff' }}>
                  {s.score}/100
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                  <h2 style={{ margin:0, fontSize:'1.2rem', color:'#f8fafc' }}>{s.symbol}</h2>
                  <span style={{ background: s.tier === 'HC' ? 'rgba(251,191,36,0.15)' : 'rgba(56,189,248,0.1)', color: s.tier === 'HC' ? '#fbbf24' : '#38bdf8', border:`1px solid ${s.tier === 'HC' ? '#fbbf2444' : '#38bdf844'}`, borderRadius:'6px', padding:'2px 8px', fontSize:'0.7rem', fontWeight:'bold' }}>
                    {s.tier === 'HC' ? '🎯 HC' : '🚀 NSE'}
                  </span>
                </div>

                {/* Position sizing */}
                <div style={{ background:'rgba(52,211,153,0.06)', border:'1px solid #34d39922', borderRadius:'10px', padding:'12px', marginBottom:'12px' }}>
                  <div style={{ fontSize:'0.72rem', color:'#6ee7b7', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px', fontWeight:'600' }}>📐 Position Sizing (2% Rule)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Entry Price</div><div style={{ fontWeight:'bold', color:'#e2e8f0' }}>₹{s.entry.toFixed(2)}</div></div>
                    <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Suggested Qty</div><div style={{ fontWeight:'bold', color:'#34d399', fontSize:'1.1rem' }}>{s.qty} shares</div></div>
                    <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Capital Used</div><div style={{ fontWeight:'bold', color: s.canAfford ? '#4ade80' : '#f87171' }}>₹{s.capitalUsed.toLocaleString('en-IN', {maximumFractionDigits:0})}</div></div>
                    <div><div style={{ fontSize:'0.7rem', color:'#64748b' }}>Max Risk</div><div style={{ fontWeight:'bold', color:'#fbbf24' }}>₹{riskPerTrade.toFixed(0)}</div></div>
                  </div>
                  {!s.canAfford && <div style={{ marginTop:'8px', fontSize:'0.72rem', color:'#f87171' }}>⚠️ Capital used exceeds 45% limit. Reduce qty.</div>}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'10px' }}>
                  <div style={{ background:'#1e293b', borderRadius:'8px', padding:'8px', textAlign:'center' }}><div style={{ fontSize:'0.65rem', color:'#64748b' }}>Target</div><div style={{ fontWeight:'bold', color:'#4ade80', fontSize:'0.9rem' }}>₹{s.target.toFixed(2)}</div></div>
                  <div style={{ background:'#1e293b', borderRadius:'8px', padding:'8px', textAlign:'center' }}><div style={{ fontSize:'0.65rem', color:'#64748b' }}>Stoploss</div><div style={{ fontWeight:'bold', color:'#f87171', fontSize:'0.9rem' }}>₹{s.stoploss.toFixed(2)}</div></div>
                  <div style={{ background:'#1e293b', borderRadius:'8px', padding:'8px', textAlign:'center' }}><div style={{ fontSize:'0.65rem', color:'#64748b' }}>Confidence</div><div style={{ fontWeight:'bold', color:'#e2e8f0', fontSize:'0.9rem' }}>{s.confidence.toFixed(1)}%</div></div>
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
                {/* Controls */}
                <div style={{ background:'linear-gradient(135deg,#022c22,#0f172a)', border:'1px solid #059669', borderRadius:'16px', padding:'24px', marginBottom:'28px' }}>
                  <h2 style={{ margin:'0 0 6px', color:'#34d399', fontSize:'1.3rem' }}>₹ Budget Friendly Swing Planner</h2>
                  <p style={{ color:'#6ee7b7', margin:'0 0 20px', fontSize:'0.85rem', opacity:0.8 }}>Position sizing & signal filtering calibrated to your monthly capital. Signals pulled from HC + NSE Buy tabs.</p>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'16px', marginBottom:'20px' }}>
                    <div>
                      <label style={{ fontSize:'0.8rem', color:'#6ee7b7', display:'block', marginBottom:'6px' }}>Monthly Capital (₹)</label>
                      <input type="number" value={budgetCapital} onChange={e => setBudgetCapital(Number(e.target.value))} min={5000} step={1000}
                        style={{ width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #059669', borderRadius:'8px', color:'#f8fafc', fontSize:'1rem', boxSizing:'border-box', outline:'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'0.8rem', color:'#6ee7b7', display:'block', marginBottom:'6px' }}>Risk Per Trade (%)</label>
                      <input type="number" value={budgetRiskPct} onChange={e => setBudgetRiskPct(Math.min(5, Math.max(0.5, Number(e.target.value))))} min={0.5} max={5} step={0.5}
                        style={{ width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #059669', borderRadius:'8px', color:'#f8fafc', fontSize:'1rem', boxSizing:'border-box', outline:'none' }} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                      <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid #34d39933', borderRadius:'10px', padding:'10px 14px' }}>
                        <div style={{ fontSize:'0.72rem', color:'#6ee7b7', marginBottom:'2px' }}>Max Risk Per Trade</div>
                        <div style={{ fontSize:'1.4rem', fontWeight:'bold', color:'#34d399' }}>₹{riskPerTrade.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Deployment Plan */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px' }}>
                    {[
                      ['Week 1 Deploy', `₹${deployedWk1.toLocaleString('en-IN',{maximumFractionDigits:0})}`, '#34d399', 'Tier 1 signals (top 2)'],
                      ['Week 2 Deploy', `₹${deployedWk2.toLocaleString('en-IN',{maximumFractionDigits:0})}`, '#38bdf8', 'Tier 2 signals (top 3)'],
                      ['Reserve', `₹${reserve.toLocaleString('en-IN',{maximumFractionDigits:0})}`, '#fbbf24', 'Never fully deploy'],
                      ['Max Positions', '4', '#c084fc', 'Open at any time'],
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
                  <div className="no-data" style={{ textAlign:'center', padding:'60px', color:'#64748b', background:'rgba(0,0,0,0.2)', borderRadius:'16px' }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:'15px' }}>{marketBullish ? '📊' : '🛡️'}</div>
                    <div style={{ fontSize:'1.1rem', fontWeight:'bold', color: marketBullish ? '#94a3b8' : '#f87171', marginBottom:'8px' }}>
                      {marketBullish ? 'No budget-friendly signals loaded yet.' : 'Signals Paused: Bearish Market Trend'}
                    </div>
                    <div style={{ fontSize:'0.85rem', color:'#64748b', maxWidth:'450px', margin:'0 auto' }}>
                      {marketBullish 
                        ? 'Visit All NSE (Buy Only) or High Conviction tabs first to load signal data, then return here.'
                        : 'Capital preservation is active because Nifty is in a downtrend. Signals will reappear once the market stabilizes above its 50-day EMA.'}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tier 1 */}
                    {tier1.length > 0 && (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                          <div style={{ height:'1px', flex:1, background:'#059669' }} />
                          <span style={{ color:'#34d399', fontWeight:'bold', fontSize:'0.95rem', whiteSpace:'nowrap' }}>🥇 Tier 1 — Enter Week 1 (Score ≥ 80)</span>
                          <div style={{ height:'1px', flex:1, background:'#059669' }} />
                        </div>
                        <div className="grid" style={{ marginBottom:'28px' }}>
                          {tier1.map(s => <SignalCard key={s.symbol} s={s} />)}
                        </div>
                      </>
                    )}

                    {/* Tier 2 */}
                    {tier2.length > 0 && (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                          <div style={{ height:'1px', flex:1, background:'#0284c7' }} />
                          <span style={{ color:'#38bdf8', fontWeight:'bold', fontSize:'0.95rem', whiteSpace:'nowrap' }}>🥈 Tier 2 — Enter Week 2 if Wk1 in profit (Score 65–79)</span>
                          <div style={{ height:'1px', flex:1, background:'#0284c7' }} />
                        </div>
                        <div className="grid" style={{ marginBottom:'28px' }}>
                          {tier2.map(s => <SignalCard key={s.symbol} s={s} />)}
                        </div>
                      </>
                    )}

                    {/* Watchlist */}
                    {watchlist.length > 0 && (
                      <>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
                          <div style={{ height:'1px', flex:1, background:'#334155' }} />
                          <span style={{ color:'#64748b', fontWeight:'bold', fontSize:'0.95rem', whiteSpace:'nowrap' }}>👁 Watchlist — Hold, wait for better setup (Score &lt; 65)</span>
                          <div style={{ height:'1px', flex:1, background:'#334155' }} />
                        </div>
                        <div className="grid">
                          {watchlist.map(s => <SignalCard key={s.symbol} s={s} />)}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            );
          })()}
        </>
      )}
    </div>

    {selectedDetail && (
      <>
        <div onClick={() => setSelectedDetail(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, backdropFilter:'blur(2px)' }} />
        <StockDetailDrawer symbol={selectedDetail} onClose={() => setSelectedDetail(null)} />
      </>
    )}

    {sectorInsight && (
      <>
        <div onClick={() => setSectorInsight(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:999, backdropFilter:'blur(2px)' }} />
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%, -50%)', background:'linear-gradient(135deg, #0f172a, #020617)', border:'1px solid #334155', borderRadius:'16px', padding:'24px', zIndex:1000, minWidth:'320px', boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <h3 style={{ margin:0, color:'#f8fafc', fontSize:'1.2rem', display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'1.4rem' }}>🏆</span>
              {sectorInsight.sector} Leader
            </h3>
            <button onClick={() => setSectorInsight(null)} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
          </div>
          
          {sectorInsight.loading ? (
            <div style={{ padding:'30px', textAlign:'center', color:'#94a3b8' }}>
              <div style={{ marginBottom:'12px' }}>Hunting for the top gainer...</div>
              <div className="loader" style={{ fontSize:'0.8rem', padding:0 }}></div>
            </div>
          ) : sectorInsight.error ? (
            <div style={{ padding:'20px', textAlign:'center', color:'#f87171' }}>{sectorInsight.error}</div>
          ) : sectorInsight.data ? (
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'12px', padding:'20px', cursor:'pointer', transition:'transform 0.2s', boxShadow:'0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                 onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(56, 189, 248, 0.4)'; }}
                 onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; }}
                 onClick={() => { setSectorInsight(null); setSelectedDetail(sectorInsight.data.symbol); }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                <h2 style={{ margin:0, fontSize:'1.6rem', color:'#38bdf8' }}>{sectorInsight.data.symbol}</h2>
                <div style={{ background: sectorInsight.data.change_pct >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: sectorInsight.data.change_pct >= 0 ? '#4ade80' : '#f87171', padding:'6px 12px', borderRadius:'8px', fontWeight:'bold', fontSize:'1.1rem' }}>
                  {sectorInsight.data.change_pct > 0 ? '+' : ''}{sectorInsight.data.change_pct}%
                </div>
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

export default App
