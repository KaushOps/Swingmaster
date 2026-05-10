import json, os, datetime
f = 'data/ticker_cache.json'
if os.path.exists(f):
    d = json.load(open(f))
    print('Cache time:', d.get('timestamp'))
    nifty = [t for t in d.get('data', []) if 'NIFTY' in t.get('sym','')]
    for t in nifty:
        print(t)
else:
    print('Cache file does not exist')
