import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
try:
    res = requests.get('https://129.159.226.235/api/scan', verify=False)
    data = res.json()
    for group in data.get('historical', []):
        for sig in group.get('signals', []):
            if sig['symbol'] == 'SUNPHARMA':
                print(f"{group['date']} SUNPHARMA -> {sig['status']}")
except Exception as e:
    print(e)
