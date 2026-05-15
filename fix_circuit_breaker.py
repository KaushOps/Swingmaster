#!/usr/bin/env python3
"""Disable circuit breaker HALT in TradeFlex scans.
Changes the circuit breaker from stopping scans to just logging a warning.
Scans will continue regardless of win rate for month-end data collection."""

MAIN_PY = '/home/ubuntu/swingmaster/backend/main.py'

with open(MAIN_PY, 'r') as f:
    content = f.read()

changes = 0

# Fix 1: update_universe_cache() - NSE scan circuit breaker
old1 = '    # Circuit Breaker Check\n    if PerformanceMonitor.check_circuit_breaker():\n        print("CIRCUIT BREAKER TRIGGERED: Win rate < 40% or Kill Switch Active. Halting scans.")\n        return'
new1 = '    # Circuit Breaker Check (LOG ONLY - scans continue for data collection)\n    if PerformanceMonitor.check_circuit_breaker():\n        print("CIRCUIT BREAKER WARNING: Win rate < 40% - scan continues for data collection.")'

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("Fix 1 applied: update_universe_cache() circuit breaker -> warning only")
else:
    print("Fix 1 SKIPPED: pattern not found in update_universe_cache()")

# Fix 2: /api/scan endpoint circuit breaker
old2 = '    if PerformanceMonitor.check_circuit_breaker():\n        return {"status": "error", "message": "Circuit Breaker Active - Scanning halted."}'
new2 = '    if PerformanceMonitor.check_circuit_breaker():\n        print("CIRCUIT BREAKER WARNING: Win rate low - /api/scan continues for data collection.")'

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("Fix 2 applied: /api/scan endpoint circuit breaker -> warning only")
else:
    print("Fix 2 SKIPPED: pattern not found in /api/scan endpoint")

if changes > 0:
    with open(MAIN_PY, 'w') as f:
        f.write(content)
    print(f"\nDone! Applied {changes} fix(es) to {MAIN_PY}")
else:
    print("\nNo changes made - patterns not found.")
