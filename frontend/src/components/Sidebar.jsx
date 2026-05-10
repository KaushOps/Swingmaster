import { useState } from 'react';

export default function Sidebar({ market, setMarket, mbData, mbLoading, loadMultibagger, hcCount, nseCount, activeCount, watchlistCount = 0, usHcCount, usBuysCount }) {
  const [region, setRegion] = useState(() => {
    const usMarkets = ['US_BUYS', 'US_HC', 'US_RESEARCH'];
    return usMarkets.includes(market) ? 'US' : 'IN';
  });

  const IN_NAV_ITEMS = [
    {
      group: 'SCANNER',
      items: [
        { id: 'HC',            label: 'High Conviction',  icon: '🎯', badge: hcCount > 0 ? String(hcCount) : null },
        { id: 'NSE_BUYS',      label: 'All NSE Buys',     icon: '🚀', badge: nseCount > 0 ? String(nseCount) : null },
        { id: 'ACTIVE_SIGNALS',label: 'Active Signals',   icon: '📡', badge: activeCount > 0 ? String(activeCount) : null },
        { id: 'MULTIBAGGER',   label: 'Multibagger',      icon: '🏆', badge: 'New', isNew: true },
      ],
    },
    {
      group: 'TOOLS',
      items: [
        { id: 'ADAPTIVE',       label: 'Model Performance', icon: '📊' },
        { id: 'WATCHLIST',     label: 'My Watchlist',     icon: '⭐', badge: watchlistCount > 0 ? watchlistCount : null },
        { id: 'PORTFOLIO',      label: 'My Portfolio',     icon: '💼' },
        { id: 'BUDGET',         label: 'Budget Planner',   icon: '🧮' },
        { id: 'SIGNAL_HISTORY', label: 'Signal History',    icon: '📜' },
        { id: 'SETTINGS',       label: 'Settings',          icon: '⚙️' },
      ],
    },
  ];

  const US_NAV_ITEMS = [
    {
      group: 'US SCANNER',
      items: [
        { id: 'US_HC',           label: 'US High Conv.',    icon: '🎯', badge: usHcCount > 0 ? String(usHcCount) : null },
        { id: 'US_BUYS',         label: 'All US Buys',      icon: '🚀', badge: usBuysCount > 0 ? String(usBuysCount) : null },
        { id: 'US_MULTIBAGGER',  label: 'US Multibagger',   icon: '🏆', badge: 'New', isNew: true },
        { id: 'US_CONGRESS',     label: 'Congress Trades',  icon: '🏛️', badge: 'New', isNew: true },
        { id: 'US_RESEARCH',     label: 'US Research',      icon: '🔬' },
      ],
    },
    {
      group: 'TOOLS',
      items: [
        { id: 'ADAPTIVE',       label: 'Model Performance', icon: '📊' },
        { id: 'WATCHLIST',      label: 'My Watchlist',      icon: '⭐', badge: watchlistCount > 0 ? watchlistCount : null },
        { id: 'PORTFOLIO',      label: 'My Portfolio',      icon: '💼' },
        { id: 'SIGNAL_HISTORY', label: 'Signal History',    icon: '📜' },
        { id: 'SETTINGS',       label: 'Settings',          icon: '⚙️' },
      ],
    },
  ];

  const NAV_ITEMS = region === 'US' ? US_NAV_ITEMS : IN_NAV_ITEMS;

  return (
    <aside className="sidebar-aside" style={{
      position: 'fixed',
      top: 'var(--topbar-h)',
      left: 0,
      width: 'var(--sidebar-w)',
      bottom: 0,
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      <nav className="sidebar-nav" style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ── India / US Region Toggle ── */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4, gap: 4, border: '1px solid var(--border-subtle)' }}>
          {[{ id: 'IN', flag: '🇮🇳', label: 'India' }, { id: 'US', flag: '🇺🇸', label: 'US' }].map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRegion(r.id);
                setMarket(r.id === 'US' ? 'US_HC' : 'HC');
              }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 6px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700,
                background: region === r.id ? 'var(--accent-purple)' : 'transparent',
                color: region === r.id ? '#ffffff' : 'var(--text-dim)',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{r.flag}</span> {r.label}
            </button>
          ))}
        </div>
        {NAV_ITEMS.map(group => (
          <div key={group.group} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="sidebar-group-title" style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'var(--text-dim)',
              padding: '0 12px', marginBottom: 12,
            }}>
              {group.group}
            </div>
            <div className="sidebar-items-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {group.items.map(item => {
                const active = market === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="sidebar-item-btn"
                    onClick={() => {
                      setMarket(item.id);
                      if (item.id === 'MULTIBAGGER' && mbData.length === 0 && !mbLoading) {
                        loadMultibagger(false);
                      }
                    }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                      border: 'none',
                      background: active ? 'var(--accent-purple)' : 'transparent',
                      color: active ? '#ffffff' : 'var(--text-main)',
                      fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span className="sidebar-item-icon" style={{ fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                    <span className="sidebar-item-label" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="sidebar-item-badge" style={{
                        background: active ? 'rgba(255,255,255,0.25)' : (item.isNew ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.06)'),
                        color: active ? '#ffffff' : (item.isNew ? 'var(--accent-purple)' : 'var(--text-dim)'),
                        fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
