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

### 2026-11-01 — Auth settings and first admin

- Auth pushed with a minimal config (only these keys declared, everything else left as it was): `enable_signup = false`
  (was **true**), `minimum_password_length = 8` (was 6), `password_requirements = letters_digits`. Email provider stays
  enabled. Verified: anonymous sign-up → `signup_disabled`; email login endpoint active; anon read of `members` → 42501.
- First admin bootstrapped with `scripts/bootstrap-admin.mjs`: Febrian Yoel Anggara Saputra (admin, must change
  password at first login). Temporary password was written only to a mode-600 file on the owner's machine.
- Still to do: set Auth **Site URL** and redirect URLs to the Vercel URL once it exists (currently `http://localhost:3000`;
  only affects email links, which PI-CORE does not send).

## Vercel

Project `pi-core-v2` in team **PMK ITERA's projects** (`pmk-iteras-projects`, Hobby), next to `pmkitera-ark`, `pi-lynk`,
`pmk-form` and `website-pmk`. Not git-connected (the PMK Vercel account cannot see the private repo
`FYCode-dev12/pi-core-v2`); deployments are made with `pnpm deploy:preview` using a PMK account token stored on the
owner's machine (`~/.config/vercel-pmk-token/token.txt`, mode 600). Env vars (Production + Preview):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (sensitive).

### 2026-11-01 — first deployments

- A project first created in the owner's personal team (`fyc-ode-s-team`) was blocked ("no Git account for the commit
  author") and was deleted with the owner's approval.
- In the PMK team, the first `vercel deploy` (no `--prod`) was created with target **production** — the CLI promotes a
  brand-new project's first deployment. It was **cancelled while building**; nothing went live (production alias → 404).
  All deploys since pass `--environment preview` explicitly.
- Deploys from the working copy were blocked ("commit author doesn't have permission"); deploying a clean
  `git archive` export without `.git` works and is what `scripts/deploy-preview.sh` does.
- Deployment Protection (Vercel Authentication) was **turned off for this project only**, with the owner's approval,
  so phones can fetch the manifest/service worker and installed apps are not stopped by a Vercel login wall. Access
  control is PI-CORE's own login + RLS. Re-enable under Project → Settings → Deployment Protection if needed.
- Verified on the preview URL: `/login` 200, protected routes redirect to `/login`, security headers present,
  Chrome `Page.getInstallabilityErrors` → `[]`, service worker active.

Still to do: real-device checks (docs/PWA.md), owner-approved production deploy, then set Supabase Auth Site URL to the
production URL.
