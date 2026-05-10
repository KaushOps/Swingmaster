import json
d = json.load(open("/tmp/api_response.json"))
print("market_bullish:", d.get("market_bullish"))
print("signals:", len(d.get("data", [])))
