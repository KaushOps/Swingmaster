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
  isWatchlisted,
  onToggleWatchlist,
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
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
            {stock.sector || 'Equities'} {rank !== undefined && `• #${rank}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StatusBadge status={stock.action || stock.status || 'BUY'} />
            {onToggleWatchlist && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleWatchlist(stock); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  lineHeight: 1,
                  opacity: isWatchlisted ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                  color: isWatchlisted ? '#fbbf24' : '#94a3b8',
                  filter: isWatchlisted ? 'drop-shadow(0 0 4px rgba(251,191,36,0.6))' : 'none',
                }}
                title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isWatchlisted ? '★' : '☆'}
              </button>
            )}
          </div>
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
          <>
            {/* Fundamental score bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 6 }}>
                <span>Fundamental Score</span>
                <span style={{ color: '#0ea5e9', fontWeight: 800 }}>{stock.score != null ? `${stock.score}/100` : '—'}</span>
              </div>
              <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, stock.score || 0)}%`,
                  background: stock.score >= 70 ? '#10b981' : stock.score >= 55 ? '#0ea5e9' : '#f59e0b',
                  borderRadius: 3, transition: 'width 0.6s ease-out'
                }} />
              </div>
              {/* Score breakdown mini pills */}
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {stock.score_growth   != null && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>Growth {stock.score_growth}</span>}
                {stock.score_profitability != null && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(14,165,233,0.12)', color: '#38bdf8' }}>Profit {stock.score_profitability}</span>}
                {stock.score_balance_sheet != null && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(168,85,247,0.12)', color: '#a78bfa' }}>B/S {stock.score_balance_sheet}</span>}
                {stock.score_valuation    != null && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>Val {stock.score_valuation}</span>}
              </div>
            </div>
            {/* Key fundamental metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>Rev Growth</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: stock.revenue_growth_pct >= 25 ? '#10b981' : stock.revenue_growth_pct >= 10 ? '#38bdf8' : 'var(--text-bright)' }}>
                  {stock.revenue_growth_pct != null ? `${stock.revenue_growth_pct > 0 ? '+' : ''}${stock.revenue_growth_pct}%` : '—'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>FCF Margin</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: stock.fcf_margin_pct >= 15 ? '#10b981' : stock.fcf_margin_pct >= 0 ? '#38bdf8' : '#f87171' }}>
                  {stock.fcf_margin_pct != null ? `${stock.fcf_margin_pct > 0 ? '+' : ''}${stock.fcf_margin_pct}%` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>D/E Ratio</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: stock.debt_to_equity <= 0.5 ? '#10b981' : stock.debt_to_equity <= 1.5 ? '#fbbf24' : '#f87171' }}>
                  {stock.debt_to_equity != null ? `${stock.debt_to_equity.toFixed(2)}x` : '—'}
                </div>
              </div>
            </div>
          </>
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
                    {stock.growth_pct != null ? `${stock.growth_pct >= 0 ? '+' : ''}${stock.growth_pct}%` : ''}
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
          
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {onLogTrade && (
              <button 
                onClick={(e) => { e.stopPropagation(); onLogTrade(stock, stock.entry); }}
                style={{
                  background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
                  color: '#22c55e', padding: '4px 10px', borderRadius: 6,
                  fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                }}
                title="Log this trade"
              >
                + Log
              </button>
            )}
            <button style={{
              background: 'transparent', border: '1px solid var(--border-subtle)',
              color: 'var(--text-dim)', padding: '4px 10px', borderRadius: 6,
              fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'
            }}>
              Details ➔
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
