export default function TopNavigation({
  theme,
  toggleTheme,
  universeScanAt,
  searchBar,
}) {

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--topbar-h)',
      background: 'var(--bg-header)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
    }}>

      {/* Brand area (matches sidebar width conceptually) */}
      <div style={{ width: 'var(--sidebar-w)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.05))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
          boxShadow: '0 0 12px rgba(255,255,255,0.05)'
        }}>📡</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ color: 'var(--text-header)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
            SwingMaster
          </div>
          <div style={{ background: '#6366f1', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
            v3
          </div>
        </div>
      </div>

      {/* Search Slot */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '20px' }}>
        {searchBar}
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        
        {/* Updated Pill */}
        {universeScanAt && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '6px 12px', borderRadius: 99,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
              Updated {universeScanAt}
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-header)'
          }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Bell Icon */}
        <button style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
          width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fbbf24'
        }}>
          🔔
        </button>

      </div>
    </header>
  );
}
