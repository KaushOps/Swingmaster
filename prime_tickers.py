import os, sys
sys.path.insert(0, '/app')

print("NSE cache exists:", os.path.exists("data/ticker_cache.json"))
print("US cache exists:", os.path.exists("data/us_ticker_cache.json"))

# Prime NSE tickers
try:
    from main import fetch_ticker_data, TICKER_FILE
    import json
    from datetime import datetime
    results = fetch_ticker_data()
    os.makedirs(os.path.dirname(TICKER_FILE), exist_ok=True)
    with open(TICKER_FILE, "w") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "data": results}, f)
    print("NSE tickers fetched:", len(results))
    for r in results[:3]:
        print(" ", r)
except Exception as e:
    print("NSE fetch error:", e)

# Prime US tickers
try:
    from main import fetch_us_ticker_data, US_TICKER_FILE
    import json
    from datetime import datetime
    us_results = fetch_us_ticker_data()
    with open(US_TICKER_FILE, "w") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "data": us_results}, f)
    print("US tickers fetched:", len(us_results))
    for r in us_results[:3]:
        print(" ", r)
except Exception as e:
    print("US fetch error:", e)
