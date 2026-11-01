# PI-CORE v2 — Architecture and decisions

PI-CORE (PMK ITERA Centralized Organization & Role Engine) holds organizational identity: members, organizational
roles and positions, academic periods, and who holds what in which period. PI-NEXUS will consume this data later.
PI-CORE does **not** do workflows, events, program coordination or executive monitoring.

v1 (`../PMK-CORE`) was a Cloudflare + Expo monorepo whose iOS app needed a paid Apple Developer account. v2 is a single
Next.js PWA installed from the browser. v1 is untouched.

## Stack

| Layer      | Choice                                                        | Notes                                                |
| ---------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| App        | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript  | `proxy.ts` (Next 16 rename of `middleware.ts`)       |
| UI         | Tailwind CSS 4, shadcn/ui (Radix base), lucide-react          | Tokens in `src/app/globals.css`                      |
| Auth + DB  | Supabase Auth (email/password) + Postgres 17, `@supabase/ssr` | Cookie sessions                                      |
| Validation | Zod 4                                                         | `src/lib/validation.ts`                              |
| Tests      | Vitest 5 (unit + integration), Playwright 1.64 (E2E)          | Integration/E2E run against local Supabase in Docker |
| Hosting    | Vercel (team PMK ITERA, CLI deploys; see OPERATIONS.md)       | HTTPS-only                                           |

No deviations from the preferred stack. Not added: an ORM (supabase-js + RLS is enough), Serwist/next-pwa (the
service worker is ~70 lines and hand-written so its caching rules are auditable), next-themes (light-only design).

## Request flow

```
Browser ──► proxy.ts ──► Server Component page ──► src/lib/queries.ts ──► Supabase (RLS as the user)
               │                 │
               │                 └─ Server Action ──► requireAdminAction() ──► Supabase (RLS as the user)
               │                                                   └─► service-role client (Auth admin API only)
               └─ refreshes session cookies; unauthenticated → /login?next=…
```

- **proxy.ts** refreshes the Supabase session and redirects visitors without a session. It is a coarse gate only.
- **Pages** call `requireMember()` / `requireAdminPage()` (`src/lib/auth.ts`). Layouts do not re-run on every
  navigation, so every admin page checks on its own.
- **Server Actions** call `requireAdminAction()`, parse `FormData` with Zod whitelists, and write with the
  **caller's** Supabase client, so RLS checks the write again and the audit trigger records the actor.
- **Service-role client** (`src/lib/supabase/admin.ts`, `import "server-only"`) is used only for the Auth admin API:
  create user, set password, ban/unban, and clearing `must_change_password` after a verified password change.

## Decisions

### D-01 Access levels (revised 2026-11-01, owner decision)

Three levels, computed by the database (`private.is_super_admin()`, `private.is_admin()`, exposed to the app as
`public.current_access()`):

| Level       | How someone gets it                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| super admin | `members.access_level = 'super_admin'`, set by another super admin (or the bootstrap script). Not tied to a period. Intended for the maintainer and the pembina.                                                                                                     |
| admin       | `access_level = 'admin'` set by a super admin, **or** an assignment in the **active period** whose position carries a role with `grants_admin` (PI-CORE v1 ADR-0002: Ketua Umum, Sekretaris Jenderal, Sekretaris Umum 1/2, every Kepala Departemen and Kepala Biro). |
| member      | everyone else                                                                                                                                                                                                                                                        |

- Admin through a position starts and ends with the active period; switching the active period changes who is an admin.
- Only super admins: organization structure (units, positions, roles, position → role mapping), access levels,
  editing / deactivating / resetting a super admin's account, organization settings.
- No policy or function reads a role **name**; `is_admin()` reads `roles.grants_admin`.
- The last active super admin cannot be demoted or deactivated (advisory-locked trigger). Position-derived admins
  come and go with periods, so the guard protects super admins only.
- Consequence to be aware of: an admin can assign someone (including themselves) a position that carries
  Organization Admin and so make them an admin for that period. They cannot reach super admin. Every assignment is
  in the audit log.

### D-02 Organization model from PI-CORE v1 (replaces the role/position working assumption)

The structure the owner defined for v1 (`../PMK-CORE/docs/ARCHITECTURE.md` §2–3) is used as-is:

- **Org units** (`org_units`): a tree. `organization` (PMK ITERA) → `bph` | `department` (7) | `bureau` (1);
  each department → `division`s (16). Type and parent are fixed after creation; the tree rule is enforced by
  `private.org_unit_check_parent()`. Units are deactivated (no new assignments) or deleted only when unused.
- **Positions**: a title for one unit **type** (Kepala Divisi exists in every division), with a `rank` (lower =
  more senior) and `is_unique_per_unit` (one holder per unit per period: Ketua Umum, Kepala Divisi, ...). Staff is
  two positions (division and bureau), as in v1.
- **Roles**: bundles of capabilities. Today the only capability is `grants_admin`. System roles (from v1) cannot be
  deleted; super admins can add custom roles. v1's `super_admin` role is the `super_admin` access level here;
  `anggota` is implicit; `panitia` is not seeded (v1 deferred it with Events).
- **position_roles**: the roles a position carries (v1 `position_roles`, same 21 rows).
- **Assignments**: member × unit × position × period. The database copies `unit_type` and `is_unique_per_unit` from
  the position (trigger) and uses composite foreign keys so a position can only be used in its kind of unit; a
  partial unique index enforces one holder for unique positions.
- The baseline structure is inserted by migration `20261101100100_org_structure.sql`, so every environment has it.
- Not taken from v1: the 23-permission catalog with O/U/S scopes and the rank guard. Admin rights are all-or-nothing
  per D-01; the role table can grow more capability columns if finer rights are needed later.

### D-03 Rendering and caching

`cacheComponents` (enabled by `create-next-app`) is turned **off**. Every screen except Login/Offline depends on the
user and their permissions, so a prerendered shell gains little and `use cache` would add a way to leak data between
users. All authenticated routes render dynamically; nothing user-specific is cached on the server or in the service
worker.

### D-04 Account provisioning: temporary password

There is no SMTP provider configured (Supabase's built-in mailer is for testing only: it sends just to project team
members and is rate-limited to a few emails per hour). Invite emails are therefore not usable. Instead:

1. Admin fills in Create Member → server creates the Auth user with a random 14-character temporary password
   (`email_confirm: true`) and inserts the member row with `must_change_password = true`.
2. The password is shown **once** to the admin, who shares it privately. It is not stored or logged.
3. At first login the member is forced to `/change-password` (pages redirect; Server Actions refuse) until they set
   their own password. The current/temporary password is re-verified on every change.
4. Admins can issue a new temporary password ("Reset password") for a member who forgot theirs.

When an SMTP provider is added later, swap step 1–2 for `auth.admin.inviteUserByEmail` and a set-password page.

### D-05 Members are deactivated, not deleted

The prototype's delete icon on Members = **Deactivate**: `is_active = false`, the Auth user is banned, and RLS shows a
deactivated account nothing even while an old access token is still valid. Assignment history stays. Admins can
reactivate. There is no hard-delete path through the API (no DELETE grant or policy on `members`).

### D-06 Periods: one active, switched atomically

- Partial unique index `periods_single_active` allows at most one `is_active = true` row.
- `is_active` is not writable by clients (column privileges). It changes only through `set_active_period(id)`, a
  `SECURITY DEFINER` function that checks `is_admin()` and runs both updates in one transaction.
- The first period ever created becomes active automatically, so "exactly one" holds as soon as any period exists.
- Periods cannot be deleted in this version.

### D-07 Role member counts

Role cards and role detail count **distinct active members whose position carries the role in the active period**
(view `role_overview.active_member_count`). Deleting a custom role only removes its position mapping; assignments
are untouched. Positions and units with assignments in any period cannot be deleted (`ON DELETE RESTRICT`).

### D-08 Regular members do not browse the directory

Default from the brief, kept: a regular member sees their own profile and assignments (Dashboard + Profile), the
active period label, and the organization name. Directory, Assignments and Settings are admin-only (UI shows an
"Admins only" state; RLS returns no rows). If PMK wants members to browse each other, add a read policy and a
read-only directory — that is a deliberate privacy decision for the owner.

### D-09 Login runs in the browser

`signInWithPassword` is called from the browser client, then a Server Action re-issues the auth cookies from the server.

- Browser sign-in keeps Supabase Auth's rate limit **per member IP** (30 sign-ins / 5 min / IP). A server-side login would
  send every member through Vercel's few egress IPs and could lock everyone out during a busy meeting.
- Re-issuing the cookies server-side avoids Safari ITP's 7-day cap on `document.cookie` cookies, which would
  otherwise log out installed iOS apps after a week of not opening them (see `docs/PWA.md`).

## Audit log

`audit_log` gets one row per INSERT/UPDATE/DELETE on members, org_units, roles, positions, position_roles, periods,
assignments and org_settings, written by a trigger with `auth.uid()` as actor (null for service-role/system writes) and the old/new
row as JSON. Only admins can read it; nobody can write it through the API. There is no UI for it yet (query it in
the Supabase dashboard).

## Known limitations

- No email delivery (temporary-password flow instead).
- Logo is a bundled asset (`public/brand/pmk-logo.png`); Settings edits only the organization name.
- Password change via the admin API does not revoke the member's other sessions.
- The member picker in the assignment form lists every active member in one native select; past a few hundred members it needs search-as-you-type.
- Reports, Events, Integrations, notifications, Google Sign-In: not built (out of scope).
