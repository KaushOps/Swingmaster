import json
import pandas as pd
from data_fetcher import fetch_daily_data
from main import build_signal_frozen

with open('data/signals_ledger.json', 'r') as f:
    ledger = json.load(f)

for date_str, sigs in ledger.get('NSE_BUYS', {}).items():
    if 'SUNPHARMA' in sigs and date_str.startswith('2026-03'):
        df = fetch_daily_data('SUNPHARMA.NS', years=2)
        res = build_signal_frozen(sigs['SUNPHARMA'], date_str, df, 'SUNPHARMA', df['close'].iloc[-1])
        status = res['status']
        print(f"{date_str} SUNPHARMA -> {status}")
