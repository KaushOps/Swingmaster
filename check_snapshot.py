import json, os

snap_file = "data/feature_snapshots.json"
pm_file = "data/postmortem_log.json"

if os.path.exists(snap_file):
    d = json.load(open(snap_file))
    keys = [k for k in d if "KOTAK" in k.upper()]
    print(f"Snapshot keys for KOTAK: {keys}")
    for k in keys:
        print(k, "->", d[k])
    print(f"Total snapshots: {len(d)}")
else:
    print("feature_snapshots.json does not exist")

if os.path.exists(pm_file):
    pm = json.load(open(pm_file))
    kotak = [p for p in pm if "KOTAK" in str(p.get("symbol","")).upper()]
    print(f"\nPost-mortems for KOTAK: {len(kotak)}")
    for p in kotak:
        print("  date:", p.get("date"), "outcome:", p.get("outcome"))
        print("  indicators:", p.get("indicators"))
        print("  postmortem:", p.get("postmortem","")[:200])
else:
    print("postmortem_log.json does not exist")
