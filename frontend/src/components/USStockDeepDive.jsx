import { useMemo, useState, useEffect } from 'react';
import {
  getStockData, formatLargeNumber, formatPercent,
  getRatingColor, getConvictionBadge, calculateDCF,
} from '../lib/usResearch';

/* ── Neon palette — used only when dark===true ── */
const N = {
  cyan:   '#00f5ff',
  pink:   '#ff2d78',
  purple: '#bf5fff',
  red:    '#ff3b3b',
  green:  '#39ff8f',
  amber:  '#ffb800',
};

export default function USStockDeepDive({ ticker, liveSignal, onClose }) {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.dataset.theme === 'dark'));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const data = useMemo(() => getStockData(ticker), [ticker]);
  const dcf  = useMemo(() => calculateDCF(ticker), [ticker]);

  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
      No data available for <strong>{ticker}</strong>
    </div>
  );

  const { info, financials, earnings, analysts, theses } = data;
  const annual  = (financials || []).filter(f => f.periodType === 'annual');
  const latest  = annual.length > 0 ? annual[annual.length - 1] : null;
  const prev    = annual.length >= 2 ? annual[annual.length - 2] : null;

  const revGrowth   = prev && latest && prev.revenue > 0 ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const grossMargin = latest && latest.revenue > 0 ? (latest.grossProfit / latest.revenue) * 100 : 0;
  const opMargin    = latest && latest.revenue > 0 ? (latest.operatingIncome / latest.revenue) * 100 : 0;
  const netMargin   = latest && latest.revenue > 0 ? (latest.netIncome / latest.revenue) * 100 : 0;
  const fcf         = latest ? (latest.operatingCashFlow - latest.capex) : 0;
  const fcfMargin   = latest && latest.revenue > 0 ? (fcf / latest.revenue) * 100 : 0;

  const bullThesis = theses?.find(t => t.type === 'bull');
  const baseThesis = theses?.find(t => t.type === 'base');
  const bearThesis = theses?.find(t => t.type === 'bear');

  const buyCount      = analysts?.filter(a => ['Buy','Strong Buy','Outperform','Overweight'].includes(a.rating)).length || 0;
  const holdCount     = analysts?.filter(a => ['Hold','Neutral','Market Perform'].includes(a.rating)).length || 0;
  const sellCount     = analysts?.filter(a => ['Sell','Underperform','Underweight'].includes(a.rating)).length || 0;
  const totalAnalysts = buyCount + holdCount + sellCount;
  const up            = (info.changePercent ?? 0) >= 0;

  /* ── Theme helpers ── */
  const d = (neon, plain) => dark ? neon : plain;

  /* Section heading */
  const SecHead = ({ children, accent }) => (
    <h3 style={{ margin:'0 0 12px', fontSize:'0.75rem', fontWeight:900, textTransform:'uppercase',
      letterSpacing: dark ? '0.12em' : '0.04em',
      color: d(accent, 'var(--text-bright)'),
      textShadow: dark ? `0 0 8px ${accent}66` : 'none',
      borderBottom: `1px solid ${d(accent+'33','var(--border-subtle)')}`, paddingBottom:8,
      display:'flex', alignItems:'center', gap:8 }}>
      {children}
    </h3>
  );

  /* Metric box */
  const MetBox = ({ label, value, accent }) => (
    <div style={{ background: d(`${accent}0a`,'var(--bg-elevated)'),
      border:`1px solid ${d(accent+'28','var(--border-subtle)')}`,
      borderRadius:8, padding:'9px 11px', position:'relative', overflow:'hidden' }}>
      {dark && <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px',
        background:`linear-gradient(90deg,transparent,${accent}55,transparent)` }} />}
      <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:'0.95rem', fontWeight:800,
        color: d(accent,'var(--text-bright)'),
        textShadow: dark ? `0 0 6px ${accent}55` : 'none' }}>{value}</div>
    </div>
  );

  /* Pill badge */
  const Badge = ({ children, accent, small }) => (
    <span style={{ display:'inline-flex', alignItems:'center',
      background: d(`${accent}15`, `${accent}12`),
      color: d(accent, accent),
      border:`1px solid ${d(accent+'44', accent+'30')}`,
      borderRadius:4, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em',
      fontSize: small ? '0.58rem' : '0.63rem',
      padding: small ? '2px 7px' : '3px 9px',
      textShadow: dark ? `0 0 6px ${accent}` : 'none' }}>
      {children}
    </span>
  );

  return (
    <div style={{ animation:'fade-in 0.25s ease-out' }}>

      {/* ── HERO HEADER ── */}
      <div style={{ position:'relative', overflow:'hidden', marginBottom:20, padding:'22px 26px',
        background: d('#000000','var(--bg-elevated)'), borderRadius:16,
        border: d(`1px solid ${liveSignal ? N.pink+'44' : N.cyan+'28'}`, '1px solid var(--border-subtle)'),
        boxShadow: d(liveSignal ? `0 0 40px ${N.pink}18` : `0 0 30px ${N.cyan}12`, 'var(--shadow-card)') }}>
        {/* Dark-only: cyber grid + glows */}
        {dark && <>
          <div style={{ position:'absolute', inset:0, borderRadius:16, pointerEvents:'none', opacity:0.08,
            backgroundImage:`linear-gradient(${N.cyan}44 1px,transparent 1px),linear-gradient(90deg,${N.cyan}44 1px,transparent 1px)`,
            backgroundSize:'32px 32px' }} />
          <div style={{ position:'absolute', top:-60, right:0, width:200, height:200, borderRadius:'50%',
            background:`radial-gradient(circle,${N.red}44 0%,transparent 70%)`, filter:'blur(30px)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px',
            background:`linear-gradient(90deg,transparent,${liveSignal?N.green:N.cyan},transparent)`, opacity:0.4, pointerEvents:'none' }} />
        </>}

        <div style={{ position:'relative', display:'flex', flexWrap:'wrap', gap:20, justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1, minWidth:240 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:8 }}>
              <span style={{ fontSize:'1.9rem', fontWeight:900, letterSpacing: dark ? '0.06em' : '0',
                color: d(liveSignal ? N.green : N.cyan, 'var(--text-bright)'),
                textShadow: dark ? `0 0 20px ${liveSignal ? N.green : N.cyan}` : 'none' }}>{info.ticker}</span>
              <Badge accent={d(N.purple,'var(--accent-purple)')}>{info.sector}</Badge>
              {liveSignal && <Badge accent={N.green}>◉ Live Signal · {liveSignal.action}</Badge>}
            </div>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text-bright)', marginBottom:4 }}>{info.name}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
              {info.industry} · {info.headquarters} · Est. {info.founded}
            </div>
            <p style={{ fontSize:'0.82rem', color:'var(--text-main)', lineHeight:1.65, margin:0, maxWidth:560 }}>{info.description}</p>
          </div>

          {/* Price card */}
          <div style={{ flexShrink:0, minWidth:160, padding:'14px 18px', borderRadius:12, textAlign:'right',
            background: d('#0a0a0a','var(--bg-card)'),
            border:`1px solid ${up ? d(N.green+'44','rgba(16,185,129,0.2)') : d(N.red+'44','rgba(239,68,68,0.2)')}`,
            boxShadow: dark ? `0 0 18px ${up ? N.green : N.red}18` : 'var(--shadow-card)' }}>
            <div style={{ fontSize:'2rem', fontWeight:900, color:'var(--text-bright)', lineHeight:1 }}>${(info.price??0).toFixed(2)}</div>
            <div style={{ fontSize:'1rem', fontWeight:800, marginTop:3, marginBottom:10,
              color: up ? 'var(--up-color)' : 'var(--down-color)',
              textShadow: dark ? `0 0 10px ${up ? N.green : N.red}` : 'none' }}>
              {formatPercent(info.changePercent??0)}
            </div>
            {[['52W High', info.high52Week!=null?`$${info.high52Week.toFixed(2)}`:'—'],
              ['52W Low',  info.low52Week!=null?`$${info.low52Week.toFixed(2)}`:'—'],
              ['Mkt Cap',  formatLargeNumber(info.marketCap)],
              ['Avg Vol',  info.avgVolume!=null?`${(info.avgVolume/1e6).toFixed(1)}M`:'—'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:12, fontSize:'0.67rem', marginBottom:2 }}>
                <span style={{ color:'var(--text-dim)' }}>{k}</span>
                <span style={{ color:'var(--text-main)', fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIVE SIGNAL STRIP ── */}
      {liveSignal && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:10, marginBottom:20,
          padding:'14px 18px', borderRadius:12,
          background: d('#000000','var(--bg-elevated)'),
          border: d(`1px solid ${N.green}33`,'1px solid rgba(16,185,129,0.2)'),
          boxShadow: dark ? `0 0 20px ${N.green}12` : 'none' }}>
          {[
            { label:'Entry',      value:`$${liveSignal.entry?.toFixed(2)}`,       accent: d(N.cyan,   'var(--text-bright)') },
            { label:'Target',     value:`$${liveSignal.target?.toFixed(2)}`,      accent: d(N.green,  'var(--up-color)') },
            { label:'Stop Loss',  value:`$${liveSignal.stoploss?.toFixed(2)}`,    accent: d(N.red,    'var(--down-color)') },
            { label:'Conviction', value:`${liveSignal.confidence?.toFixed(1)}%`,  accent: d(N.amber,  'var(--text-main)') },
            { label:'Vol Spike',  value:`${liveSignal.volume_ratio?.toFixed(1)}x`,accent: d(N.purple, 'var(--text-dim)') },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize:'0.55rem', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>{m.label}</div>
              <div style={{ fontSize:'1rem', fontWeight:900, color: m.accent,
                textShadow: dark ? `0 0 8px ${m.accent}88` : 'none' }}>{m.value||'—'}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── KEY METRICS ── */}
      <div style={{ marginBottom:20 }}>
        <SecHead accent={N.cyan}>⬡ Key Metrics</SecHead>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(115px,1fr))', gap:8 }}>
          {[
            { label:'P/E Ratio',    value: info.peRatio!=null    ? `${info.peRatio.toFixed(1)}x`    : '—', accent:N.cyan },
            { label:'Forward P/E',  value: info.forwardPE!=null  ? `${info.forwardPE.toFixed(1)}x`  : '—', accent:N.cyan },
            { label:'P/S Ratio',    value: info.psRatio!=null    ? `${info.psRatio.toFixed(1)}x`    : '—', accent:N.purple },
            { label:'P/B Ratio',    value: info.pbRatio!=null    ? `${info.pbRatio.toFixed(1)}x`    : '—', accent:N.purple },
            { label:'EV/EBITDA',    value: info.evToEbitda!=null ? `${info.evToEbitda.toFixed(1)}x` : '—', accent:N.purple },
            { label:'Beta',         value: info.beta!=null       ? info.beta.toFixed(2)              : '—', accent:N.amber },
            { label:'Div. Yield',   value: info.dividendYield!=null ? `${(info.dividendYield*100).toFixed(2)}%` : '—', accent:N.amber },
            { label:'Rev Growth',   value: formatPercent(revGrowth),  accent: revGrowth>=0?N.green:N.red },
            { label:'Gross Margin', value: `${grossMargin.toFixed(1)}%`, accent:N.green },
            { label:'Op. Margin',   value: `${opMargin.toFixed(1)}%`,   accent: opMargin>=15?N.green:N.amber },
            { label:'Net Margin',   value: `${netMargin.toFixed(1)}%`,  accent: netMargin>=10?N.green:N.amber },
            { label:'FCF Margin',   value: `${fcfMargin.toFixed(1)}%`,  accent: fcfMargin>=10?N.green:N.amber },
          ].map(m => <MetBox key={m.label} label={m.label} value={m.value} accent={m.accent} />)}
        </div>
      </div>

      {/* ── DCF VALUATION ── */}
      {dcf && (
        <div style={{ marginBottom:20, padding:'16px 18px', borderRadius:12,
          background: d(`${N.pink}06`,'var(--bg-elevated)'),
          border: d(`1px solid ${N.pink}25`,'1px solid var(--border-subtle)') }}>
          <SecHead accent={N.pink}>◈ DCF Fair Value</SecHead>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:8, marginBottom:10 }}>
            <MetBox label="Fair Value"  value={`$${dcf.fairValue.toFixed(2)}`}  accent={dcf.upside>=0?N.green:N.red} />
            <MetBox label="Upside"      value={formatPercent(dcf.upside)}       accent={dcf.upside>=0?N.green:N.red} />
            <MetBox label="Growth Rate" value={`${dcf.growthRate.toFixed(1)}%`} accent={N.amber} />
            <MetBox label="WACC"        value={`${dcf.wacc.toFixed(1)}%`}       accent={N.purple} />
            <MetBox label="TTM FCF"     value={formatLargeNumber(dcf.fcf)}      accent={N.cyan} />
          </div>
          <p style={{ margin:0, fontSize:'0.67rem', color:'var(--text-dim)' }}>
            5-year DCF model · Declining growth assumption · Not financial advice
          </p>
        </div>
      )}

      {/* ── ANALYST + EPS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
        <div>
          <SecHead accent={N.amber}>◈ Analyst Ratings ({analysts?.length||0})</SecHead>
          {totalAnalysts > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ display:'flex', gap:6, marginBottom:6 }}>
                {[['BUY',buyCount,N.green,'var(--up-color)'],['HOLD',holdCount,N.amber,'#f59e0b'],['SELL',sellCount,N.red,'var(--down-color)']].map(([lbl,cnt,nClr,lClr]) => (
                  <div key={lbl} style={{ flex:cnt||0.1, background: d(`${nClr}12`,`${lClr}10`),
                    border:`1px solid ${d(nClr+'40',lClr+'30')}`, borderRadius:7, padding:'6px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.58rem', color: d(nClr,lClr), fontWeight:800, letterSpacing:'0.08em' }}>{lbl}</div>
                    <div style={{ fontSize:'1.1rem', fontWeight:900, color: d(nClr,lClr),
                      textShadow: dark ? `0 0 6px ${nClr}` : 'none' }}>{cnt}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:1, borderRadius:3, overflow:'hidden', height:3 }}>
                {buyCount>0  && <div style={{ flex:buyCount,  background:'var(--up-color)' }} />}
                {holdCount>0 && <div style={{ flex:holdCount, background:'#f59e0b' }} />}
                {sellCount>0 && <div style={{ flex:sellCount, background:'var(--down-color)' }} />}
              </div>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:240, overflowY:'auto' }}>
            {(analysts||[]).slice(-6).reverse().map((a,i) => {
              const isPos = getRatingColor(a.rating) === '#10b981';
              const isNeg = getRatingColor(a.rating) === '#ef4444';
              const accentD = isPos ? N.green : isNeg ? N.red : N.amber;
              const accentL = isPos ? 'var(--up-color)' : isNeg ? 'var(--down-color)' : '#f59e0b';
              const ac = d(accentD, accentL);
              return (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'7px 10px', background: d(`${accentD}08`,`${accentD}06`),
                  border:`1px solid ${d(accentD+'25',accentD+'18')}`, borderRadius:7 }}>
                  <div>
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-bright)' }}>{a.firm}</div>
                    <div style={{ fontSize:'0.64rem', color:'var(--text-dim)' }}>{a.date}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.7rem', fontWeight:900, color: ac,
                      textShadow: dark ? `0 0 5px ${ac}` : 'none' }}>{a.rating}</div>
                    <div style={{ fontSize:'0.67rem', color:'var(--up-color)', fontWeight:700 }}>${a.priceTarget?.toFixed(0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SecHead accent={N.purple}>◈ EPS Surprise History</SecHead>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {(earnings||[]).filter(e=>e.epsActual!==null).slice(-6).reverse().map((e,i) => {
              const pos = (e.surprise||0) >= 0;
              const acD = pos ? N.green : N.red;
              const acL = pos ? 'var(--up-color)' : 'var(--down-color)';
              return (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'7px 10px', background: d(`${acD}08`,`${acD}06`),
                  border:`1px solid ${d(acD+'25',acD+'18')}`, borderRadius:7 }}>
                  <div>
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-bright)' }}>{e.period}</div>
                    <div style={{ fontSize:'0.64rem', color:'var(--text-dim)' }}>{e.reportDate}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-main)' }}>
                      Act: <span style={{ color: d(N.cyan,'var(--accent-purple)'),
                        textShadow: dark ? `0 0 5px ${N.cyan}` : 'none' }}>${e.epsActual?.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize:'0.67rem', fontWeight:800,
                      color: pos ? 'var(--up-color)' : 'var(--down-color)',
                      textShadow: dark ? `0 0 5px ${acD}` : 'none' }}>
                      {pos?'+':''}{e.surprise?.toFixed(2)}% surp
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FINANCIALS TABLE ── */}
      <div style={{ marginBottom:20 }}>
        <SecHead accent={N.cyan}>◈ Annual Financials</SecHead>
        <div style={{ overflowX:'auto', borderRadius:10,
          border:'1px solid var(--border-subtle)',
          background: d('#000000','var(--bg-elevated)') }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${d(N.cyan+'22','var(--border-subtle)')}` }}>
                {['Metric',...annual.map(f=>f.period)].map((h,i) => (
                  <th key={i} style={{ padding:'9px 12px', textAlign:i===0?'left':'right',
                    color: i===0 ? 'var(--text-dim)' : d(N.cyan,'var(--text-bright)'),
                    fontWeight:800, fontSize:'0.65rem', letterSpacing:'0.06em', textTransform:'uppercase',
                    textShadow: dark && i>0 ? `0 0 6px ${N.cyan}55` : 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label:'Revenue',       key:'revenue',           fmt:formatLargeNumber,         acD:N.cyan,   acL:'var(--text-bright)' },
                { label:'Gross Profit',  key:'grossProfit',       fmt:formatLargeNumber,         acD:N.green,  acL:'var(--up-color)' },
                { label:'Net Income',    key:'netIncome',         fmt:formatLargeNumber,         acD:N.green,  acL:'var(--up-color)' },
                { label:'EPS',           key:'eps',               fmt:v=>`$${v?.toFixed(2)}`,   acD:N.amber,  acL:'#f59e0b' },
                { label:'Op. Cash Flow', key:'operatingCashFlow', fmt:formatLargeNumber,         acD:N.purple, acL:'var(--accent-purple)' },
                { label:'Total Debt',    key:'totalDebt',         fmt:formatLargeNumber,         acD:N.red,    acL:'var(--down-color)' },
              ].map((row,ri) => (
                <tr key={row.label} style={{ borderBottom:'1px solid var(--border-subtle)',
                  background: ri%2===0 ? d('rgba(255,255,255,0.02)','var(--bg-card)') : 'transparent' }}>
                  <td style={{ padding:'8px 12px', color:'var(--text-dim)', fontWeight:600, fontSize:'0.68rem', whiteSpace:'nowrap' }}>{row.label}</td>
                  {annual.map((f,i) => (
                    <td key={i} style={{ padding:'8px 12px', textAlign:'right', fontWeight:800, fontSize:'0.8rem',
                      color: d(row.acD, row.acL),
                      textShadow: dark ? `0 0 5px ${row.acD}44` : 'none' }}>
                      {f[row.key]!=null ? row.fmt(f[row.key]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── INVESTMENT THESES ── */}
      {theses && theses.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <SecHead accent={N.pink}>◈ Investment Theses</SecHead>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
            {[bullThesis,baseThesis,bearThesis].filter(Boolean).map(t => {
              const acD = t.type==='bull' ? N.green : t.type==='bear' ? N.red : N.amber;
              const acL = t.type==='bull' ? 'var(--up-color)' : t.type==='bear' ? 'var(--down-color)' : '#f59e0b';
              const ac  = d(acD, acL);
              const conv = getConvictionBadge(t.conviction);
              const convAc = conv.color==='#10b981' ? d(N.green,'var(--up-color)') : conv.color==='#ef4444' ? d(N.red,'var(--down-color)') : d(N.amber,'#f59e0b');
              return (
                <div key={t.type} style={{ position:'relative', overflow:'hidden',
                  background: d(`${acD}0a`,`${acD}06`),
                  border:`1px solid ${d(acD+'35',acD+'22')}`, borderRadius:12, padding:'14px 16px' }}>
                  {dark && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px',
                    background:`linear-gradient(90deg,transparent,${acD},transparent)` }} />}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:5 }}>
                    <Badge accent={ac}>{t.type==='bull'?'🐂 Bull':t.type==='bear'?'🐻 Bear':'⚖️ Base'}</Badge>
                    <Badge accent={convAc} small>{conv.label} conviction</Badge>
                  </div>
                  <div style={{ fontSize:'0.86rem', fontWeight:800, color:'var(--text-bright)', marginBottom:3, lineHeight:1.3 }}>{t.title}</div>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, marginBottom:6,
                    color: ac, textShadow: dark ? `0 0 6px ${acD}` : 'none' }}>PT: ${t.priceTarget?.toFixed(0)}</div>
                  <p style={{ fontSize:'0.77rem', color:'var(--text-main)', margin:'0 0 8px', lineHeight:1.55 }}>{t.summary}</p>
                  {t.keyDrivers?.length>0 && (
                    <div style={{ marginBottom:6 }}>
                      <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Key Drivers</div>
                      {t.keyDrivers.map((dr,i) => (
                        <div key={i} style={{ fontSize:'0.73rem', color:'var(--text-main)', padding:'1px 0', display:'flex', gap:6, alignItems:'flex-start', lineHeight:1.4 }}>
                          <span style={{ color: ac, flexShrink:0 }}>›</span>{dr}
                        </div>
                      ))}
                    </div>
                  )}
                  {t.risks?.length>0 && (
                    <div>
                      <div style={{ fontSize:'0.58rem', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Risks</div>
                      {t.risks.map((r,i) => (
                        <div key={i} style={{ fontSize:'0.73rem', color:'var(--text-dim)', padding:'1px 0', display:'flex', gap:6, alignItems:'flex-start', lineHeight:1.4 }}>
                          <span style={{ color:'var(--down-color)', flexShrink:0 }}>⚠</span>{r}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COMPANY FOOTER ── */}
      <div style={{ padding:'10px 16px', borderRadius:10,
        background: d('#0a0a0a','var(--bg-elevated)'),
        border:'1px solid var(--border-subtle)',
        display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:6 }}>
        {[['CEO',info.ceo],['Employees',(info.employees||0).toLocaleString()],['Founded',info.founded],['Website',info.website]].map(([k,v]) => (
          <div key={k}>
            <span style={{ fontSize:'0.57rem', color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{k} </span>
            <span style={{ fontSize:'0.77rem', color:'var(--text-main)', fontWeight:600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
