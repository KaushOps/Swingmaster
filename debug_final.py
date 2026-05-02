import os
import sys
sys.path.append('/app')
try:
    import main
    print(f"LEDGER_FILE: {main.LEDGER_FILE}")
    print(f"HC Historical Count: {len(main.HC_CACHE.get('historical', []))}")
    print(f"HC Backtest Summary: {main.HC_CACHE.get('backtest_summary', {})}")
    print(f"Is Scanning: {main.GLOBAL_BUY_CACHE.get('is_scanning')}")
except Exception as e:
    print(f"Error: {e}")
