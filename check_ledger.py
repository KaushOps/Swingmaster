import json
f = open('/app/data/signals_ledger.json')
d = json.load(f)
hc = d.get('HIGH_CONVICTION', {})
nse = d.get('NSE_BUYS', {})
print('HC date entries:', len(hc))
print('NSE date entries:', len(nse))
if hc:
    sample_date = list(hc.keys())[0]
    print('Sample HC date:', sample_date, '->', list(hc[sample_date].keys())[:3])
