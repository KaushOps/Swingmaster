import json

with open('/home/ubuntu/swingmaster/backend/data/signals_ledger.json','r') as f:
    ledger = json.load(f)

# Check outcome_log too
import csv, os
outcome_file = '/home/ubuntu/swingmaster/backend/data/outcome_log.csv'
print('=== OUTCOME LOG (LIVE TRADES) ===')
if os.path.exists(outcome_file):
    with open(outcome_file, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    may_rows = [r for r in rows if r.get('date','').startswith('2025-05')]
    apr_rows = [r for r in rows if r.get('date','').startswith('2025-04')]
    print('May 2025 outcomes from outcome_log:')
    for r in may_rows:
        print('  {} | {} | {} | Entry:{} | Exit:{}'.format(
            r.get('date',''), r.get('symbol',''), r.get('outcome',''),
            r.get('entry_price',''), r.get('exit_price','')))
    print('April 2025 outcomes from outcome_log:')
    for r in apr_rows:
        print('  {} | {} | {} | Entry:{} | Exit:{}'.format(
            r.get('date',''), r.get('symbol',''), r.get('outcome',''),
            r.get('entry_price',''), r.get('exit_price','')))
else:
    print('outcome_log.csv not found')

print('\n=== MAY 2025 HC SIGNALS FROM LEDGER ===')
may_wins = 0
may_losses = 0
may_active = 0
for date_str in sorted(ledger.get('HIGH_CONVICTION',{}).keys()):
    if date_str.startswith('2025-05'):
        sigs = ledger['HIGH_CONVICTION'][date_str]
        for sym in sigs:
            s = sigs[sym]
            status = s.get('_closed_status', 'ACTIVE')
            entry = s['entry']
            target = s['target']
            sl = s['stoploss']
            if status == 'TARGET HIT':
                may_wins += 1
            elif status == 'SL HIT':
                may_losses += 1
            else:
                may_active += 1
            print('  {} | {:>12} | Entry:{:>8.2f} | SL:{:>8.2f} | TP:{:>8.2f} | {}'.format(
                date_str, sym, entry, sl, target, status))

print('\nMay Summary: Wins={}, Losses={}, Active={}'.format(may_wins, may_losses, may_active))
closed = may_wins + may_losses
if closed > 0:
    print('May Win Rate: {:.1f}%'.format(may_wins/closed*100))

print('\n=== APRIL 2025 HC SIGNALS FROM LEDGER ===')
apr_wins = 0
apr_losses = 0
apr_active = 0
for date_str in sorted(ledger.get('HIGH_CONVICTION',{}).keys()):
    if date_str.startswith('2025-04'):
        sigs = ledger['HIGH_CONVICTION'][date_str]
        for sym in sigs:
            s = sigs[sym]
            status = s.get('_closed_status', 'ACTIVE')
            if status == 'TARGET HIT': apr_wins += 1
            elif status == 'SL HIT': apr_losses += 1
            else: apr_active += 1

print('April Summary: Wins={}, Losses={}, Active={}'.format(apr_wins, apr_losses, apr_active))
apr_closed = apr_wins + apr_losses
if apr_closed > 0:
    print('April Win Rate: {:.1f}%'.format(apr_wins/apr_closed*100))

print('\n=== MARKET REGIME CHECK ===')
# Check what regime the bot detected
import glob
log_files = glob.glob('/home/ubuntu/swingmaster/backend/data/*.log')
print('Log files found:', log_files)
