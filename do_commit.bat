@echo off
git add -A
git commit -m "feat(v6.3.1): NSE fundamental engine - same scoring model as US, separate ledger, .NS suffix auto-handled. GTLB/SMCI/TTD/RBLX now qualify via high-growth bonus. Removed top-20 display cap."
git push origin feature/hc-signal-tuning
echo Done.
