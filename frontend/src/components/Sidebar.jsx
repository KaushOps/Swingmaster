const NAV_ITEMS = [
  {
    group: 'SCANNER',
    items: [
      { id: 'HC',            label: 'High Conviction',  icon: '🎯', badge: '4' },
      { id: 'NSE_BUYS',      label: 'All NSE Buys',     icon: '🚀', badge: '12' },
      { id: 'ACTIVE_SIGNALS',label: 'Active Signals',   icon: '📡' },
      { id: 'MULTIBAGGER',   label: 'Multibagger',      icon: '🏆', badge: 'New', isNew: true },
      { id: 'IN',            label: 'India Full Grid',  icon: '🇮🇳' },
      { id: 'US',            label: 'USA Full Grid',    icon: '🇺🇸' },
    ],
  },
  {
    group: 'TOOLS',
    items: [
      { id: 'ADAPTIVE',       label: 'Model Performance', icon: '📊' },
      { id: 'BUDGET',         label: 'My Watchlist',      icon: '⭐' },
      { id: 'PORTFOLIO',      label: 'Signal History',    icon: '📜' },
      { id: 'SETTINGS',       label: 'Settings',          icon: '⚙️' },
    ],
  },
];

export default function Sidebar({ market, setMarket, mbData, mbLoading, loadMultibagger }) {
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
