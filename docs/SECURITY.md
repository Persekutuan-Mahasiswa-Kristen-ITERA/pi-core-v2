# PI-CORE v2 — Security model

## Permission matrix

| Capability                                      | Anonymous | Member (active) | Admin (active) | Deactivated |
| ----------------------------------------------- | :-------: | :-------------: | :------------: | :---------: |
| Log in                                          |     –     |       yes       |      yes       |  no (ban)   |
| Sign up                                         |    no     |       no        |       no       |     no      |
| Read own profile + own assignments              |     –     |       yes       |      yes       |     no      |
| Read active period label, organization name     |    no     |       yes       |      yes       |     no      |
| Change own password                             |     –     |       yes       |      yes       |     no      |
| Read other members / all assignments            |    no     |       no        |      yes       |     no      |
| Create / edit / deactivate / reactivate members |    no     |       no        |      yes       |     no      |
| Issue a temporary password for a member         |    no     |       no        | yes (not self) |     no      |
| Change a member's PI-CORE access (admin/member) |    no     |       no        | yes (not self) |     no      |
| Create / edit / delete roles and positions      |    no     |       no        |      yes       |     no      |
| Create / edit periods, set active period        |    no     |       no        |      yes       |     no      |
| Create / edit / remove assignments              |    no     |       no        |      yes       |     no      |
| Edit organization name                          |    no     |       no        |      yes       |     no      |
| Read audit log                                  |    no     |       no        |      yes       |     no      |

A member whose `must_change_password` is true can only reach `/change-password` and log out.

## Where each rule is enforced

| Layer             | What it does                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Postgres grants   | `anon` has no privileges on any table. `authenticated` gets only the columns it may write (e.g. no `is_active` on periods, no `created_by` anywhere).              |
| RLS (every table) | Policies in `supabase/migrations/*`. Admin = `private.is_admin()`; own data = `private.current_member_id()`, both require an **active** member.                    |
| Triggers          | Stamp `created_*/updated_*`, audit log, last-admin guard, no assignments for inactive members, first period auto-active.                                           |
| Constraints       | Unique email/NIM, unique role name (case-insensitive), unique position per role, one active period, assignment uniqueness, position belongs to role, label format. |
| Server Actions    | `requireAdminAction()`, Zod whitelist parsing, self-protection (cannot demote/deactivate/reset self).                                                              |
| Pages             | `requireMember()` / `requireAdminPage()`; non-admins get the "Admins only" state.                                                                                  |
| proxy.ts          | Session refresh + redirect to `/login` (coarse).                                                                                                                   |

UI hiding is never the only check: every admin rule above exists in RLS and is covered by `tests/integration`.

## RLS policies (summary)

| Table         | SELECT                                                | INSERT / UPDATE / DELETE                                                   |
| ------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| members       | admin, or own row while active                        | admin (no DELETE at all)                                                   |
| assignments   | admin, or own                                         | admin                                                                      |
| roles         | admin, or roles on own assignments                    | admin                                                                      |
| positions     | admin, or positions on own assignments                | admin                                                                      |
| periods       | admin, active period (any active member), own periods | admin insert/update; no DELETE; `is_active` only via `set_active_period()` |
| org_settings  | any active member                                     | admin update                                                               |
| audit_log     | admin                                                 | none (trigger only)                                                        |
| role_overview | view with `security_invoker`, inherits the above      | –                                                                          |

Privilege-escalation review: members cannot update their own row (no policy), so `access_level`,
`is_active` and `must_change_password` are out of reach; `is_admin()` reads only `access_level` + `is_active`;
`SECURITY DEFINER` functions use `search_path = ''` and live in the non-exposed `private` schema except
`set_active_period`, which checks `is_admin()` first; the last active admin cannot be demoted or deactivated
(advisory-locked trigger).

## Web risks

| Risk                          | Mitigation                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Injection                     | supabase-js / PostgREST (parameterized). Search text is stripped of PostgREST filter syntax and LIKE wildcards (`src/lib/search.ts`).                                                                                                                             |
| XSS                           | React escaping; no `dangerouslySetInnerHTML`. Security headers in `next.config.ts`.                                                                                                                                                                               |
| CSRF                          | All mutations are Server Actions (POST + Next.js Origin/Host check). No mutating GET routes; logout is a Server Action. Cookies are `SameSite=Lax`.                                                                                                               |
| IDOR                          | Ids from the client are UUID-validated and every query runs under the caller's RLS.                                                                                                                                                                               |
| Mass assignment               | Zod schemas whitelist fields; column-level grants block the rest at the database.                                                                                                                                                                                 |
| Open redirect                 | `?next=` passes through `safeRedirectPath()` (same-origin path only); tested.                                                                                                                                                                                     |
| Account enumeration           | One login error message for unknown email, wrong password and deactivated account.                                                                                                                                                                                |
| Brute force                   | Supabase Auth rate limit, per client IP because sign-in runs in the browser (30 / 5 min / IP by default). No CAPTCHA (gap; Supabase supports Turnstile/hCaptcha if needed). Password re-verification on change runs server-side and shares the server IP's limit. |
| Secrets                       | Service-role key only in `SUPABASE_SECRET_KEY` (server env), imported only from `server-only` modules. `.env*` git-ignored; `.env.example` has names only.                                                                                                        |
| Stale authorization in caches | No server data cache; the service worker never caches pages, RSC payloads or API responses.                                                                                                                                                                       |

## Secrets checklist

- `SUPABASE_SECRET_KEY`: Vercel env var (Production + Preview), never `NEXT_PUBLIC_`.
- Rotate it in Supabase (API keys) if it is ever exposed; nothing else needs to change.
- The bootstrap script prints the first admin's temporary password once to the operator's terminal only.
