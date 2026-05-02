import sys
sys.path.append('/app')
import main

ledger = main.load_ledger()
print("Ledger NSE_BUYS keys:", len(ledger.get('NSE_BUYS', {})))
print("Ledger HIGH_CONVICTION keys:", len(ledger.get('HIGH_CONVICTION', {})))

# Test the stats function
stats = main.compute_hc_historical_stats(ledger.get('HIGH_CONVICTION', {}))
print("Stats for HIGH_CONVICTION:", stats)

# Check the cache
print("GLOBAL_BUY_CACHE stats:", main.GLOBAL_BUY_CACHE.get('backtest_summary'))
print("HC_CACHE stats:", main.HC_CACHE.get('backtest_summary'))
