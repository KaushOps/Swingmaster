import json, csv, os

with open('/home/ubuntu/swingmaster/backend/data/signals_ledger.json','r') as f:
    ledger = json.load(f)

print('=== MAY 2026 HC SIGNALS FROM LEDGER ===')
may_wins = 0
may_losses = 0
may_active = 0
for date_str in sorted(ledger.get('HIGH_CONVICTION',{}).keys()):
    if date_str.startswith('2026-05'):
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

print('\nMay 2026 Summary: Wins={}, Losses={}, Active={}'.format(may_wins, may_losses, may_active))
closed = may_wins + may_losses
if closed > 0:
    print('May 2026 Win Rate: {:.1f}%'.format(may_wins/closed*100))
else:
    print('No closed trades yet in May 2026')

# Also check April 2026
print('\n=== APRIL 2026 HC SIGNALS FROM LEDGER ===')
apr_wins = 0
apr_losses = 0
apr_active = 0
for date_str in sorted(ledger.get('HIGH_CONVICTION',{}).keys()):
    if date_str.startswith('2026-04'):
        sigs = ledger['HIGH_CONVICTION'][date_str]
        for sym in sigs:
            s = sigs[sym]
            status = s.get('_closed_status', 'ACTIVE')
            if status == 'TARGET HIT': apr_wins += 1
            elif status == 'SL HIT': apr_losses += 1
            else: apr_active += 1

print('April 2026 Summary: Wins={}, Losses={}, Active={}'.format(apr_wins, apr_losses, apr_active))
apr_closed = apr_wins + apr_losses
if apr_closed > 0:
    print('April 2026 Win Rate: {:.1f}%'.format(apr_wins/apr_closed*100))

# Check outcome_log for recent live data
outcome_file = '/home/ubuntu/swingmaster/backend/data/outcome_log.csv'
if os.path.exists(outcome_file):
    with open(outcome_file, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print('\n=== OUTCOME LOG - RECENT ENTRIES ===')
    print('Total entries in outcome_log: {}'.format(len(rows)))
    may26 = [r for r in rows if r.get('date','').startswith('2026-05')]
    apr26 = [r for r in rows if r.get('date','').startswith('2026-04')]
    print('May 2026 entries: {}'.format(len(may26)))
    print('April 2026 entries: {}'.format(len(apr26)))
    for r in may26:
        print('  {} | {:>12} | outcome={} | regime={}'.format(
            r.get('date',''), r.get('symbol',''), r.get('outcome',''), r.get('regime','')))
    if not may26:
        print('  (No May 2026 entries in outcome_log)')
    
    # Show last 20 entries regardless of month
    print('\n=== LAST 20 ENTRIES IN OUTCOME LOG ===')
    for r in rows[-20:]:
        print('  {} | {:>12} | outcome={} | regime={}'.format(
            r.get('date',''), r.get('symbol',''), r.get('outcome',''), r.get('regime','')))

# List all months that exist in the ledger
print('\n=== ALL MONTHS IN HC LEDGER ===')
months = set()
for date_str in ledger.get('HIGH_CONVICTION',{}).keys():
    months.add(date_str[:7])
for m in sorted(months):
    count = sum(len(ledger['HIGH_CONVICTION'][d]) for d in ledger['HIGH_CONVICTION'] if d.startswith(m))
    print('  {}: {} signals'.format(m, count))
