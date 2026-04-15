# SQL Migrations

Applied manually via Supabase Dashboard → SQL Editor, in numeric order.

## Order

1. `001_create_medications.sql`
2. `002_create_visits.sql`
3. `003_rename_measurements_add_visit.sql` — **irreversible-ish**: backfills dummy visits, renames table
4. `004_create_xray_readings.sql`
5. `005_create_lab_tests.sql`
6. `006_create_prescriptions.sql`
7. `007_rls_policies.sql`
8. `008_storage_xray_images.sql`

## Before 003

Back up the `measurements` table:
```sql
CREATE TABLE measurements_backup AS TABLE measurements;
```

## After 003

Verify:
```sql
SELECT COUNT(*) FROM hospital_measurements WHERE visit_id IS NULL; -- expect 0
SELECT COUNT(*) FROM hospital_measurements;                         -- expect = measurements_backup COUNT
SELECT COUNT(*) FROM visits WHERE chief_complaint = '(legacy migration)';
```

## Rollback (for 003)

```sql
-- Drop renamed table's dependents first in reverse order, then:
ALTER TABLE hospital_measurements RENAME TO measurements;
ALTER TABLE measurements DROP COLUMN visit_id;
-- Optionally: DELETE FROM visits WHERE chief_complaint = '(legacy migration)';
```
