/**
 * StockCard — dual-tone card to match the "SwingMaster" v3 UI Mockup
 */

export function StatusBadge({ status }) {
  const map = {
    'TARGET HIT': ['#10b981', '#ffffff'],
    'SL HIT':     ['#ef4444', '#ffffff'],
    'STRONG BUY': ['#10b981', '#ffffff'],
    'BUY':        ['#3b82f6', '#ffffff'],
    'ACTIVE':     ['#3b82f6', '#ffffff'],
    'SYNCING':    ['#64748b', '#ffffff'],
  };
  const [bg, color] = map[status] || ['#64748b', '#ffffff'];
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 12px', borderRadius: 99,
      fontSize: '0.7rem', fontWeight: 800,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      color, background: bg,
    }}>
      {status}
    </span>
  );
}

export default function StockCard({
  stock,
  variant = 'nse',
  currency = '₹',
  showBacktest = false,
  onLogTrade,
  onDetail,
  rank,
}) {
  const rrRatio = stock.entry && stock.target && stock.stoploss
    ? ((stock.target - stock.entry) / (stock.entry - stock.stoploss)).toFixed(1)
    : null;

  const gainPct  = stock.target   && stock.entry ? ((stock.target   - stock.entry) / stock.entry * 100) : 0;
  const lossPct  = stock.stoploss && stock.entry ? ((stock.entry - stock.stoploss) / stock.entry * 100) : 0;
  const totalPct = gainPct + lossPct || 1;
  const greenW   = Math.min(100, (gainPct / totalPct) * 100).toFixed(1);
  const redW     = (100 - greenW).toFixed(1);

  return (
    <div
      className="stock-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        cursor: onDetail ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => onDetail && onDetail(stock.symbol)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      {/* ── Top Half (Dark Header) ── */}
      <div style={{
        background: 'var(--bg-card-top)',
        padding: '20px 24px',
        color: 'var(--text-card-top)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
            {stock.sector || 'Equities'} {rank !== undefined && `• #${rank}`}
          </div>
          <StatusBadge status={stock.action || stock.status || 'BUY'} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-card-top)' }}>
            {stock.symbol}
          </h2>
          {stock.confidence !== undefined && (
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              {stock.confidence.toFixed(0)}% confidence
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Half (Themed Body) ── */}
      <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* AI Confidence Bar */}
        {stock.confidence !== undefined && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>
              <span>AI Confidence</span>
              <span style={{ color: 'var(--text-bright)' }}>{stock.confidence.toFixed(0)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.min(100, stock.confidence)}%`,
                background: '#3b82f6',
                borderRadius: 3,
              }} />
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        {variant === 'multibagger' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>R² Trend</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>
                {stock.r_squared != null ? stock.r_squared.toFixed(2) : '—'}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>1Y Return</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--up-color)' }}>
                {stock.return_1y != null ? `${stock.return_1y}%` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>Volume Acc</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                {stock.accumulation_ratio != null ? `${stock.accumulation_ratio.toFixed(2)}x` : '—'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>Entry</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-bright)' }}>
                {stock.entry != null ? `${currency}${stock.entry.toLocaleString()}` : '—'}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>Target</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--up-color)' }}>
                {stock.target != null ? `${currency}${stock.target.toLocaleString()}` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>Stoploss</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--down-color)' }}>
                {stock.stoploss != null ? `${currency}${stock.stoploss.toLocaleString()}` : '—'}
              </div>
            </div>
          </div>
        )}

        {/* Trade Progress Bar */}
        {variant !== 'multibagger' && stock.entry && stock.target && stock.stoploss && stock.close && (
          (() => {
            const range = stock.target - stock.stoploss;
            const currentPos = stock.close - stock.stoploss;
            let progressPct = (currentPos / range) * 100;
            progressPct = Math.max(0, Math.min(100, progressPct)); // Clamp 0 to 100
            
            const entryPos = stock.entry - stock.stoploss;
            const entryPct = (entryPos / range) * 100;

            const inProfit = stock.close >= stock.entry;
            
            return (
              <div style={{ marginBottom: 24, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 8 }}>
                  <span>Trade Progress</span>
                  <span style={{ color: inProfit ? 'var(--up-color)' : 'var(--down-color)' }}>
                    {stock.growth_pct >= 0 ? '+' : ''}{stock.growth_pct}%
                  </span>
                </div>
                
                <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--border-muted)', overflow: 'hidden' }}>
                  {/* Entry Marker Line */}
                  <div style={{
                    position: 'absolute',
                    left: `${entryPct}%`,
                    top: 0, bottom: 0, width: 2, background: 'var(--text-bright)', zIndex: 10
                  }} />
                  
                  {/* Current Progress Fill */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${progressPct}%`,
                    background: inProfit ? 'var(--up-color)' : 'var(--down-color)',
                    transition: 'width 0.5s ease-out, background 0.5s ease',
                    borderRadius: progressPct === 100 ? 4 : '4px 0 0 4px'
                  }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginTop: 6, fontWeight: 700, position: 'relative' }}>
                  <span style={{ color: 'var(--down-color)' }}>SL</span>
                  <span style={{ color: 'var(--text-dim)', position: 'absolute', left: `calc(${entryPct}% - 15px)` }}>ENTRY</span>
                  <span style={{ color: 'var(--up-color)' }}>TARGET</span>
                </div>
              </div>
            );
          })()
        )}

        {/* Spacer to push footer down if needed */}
        <div style={{ flex: 1 }} />

        {/* Footer Tags */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {stock.volume_ratio != null && (
              <span style={{
                background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-purple)',
                padding: '4px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700
              }}>
                Vol {stock.volume_ratio.toFixed(1)}x
              </span>
            )}
            {/* Hardcoded ATR badge as per mockup example, or dynamic if data supports it */}
            <span style={{
              background: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9',
              padding: '4px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700
            }}>
              ATR {stock.atr > 2 ? 'High' : 'Med'}
            </span>
            {stock.growth_pct !== undefined && (
              <span style={{
                background: stock.growth_pct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: stock.growth_pct >= 0 ? 'var(--up-color)' : 'var(--down-color)',
                padding: '4px 10px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700
              }}>
                {stock.growth_pct > 0 ? '+' : ''}{stock.growth_pct.toFixed(2)}% P/L
              </span>
            )}
          </div>
          
          <button style={{
            background: 'transparent', border: '1px solid var(--border-subtle)',
            color: 'var(--text-dim)', padding: '4px 12px', borderRadius: 99,
            fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
          }}>
            Details ➔
          </button>
        </div>

      </div>
    </div>
  );
}
