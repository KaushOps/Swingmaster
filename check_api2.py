import requests
import urllib3
urllib3.disable_warnings()

try:
    res = requests.get('https://129.159.226.235/api/scan_universe_buys', verify=False, headers={'Host': 'omniquant.site'})
    data = res.json()
    for group in data.get('historical', []):
        for sig in group.get('signals', []):
            if sig['symbol'] == 'SUNPHARMA':
                print(f"{group['date']} SUNPHARMA -> {sig['status']}")
except Exception as e:
    print(e)
