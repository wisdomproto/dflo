"""Compare parsed output to hand-curated ground truth for chart 22028.

For each report (matched by accession or by date), compare the set of
(code, value, flag) triples. Reports a concise accuracy summary.
"""
import json
from pathlib import Path

GT = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr/_gt/22028.json")
OUT = Path(r"C:/projects/dflo_0.1/cases/랩데이터_ocr/22028.json")

gt = json.loads(GT.read_text(encoding="utf-8"))
out = json.loads(OUT.read_text(encoding="utf-8"))


def index_reports(data):
    idx = {}
    for r in data["reports"]:
        key = r.get("accession") or r.get("collected_at") or r.get("file")
        # Normalize collected_at to date-only for matching
        key = (key or "").split(" ")[0]
        idx.setdefault(key, []).append(r)
    return idx


def norm_name(s: str) -> str:
    """Canonical form for row-name comparison.
    - collapse whitespace
    - treat apostrophe and forward-slash as equivalent (OCR reads `'` as `/`)
    - lowercase
    """
    import re as _re
    s = _re.sub(r"\s+", "", s)
    s = s.replace("'", "/")
    return s.lower()


gt_idx = index_reports(gt)
out_idx = index_reports(out)

all_keys = sorted(set(gt_idx) | set(out_idx))

total_gt = 0
total_hit = 0
total_miss = 0
total_value_wrong = 0
total_flag_wrong = 0
total_extra = 0

print(f"Ground truth reports: {sum(len(v) for v in gt_idx.values())}")
print(f"Parsed reports:       {sum(len(v) for v in out_idx.values())}")
print()

for key in all_keys:
    gt_rs = gt_idx.get(key, [])
    out_rs = out_idx.get(key, [])
    if not gt_rs:
        print(f"  [extra]  {key} (parsed but no GT)")
        for r in out_rs:
            total_extra += len(r.get("results", []))
        continue
    if not out_rs:
        print(f"  [miss]   {key} (GT report has no parsed match)")
        for r in gt_rs:
            total_gt += len(r.get("results", []))
            total_miss += len(r.get("results", []))
        continue

    # Flatten to sets keyed by normalized name to survive OCR/format drift.
    gt_rows = {norm_name(r2["name"]): r2 for r in gt_rs for r2 in r.get("results", [])}
    out_rows = {norm_name(r2["name"]): r2 for r in out_rs for r2 in r.get("results", [])}

    for name, gt_row in gt_rows.items():
        total_gt += 1
        parsed = out_rows.get(name)
        if not parsed:
            # fuzzy: try partial name match (still on normalized keys)
            for pn in out_rows:
                if name in pn or pn in name:
                    parsed = out_rows[pn]
                    break
        if not parsed:
            total_miss += 1
            print(f"  [miss]   {key} | {name} (value={gt_row.get('value')}, flag={gt_row.get('flag')})")
            continue
        total_hit += 1
        # Value check
        gv, pv = gt_row.get("value"), parsed.get("value")
        if isinstance(gv, (int, float)) and isinstance(pv, (int, float)):
            if abs(float(gv) - float(pv)) > 0.01:
                total_value_wrong += 1
                print(f"  [val!=]  {key} | {name}: gt={gv} parsed={pv}")
        elif gv != pv:
            if not (gv is None and pv is None):
                total_value_wrong += 1
                print(f"  [val!=]  {key} | {name}: gt={gv!r} parsed={pv!r}")
        # Flag check
        gf, pf = gt_row.get("flag"), parsed.get("flag")
        if gf != pf:
            total_flag_wrong += 1
            print(f"  [flag!=] {key} | {name}: gt={gf} parsed={pf}")

print()
print(f"Total GT rows: {total_gt}")
print(f"  matched:     {total_hit}  ({total_hit/total_gt*100 if total_gt else 0:.1f}%)")
print(f"  missed:      {total_miss}")
print(f"  value wrong: {total_value_wrong}")
print(f"  flag wrong:  {total_flag_wrong}")
print(f"  extras:      {total_extra}")
