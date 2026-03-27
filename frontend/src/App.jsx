import { useEffect, useState } from 'react'
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

const StatusBadge = ({ status }) => {
  const cls = status === 'TARGET HIT' ? 'target-hit' : status === 'SL HIT' ? 'sl-hit' : status === 'STRONG BUY' ? 'strong-buy' : status === 'BUY' ? 'buy' : 'active';
  return <span className={`badge ${cls}`}>{status}</span>;
};

function StockGrid({ data, currency, capLabel }) {
  if (!data || data.length === 0) return <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--text-dim)'}}>No active signals at this time.</div>;
  return (
    <>
      {data.map(stock => (
        <div className="card" key={stock.symbol}>
          <div className="card-header">
            <h2>{stock.symbol}</h2>
            <StatusBadge status={stock.action} />
          </div>
          <div className="stats-grid">
            <div className="stat"><span>Entry</span><strong>{currency}{stock.entry.toFixed(2)}</strong></div>
            <div className="stat"><span>Target</span><strong className="up">{currency}{stock.target.toFixed(2)}</strong></div>
            <div className="stat"><span>Stoploss</span><strong className="down">{currency}{stock.stoploss.toFixed(2)}</strong></div>
            <div className="stat"><span>Confidence</span><strong>{stock.confidence.toFixed(1)}%</strong></div>
            <div className="stat"><span>Vol Spike</span><strong className={stock.volume_ratio > 1.5 ? 'up' : 'wait'}>{stock.volume_ratio.toFixed(2)}x</strong></div>
          </div>
          <div className="backtest-section">
            <h3>1-3 Month Swing Backtest ({capLabel})</h3>
            <div className="bt-stats">
              <div>Win Rate: <span>{stock.backtest.win_rate.toFixed(1)}%</span></div>
              <div>Sharpe: <span>{stock.backtest.sharpe_ratio.toFixed(2)}</span></div>
              <div>Drawdown: <span className="down">{stock.backtest.max_drawdown.toFixed(1)}%</span></div>
              <div>Return: <span className={stock.backtest.total_return >= 0 ? 'up' : 'down'}>{stock.backtest.total_return.toFixed(1)}%</span></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function HistoryPanel({ histData, stats, selectedDate, onSelect, onClose, accentColor, TooltipComponent, bannerTheme }) {
  const chartWidth = Math.max(1200, histData.length * 22);
  return (
    <>
      {stats && stats.total_signals > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'24px', padding:'20px', backgroundColor: bannerTheme === 'amber' ? '#1c1410' : '#0f1e1c', borderRadius:'15px', border:`1px solid ${bannerTheme === 'amber' ? '#78350f' : '#0d4038'}` }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color: bannerTheme === 'amber' ? '#fbbf24' : '#66fcf1' }}>{stats.win_rate_pct}%</div>
            <div style={{ fontSize:'0.8rem', color: bannerTheme === 'amber' ? '#fde68a' : '#a7f3d0', opacity:0.8 }}>Historical Win Rate</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#4ade80' }}>{stats.target_hit}</div>
            <div style={{ fontSize:'0.8rem', color:'#86efac', opacity:0.8 }}>Targets Hit</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#f87171' }}>{stats.sl_hit}</div>
            <div style={{ fontSize:'0.8rem', color:'#fca5a5', opacity:0.8 }}>Stop Losses Hit</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'2rem', fontWeight:'800', color:'#60a5fa' }}>{stats.total_signals}</div>
            <div style={{ fontSize:'0.8rem', color:'#93c5fd', opacity:0.8 }}>Total Signals (2yr)</div>
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
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <h3 style={{ margin:0, color:'var(--text-main)', fontSize:'1.1rem' }}>Historical Signal Frequency</h3>
            <span style={{ fontSize:'0.85rem', color:accentColor }}>← Scroll → • Click bar for trade outcomes</span>
          </div>
          <div style={{ overflowX:'auto', paddingBottom:'4px' }}>
            <BarChart width={chartWidth} height={210} data={histData} margin={{ top:5, right:10, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickFormatter={(t) => t.slice(5)} tickMargin={8} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} width={28} />
              <ChartTooltip content={<TooltipComponent />} cursor={{ fill:'#334155', opacity:0.4 }} />
              <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={36} onClick={(d) => onSelect(d.payload)} style={{cursor:'pointer'}}>
                {histData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={selectedDate && selectedDate.date === entry.date ? '#fbbf24' : accentColor} />
                ))}
              </Bar>
            </BarChart>
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
              <div className="card" key={`${stock.symbol}-${i}`} style={{ borderColor: stock.status === 'TARGET HIT' ? '#22c55e44' : stock.status === 'SL HIT' ? '#ef444444' : '#3b82f644' }}>
                <div className="card-header">
                  <h2>{stock.symbol}</h2>
                  <StatusBadge status={stock.status} />
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
  const [market, setMarket]               = useState("IN")
  const [isScanningBackground, setIsScanningBackground] = useState(false)

  useEffect(() => {
    let ignore = false;
    setData([]); setHistoricalData([]); setNseStats(null); setHcData([]); setHcHistorical([]); setHcStats(null);
    setSelectedHistDate(null); setSelectedHcDate(null); setLoading(true);

    const isNSEBuys = market === "NSE_BUYS";
    const isHC      = market === "HC";
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    let url = isHC ? `${baseUrl}/api/high_conviction`
            : isNSEBuys ? `${baseUrl}/api/scan_universe_buys`
            : `${baseUrl}/api/scan?market=${market}`;

    fetch(url)
      .then(r => r.json())
      .then(result => {
        if (ignore) return;
        setData(result.data || []);
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

  return (
    <div className="container">
      <header className="header">
        <h1>Global Swing <span className="highlight">Scanner</span></h1>
        <p className="subtitle">AI-Powered Equity Prediction</p>
        <div className="tabs">
          <button className={`tab ${market === "IN"       ? "active" : ""}`} onClick={() => setMarket("IN")}>🇮🇳 India (NSE)</button>
          <button className={`tab ${market === "US"       ? "active" : ""}`} onClick={() => setMarket("US")}>🇺🇸 USA (NYSE)</button>
          <button className={`tab ${market === "NSE_BUYS" ? "active" : ""}`} onClick={() => setMarket("NSE_BUYS")}>🚀 All NSE (Buy Only)</button>
          <button className={`tab ${market === "HC"       ? "active" : ""}`} onClick={() => setMarket("HC")} style={{ borderColor: market === "HC" ? "#fbbf24" : undefined, color: market === "HC" ? "#fbbf24" : undefined }}>🎯 High Conviction</button>
        </div>
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
                histData={hcHistorical}
                stats={hcStats}
                selectedDate={selectedHcDate}
                onSelect={setSelectedHcDate}
                onClose={() => setSelectedHcDate(null)}
                accentColor="#fbbf24"
                bannerTheme="amber"
                TooltipComponent={HCTooltip}
              />

              {!selectedHcDate && (
                <div className="grid">
                  {data.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center',padding:'40px',color:'var(--text-dim)'}}>No High Conviction signals today. Thresholds are intentionally strict — quality over quantity.</div>}
                  {data.map(stock => (
                    <div className="card" key={stock.symbol} style={{ borderColor:'#fbbf2444', boxShadow:'0 0 20px #fbbf2411' }}>
                      <div className="card-header">
                        <h2>{stock.symbol}</h2>
                        <StatusBadge status={stock.action} />
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                        <div style={{ height:'6px', flex:1, background:'#334155', borderRadius:'3px' }}>
                          <div style={{ height:'100%', width:`${stock.confidence}%`, background:'linear-gradient(to right,#fbbf24,#f59e0b)', borderRadius:'3px' }} />
                        </div>
                        <span style={{ color:'#fbbf24', fontWeight:'bold', fontSize:'0.9rem' }}>{stock.confidence.toFixed(1)}%</span>
                      </div>
                      <div className="stats-grid">
                        <div className="stat"><span>Entry</span><strong>₹{stock.entry.toFixed(2)}</strong></div>
                        <div className="stat"><span>Target</span><strong className="up">₹{stock.target.toFixed(2)}</strong></div>
                        <div className="stat"><span>Stoploss</span><strong className="down">₹{stock.stoploss.toFixed(2)}</strong></div>
                        <div className="stat"><span>Vol Spike</span><strong style={{color:'#fbbf24'}}>{stock.volume_ratio.toFixed(2)}x 🔥</strong></div>
                      </div>
                      <div className="backtest-section">
                        <h3>Backtest (₹1L Cap)</h3>
                        <div className="bt-stats">
                          <div>Win Rate: <span>{stock.backtest.win_rate.toFixed(1)}%</span></div>
                          <div>Sharpe: <span>{stock.backtest.sharpe_ratio.toFixed(2)}</span></div>
                          <div>Drawdown: <span className="down">{stock.backtest.max_drawdown.toFixed(1)}%</span></div>
                          <div>Return: <span className={stock.backtest.total_return >= 0 ? 'up' : 'down'}>{stock.backtest.total_return.toFixed(1)}%</span></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* NSE BUY ONLY VIEW */}
          {market === "NSE_BUYS" && (
            <>
              <HistoryPanel
                histData={historicalData}
                stats={nseStats}
                selectedDate={selectedHistDate}
                onSelect={setSelectedHistDate}
                onClose={() => setSelectedHistDate(null)}
                accentColor="#66fcf1"
                bannerTheme="teal"
                TooltipComponent={CustomTooltip}
              />
              {!selectedHistDate && (
                <div className="grid">
                  {data.length === 0 && <div className="no-data" style={{gridColumn:'1/-1',textAlign:'center'}}>No active BUY signals found today.</div>}
                  <StockGrid data={data} currency="₹" capLabel="₹1L Cap" />
                </div>
              )}
            </>
          )}

          {/* IN / US VIEWS */}
          {(market === "IN" || market === "US") && (
            <div className="grid">
              <StockGrid data={data} currency={currency} capLabel={capLabel} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App
