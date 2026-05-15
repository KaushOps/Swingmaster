import json

with open('/home/ubuntu/swingmaster/backend/data/signals_ledger.json','r') as f:
    ledger = json.load(f)

# ── Historical May performance across all years ──
print('=== HISTORICAL MAY PERFORMANCE (ALL YEARS) ===')
for year in ['2023','2024','2025']:
    wins = losses = active = 0
    for date_str in ledger.get('HIGH_CONVICTION',{}):
        if date_str.startswith(year + '-05'):
            for sym, s in ledger['HIGH_CONVICTION'][date_str].items():
                st = s.get('_closed_status', 'ACTIVE')
                if st == 'TARGET HIT': wins += 1
                elif st == 'SL HIT': losses += 1
                else: active += 1
    closed = wins + losses
    wr = wins/closed*100 if closed > 0 else 0
    print('  May {}: Wins={}, Losses={}, WR={:.1f}%'.format(year, wins, losses, wr))

# ── Historical early-May (first 2 weeks) performance ──
print('\n=== HISTORICAL EARLY-MAY (Days 1-15) ===')
for year in ['2023','2024','2025']:
    wins = losses = 0
    for date_str in ledger.get('HIGH_CONVICTION',{}):
        day = int(date_str[8:10])
        if date_str.startswith(year + '-05') and day <= 15:
            for sym, s in ledger['HIGH_CONVICTION'][date_str].items():
                st = s.get('_closed_status', 'ACTIVE')
                if st == 'TARGET HIT': wins += 1
                elif st == 'SL HIT': losses += 1
    closed = wins + losses
    wr = wins/closed*100 if closed > 0 else 0
    print('  May 1-15 {}: Wins={}, Losses={}, WR={:.1f}%'.format(year, wins, losses, wr))

# ── Regime distribution in May historically ──
print('\n=== CHOPPY REGIME - HOW LONG DOES IT LAST HISTORICALLY? ===')
import csv, os
outcome_file = '/home/ubuntu/swingmaster/backend/data/outcome_log.csv'
if os.path.exists(outcome_file):
    with open(outcome_file, 'r') as f:
        rows = list(csv.DictReader(f))
    choppy = [r for r in rows if r.get('regime','') == 'CHOPPY']
    trending = [r for r in rows if r.get('regime','') in ('TRENDING','BULL')]
    print('  Total CHOPPY trades in log: {}'.format(len(choppy)))
    print('  Total TRENDING trades in log: {}'.format(len(trending)))
    if choppy:
        choppy_win = sum(1 for r in choppy if r.get('outcome','') == '1')
        print('  CHOPPY win rate: {:.1f}%'.format(choppy_win/len(choppy)*100))

# ── Active trades current P&L snapshot ──
print('\n=== ACTIVE MAY 2026 TRADES — CURRENT STATUS ===')
total_potential_profit = 0
total_sl_risk = 0
count = 0
for date_str in sorted(ledger.get('HIGH_CONVICTION',{}).keys()):
    if date_str.startswith('2026-05'):
        for sym, s in ledger['HIGH_CONVICTION'][date_str].items():
            st = s.get('_closed_status', 'ACTIVE')
            if st == 'ACTIVE' or st == 'SYNCING':
                count += 1
                reward = s['target'] - s['entry']
                risk = s['entry'] - s['stoploss']
                rr = reward/risk if risk > 0 else 0
                total_potential_profit += reward
                total_sl_risk += risk
                print('  {} | {:>12} | Entry:{:>8.2f} | SL:{:>8.2f} | TP:{:>8.2f} | R:R={:.1f}x'.format(
                    date_str, sym, s['entry'], s['stoploss'], s['target'], rr))

print('\n  Total Active Positions: {}'.format(count))
print('  If ALL hit TP: +Rs {:.0f} (1 qty each)'.format(total_potential_profit))
print('  If ALL hit SL: -Rs {:.0f} (1 qty each)'.format(total_sl_risk))
print('  Losses so far (8 SL hits, avg ~20Rs risk each): ~Rs {:.0f}'.format(total_sl_risk/count*8 if count > 0 else 0))

# ── Can it recover? Expected value calculation ──
print('\n=== RECOVERY PROBABILITY ANALYSIS ===')
# Based on historical 58% win rate, what is probability all 29 active trades
# net positive after including the 8 existing losses
avg_reward = total_potential_profit / count if count > 0 else 0
avg_risk_hit = total_sl_risk / count if count > 0 else 0

# Simulate 10000 times
import random
random.seed(42)
simulations = 10000
positive_months = 0
for _ in range(simulations):
    # Start with -8 losses (already closed)
    month_pnl = -total_sl_risk/count * 8 if count > 0 else 0
    for i in range(count):
        if random.random() < 0.581:  # historical win rate
            month_pnl += avg_reward
        else:
            month_pnl -= avg_risk_hit
    if month_pnl > 0:
        positive_months += 1

print('  Win rate used: 58.1% (historical)')
print('  Active trades: {}'.format(count))
print('  Avg reward per trade (1 qty): Rs {:.2f}'.format(avg_reward))
print('  Avg risk per trade (1 qty): Rs {:.2f}'.format(avg_risk_hit))
print('  Probability month ends positive: {:.1f}%'.format(positive_months/simulations*100))
print('  Expected net P&L if win rate holds: Rs {:.0f}'.format(
    count * (0.581 * avg_reward - 0.419 * avg_risk_hit) - (total_sl_risk/count * 8 if count > 0 else 0)
))
