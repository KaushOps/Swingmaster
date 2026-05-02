import os
import sys
sys.path.append('/app')
try:
    import main
    print(f"LEDGER_FILE: {main.LEDGER_FILE}")
    print(f"Exists: {os.path.exists(main.LEDGER_FILE)}")
    print(f"HC Historical Count: {len(main.HC_CACHE.get('historical', []))}")
    print(f"NSE Historical Count: {len(main.GLOBAL_BUY_CACHE.get('historical', []))}")
    print(f"Is Scanning: {main.GLOBAL_BUY_CACHE.get('is_scanning')}")
except Exception as e:
    print(f"Error: {e}")
