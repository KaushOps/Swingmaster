import re

with open('/home/ubuntu/swingmaster/frontend/src/App.jsx', 'r') as f:
    content = f.read()

# Fix 1: Make allSignalsForStats respect the amountPerTrade filter
old = "  // Also deduplicate for win/loss counters\r\n  const allSignalsForStats = activeDataForStats\r\n    .slice()\r\n    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))\r\n    .flatMap(day => (day.signals || []));"

new = "  // Also deduplicate for win/loss counters \u2014 apply same price filter as monthly view\r\n  const allSignalsForStats = activeDataForStats\r\n    .slice()\r\n    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))\r\n    .flatMap(day => (day.signals || []).filter(s => {\r\n      if (!s.entry || s.entry <= 0) return false;\r\n      if (isNSE) return s.entry <= amountPerTrade;\r\n      return s.entry <= safeAlloc;\r\n    }));"

if old in content:
    content = content.replace(old, new)
    print('Fix 1 applied: allSignalsForStats now respects price filter')
else:
    # Try LF only
    old_lf = old.replace('\r\n', '\n')
    new_lf = new.replace('\r\n', '\n')
    if old_lf in content:
        content = content.replace(old_lf, new_lf)
        print('Fix 1 applied (LF): allSignalsForStats now respects price filter')
    else:
        print('ERROR Fix 1: Could not find target string')

# Fix 2: Make the "All Time" banner stats also use filtered data
old2 = "  const isMonth          = selectedMonth !== 'All';\r\n  const showWinRate      = isMonth ? dynWinRate          : (stats?.win_rate_pct || 0);\r\n  const showWins         = isMonth ? d_wins              : (stats?.target_hit || 0);\r\n  const showLoss         = isMonth ? d_loss              : (stats?.sl_hit || 0);\r\n  const showTotal        = isMonth ? d_total             : (stats?.total_signals || 0);\r\n  const showAvgDays      = isMonth ? dynAvgDays          : (stats?.avg_days_to_close || 0);\r\n  const showExpectancyR  = isMonth ? dynExpectancyR      : (stats?.expectancy_r || 0);\r\n  const showProfitFactor = isMonth ? dynProfitFactor     : (stats?.profit_factor_r ?? 0);"

new2 = "  const isMonth          = selectedMonth !== 'All';\r\n  // Always use dynamically computed stats (respects price filter + qty)\r\n  const showWinRate      = dynWinRate;\r\n  const showWins         = d_wins;\r\n  const showLoss         = d_loss;\r\n  const showTotal        = d_total;\r\n  const showAvgDays      = dynAvgDays;\r\n  const showExpectancyR  = dynExpectancyR;\r\n  const showProfitFactor = dynProfitFactor;"

if old2 in content:
    content = content.replace(old2, new2)
    print('Fix 2 applied: Banner stats now always use dynamic filtered data')
else:
    old2_lf = old2.replace('\r\n', '\n')
    new2_lf = new2.replace('\r\n', '\n')
    if old2_lf in content:
        content = content.replace(old2_lf, new2_lf)
        print('Fix 2 applied (LF): Banner stats now always use dynamic filtered data')
    else:
        print('ERROR Fix 2: Could not find banner stats target')

with open('/home/ubuntu/swingmaster/frontend/src/App.jsx', 'w') as f:
    f.write(content)

print('Done writing file')
