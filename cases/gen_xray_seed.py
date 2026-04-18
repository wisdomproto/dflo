# -*- coding: utf-8 -*-
"""For every visit that has a measured bone_age, generate an xray_readings
row whose atlas_match_younger/atlas_match_older point to the closest atlas
images (no actual X-ray photo). Output goes to v4/scripts/seeds/."""
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ATLAS = json.load(open(r"C:\projects\dflo_0.1\v4\public\atlas.json", encoding="utf-8"))[
    "entries"
]
PATIENTS = json.load(open("patients.json", encoding="utf-8"))


def gender_long(g):
    return "male" if g == "M" else "female"


def sorted_atlas(gender_short):
    return sorted(
        [e for e in ATLAS if e["gender"] == gender_short],
        key=lambda e: (e["age"], e.get("suffix") or ""),
    )


def match(gender_short, ba):
    pool = sorted_atlas(gender_short)
    # Largest age <= ba (younger)
    younger = next((e for e in reversed(pool) if e["age"] <= ba), None)
    # Smallest age >= ba (older)
    older = next((e for e in pool if e["age"] >= ba), None)
    # If younger == older (exact match), pick neighbor for the older slot
    if younger and older and younger is older:
        idx = pool.index(younger)
        if idx + 1 < len(pool):
            older = pool[idx + 1]
        elif idx - 1 >= 0:
            younger = pool[idx - 1]
    return younger, older


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


lines = []
lines.append("-- ============================================================")
lines.append("-- Seed: synthesize xray_readings for every visit with bone_age")
lines.append("-- (no actual X-ray image — atlas-matched references only)")
lines.append("-- Idempotent: deletes prior auto-seeded readings first.")
lines.append("-- ============================================================\n")

lines.append("DO $$")
lines.append("DECLARE")
lines.append("  v_parent_id uuid;")
lines.append("  v_child_id  uuid;")
lines.append("  v_visit_id  uuid;")
lines.append("BEGIN")
lines.append("  SELECT id INTO v_parent_id FROM users WHERE email = 'cases@187growth.com';")
lines.append("  IF v_parent_id IS NULL THEN")
lines.append("    RAISE EXCEPTION 'demo parent missing — run seed_treatment_cases.sql first';")
lines.append("  END IF;\n")

total = 0
for p in PATIENTS:
    rows = []
    for v in p["visits"]:
        ba = v.get("bone_age")
        if ba is None:
            continue
        y, o = match(p["gender"], ba)
        if not y or not o:
            continue
        rows.append((v["date"], ba, y["file"], o["file"]))
    if not rows:
        continue
    lines.append(f"  -- {p['name']} ({len(rows)} readings)")
    lines.append(
        f"  SELECT id INTO v_child_id FROM children WHERE parent_id = v_parent_id AND name = {q(p['name'])};"
    )
    lines.append(
        "  DELETE FROM xray_readings WHERE child_id = v_child_id AND image_path IS NULL;"
    )
    for date, ba, yf, of in rows:
        lines.append(
            f"  SELECT id INTO v_visit_id FROM visits WHERE child_id = v_child_id AND visit_date = {q(date)} LIMIT 1;"
        )
        lines.append("  IF v_visit_id IS NOT NULL THEN")
        lines.append(
            "    INSERT INTO xray_readings (visit_id, child_id, xray_date, bone_age_result, atlas_match_younger, atlas_match_older)"
        )
        lines.append(
            f"      VALUES (v_visit_id, v_child_id, {q(date)}, {ba}, {q(yf)}, {q(of)});"
        )
        lines.append("  END IF;")
        total += 1
    lines.append("")

lines.append("END $$;\n")
lines.append(f"SELECT '{total} xray_readings seeded' AS status;")

out = "\n".join(lines)
open(
    r"C:\projects\dflo_0.1\v4\scripts\seeds\seed_xray_atlas_matches.sql",
    "w",
    encoding="utf-8",
).write(out)
print(f"Wrote seed_xray_atlas_matches.sql with {total} rows")
