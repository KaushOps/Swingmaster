import json, sys
d = json.load(open("/tmp/us.json"))
print("is_scanning:", d["is_scanning"])
print("signals:", len(d["data"]))
print("hist_days:", len(d["historical"]))
print("last_updated:", d["last_updated"])
if d["data"]:
    print("Top signals:", [s["symbol"] for s in d["data"][:5]])
