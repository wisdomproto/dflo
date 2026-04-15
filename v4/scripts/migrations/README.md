# SQL Migrations

이 디렉토리는 Supabase 프로젝트 초기 세팅 SQL 을 담고 있습니다.

## Fresh Supabase Setup

1. **Supabase Dashboard → SQL Editor** 에서 `000_initial_schema.sql` 전체 복붙 실행
2. 실행 후 검증 — Table Editor 에서 다음 테이블들이 모두 존재하는지 확인:
   - `users`, `children`
   - `visits`, `hospital_measurements`, `xray_readings`, `lab_tests`, `medications`, `prescriptions`
   - `daily_routines`, `meals`, `meal_photos`, `meal_analyses`, `exercise_logs`, `exercises`
   - `recipes`, `growth_guides`, `growth_cases`
3. **Storage → Buckets** 확인:
   - `content-images` (public)
   - `meal-photos` (public)
   - `xray-images` (private)

## Seed admin account

schema 실행 후:

```bash
cd v4
node scripts/create_admin.mjs
```

생성되는 계정: `admin@187growth.com` / `admin187!`

(또는 Supabase SQL Editor 에서 직접:)

```sql
INSERT INTO users (email, password, name, role)
VALUES ('admin@187growth.com', 'admin187!', '관리자', 'admin');
```

## Environment

`v4/.env.local` 에 새 Supabase URL + 키 설정:

```
VITE_SUPABASE_URL=https://<new-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<new-anon-key>
```

`ai-server/.env` 에도 동일하게 업데이트 (service role key 포함).

## Notes

- **auth**: 현재 legacy 방식 (users 테이블에 plaintext password). Supabase auth 로 전환은 follow-up.
- **RLS**: 초기 정책은 permissive (authenticated/anon read). parent_id = auth.uid() 조건으로 tighten 은 auth 전환 후.
- **content-images, meal-photos**: public 버킷 (read 누구나 가능).
- **xray-images**: PRIVATE — signed URL 만 read 가능, PHI 보호.
- **확장**: 새 마이그레이션은 `001_<name>.sql` 부터 번호 매겨서 추가.
