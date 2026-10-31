# PI-CORE v2 — Operations log

## Hosted Supabase project

PI-CORE v2 uses the Supabase project that v1 used (`jegddvztnjfvtbbyyutb`, region ap-southeast-1), at the owner's
request. No other PMK app references this project (checked 2026-11-01: PI-ARK, PI-LYNK, website, pmk-form, pemira).

### 2026-11-01 — v1 schema archived, v2 migrations applied

1. Backup of v1 (`public` + `drizzle` schemas, schema and data) taken with `pg_dump` 17.11 to the owner's machine:
   `~/Documents/pmk-core-v1-db-backup-2026-11-01.sql` (mode 600; contains personal data — keep it private).
2. In one transaction, every v1 table (22 in `public` + `drizzle.__drizzle_migrations`), the enums `member_status`,
   `org_unit_type`, `permission_scope` and the trigger functions `assignments_fill_from_position`,
   `audit_logs_append_only`, `system_grants_protect_last_super_admin` were moved to schema **`pmk_core_v1`**.
   Nothing was deleted. `anon`/`authenticated` have no access to that schema and it is not exposed by the Data API.
   Left in `public` on purpose: the `citext` extension and `rls_auto_enable` (shared/platform objects).
3. `supabase db push` applied `20261031165546_core_schema` and `20261031171704_members_select_requires_active`.
   The dev seed was **not** applied. Verified afterwards: RLS on all 7 tables, 0 `anon` grants in `public`.

Consequence: the v1 app (Cloudflare Workers staging) no longer finds its tables and stops working.

To restore v1 temporarily (only if v2 tables are moved out of the way first): `alter table pmk_core_v1.<t> set schema public`
for each table, or restore the dump into a separate database. To delete the archive for good once v1 is retired:
`drop schema pmk_core_v1 cascade;` (owner decision; the dump file remains the only copy afterwards).
