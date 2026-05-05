export default function TopNavigation({
  theme,
  toggleTheme,
  universeScanAt,
  searchBar,
  onLogout,
}) {

  return (
    <header className="topnav-header">

      {/* Brand — shrinks to logo-only on mobile */}
      <div className="topnav-brand">
        <div className="topnav-logo-wrap">
          <img src="/logo.png" alt="TradeFlex" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="topnav-wordmark">
          <span style={{ color: 'var(--text-header)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
            Trade<span style={{ color: '#F37B03' }}>Flex</span>
          </span>
          <span className="topnav-version">v5</span>
        </div>
      </div>

      {/* Search — takes all remaining space */}
      <div className="topnav-search">
        {searchBar}
      </div>

      {/* Right actions */}
      <div className="topnav-actions">

        {/* Updated pill — full text on desktop, green dot on mobile */}
        {universeScanAt && (
          <>
            <div className="topnav-updated-pill">
              <div className="topnav-live-dot" />
              <span>Updated {universeScanAt}</span>
            </div>
            <div className="topnav-live-dot-mobile" title={`Updated ${universeScanAt}`} />
          </>
        )}

        {/* Theme toggle */}
        <button className="topnav-icon-btn" onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* Bell */}
        <button className="topnav-icon-btn topnav-bell">🔔</button>

        {/* Logout */}
        {onLogout && (
          <button className="topnav-icon-btn topnav-logout" onClick={onLogout} title="Sign Out"
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; }}>
            ⏻
          </button>
        )}
      </div>
    </header>
  );
}
