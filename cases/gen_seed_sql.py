# -*- coding: utf-8 -*-
"""Turn patients.json into idempotent Supabase SQL seed."""
import json
import sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

patients = json.load(open("patients.json", encoding="utf-8"))


def q(v):
    """Quote a value for SQL, returning NULL for None."""
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("'", "''")
    return f"'{s}'"


def gender_map(g):
    return "male" if g == "M" else "female"


lines = []
lines.append("-- ============================================================")
lines.append("-- Seed: 7 treatment cases (from 치료 후기 케이스 xlsx)")
lines.append("-- Idempotent: drops existing children with these names first")
lines.append("-- ============================================================\n")

lines.append("DO $$")
lines.append("DECLARE")
lines.append("  v_parent_id uuid;")
lines.append("  v_child_id  uuid;")
lines.append("  v_visit_id  uuid;")
lines.append("BEGIN")
lines.append("  -- Demo parent that owns all case children")
lines.append("  SELECT id INTO v_parent_id FROM users WHERE email = 'cases@187growth.com';")
lines.append("  IF v_parent_id IS NULL THEN")
lines.append("    INSERT INTO users (email, name, role, password, is_active)")
lines.append("    VALUES ('cases@187growth.com', '치료 사례 보호자', 'parent', 'cases187!', true)")
lines.append("    RETURNING id INTO v_parent_id;")
lines.append("  END IF;\n")

for p in patients:
    name = p["name"]
    lines.append(f"  -- ── {name} ({p['gender']}, {p['birth_date']}, {len(p['visits'])} visits) ──")
    lines.append(
        f"  DELETE FROM children WHERE parent_id = v_parent_id AND name = {q(name)};"
    )
    lines.append("  INSERT INTO children (")
    lines.append(
        "    parent_id, name, gender, birth_date, father_height, mother_height, desired_height, is_active"
    )
    lines.append("  ) VALUES (")
    lines.append(
        f"    v_parent_id, {q(name)}, {q(gender_map(p['gender']))}, {q(p['birth_date'])}, "
        f"{q(p['father_height'])}, {q(p['mother_height'])}, {q(p['desired_height'])}, true"
    )
    lines.append("  ) RETURNING id INTO v_child_id;\n")

    for v in p["visits"]:
        memo_parts = [x for x in (v.get("memo1"), v.get("memo2")) if x]
        memo = "\n".join(memo_parts) if memo_parts else None
        lines.append("  INSERT INTO visits (child_id, visit_date, chief_complaint, notes)")
        lines.append(
            f"    VALUES (v_child_id, {q(v['date'])}, {q(p.get('category'))}, {q(memo)})"
        )
        lines.append("    RETURNING id INTO v_visit_id;")
        lines.append(
            "  INSERT INTO hospital_measurements (visit_id, child_id, measured_date, height, weight, bone_age, pah)"
        )
        lines.append(
            f"    VALUES (v_visit_id, v_child_id, {q(v['date'])}, {q(v.get('height'))}, "
            f"{q(v.get('weight'))}, {q(v.get('bone_age'))}, {q(v.get('pah'))});"
        )
    lines.append("")

lines.append("END $$;")
lines.append("")
lines.append("SELECT '7 cases imported' AS status;")

out = "\n".join(lines)
open("seed_patients.sql", "w", encoding="utf-8").write(out)
print(f"Wrote seed_patients.sql ({len(out)} bytes)")
