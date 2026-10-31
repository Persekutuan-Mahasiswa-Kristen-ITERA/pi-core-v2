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
| Hosting    | Vercel (planned; not yet linked)                              | HTTPS-only                                           |

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

### D-01 System access vs organizational roles

- `members.access_level` (`admin` | `member`) is the **only** input to authorization (`private.is_admin()`).
- `roles` / `positions` / `assignments` describe the organization. No policy, function or app check reads a role name.
  Making someone "BPH" never makes them a PI-CORE admin, and an admin does not need any role.

### D-02 Role vs Position (working assumption, needs owner confirmation)

- **Role** = organizational category (BPH, Kepala Departemen, Sekretaris, Bendahara, Staff, Panitia).
- **Position** = the specific title inside a role for an assignment (Ketua Umum, Kepala Departemen Musik, …).
- Positions are a **lookup table** (`positions`, unique per role, case-insensitive), not free text, so "Ketua" /
  "ketua " / "Ketua Umum" do not drift apart and can be filtered and counted. Admins pick an existing position or type
  a new one in the assignment form (created on save); positions can be renamed or deleted (if unused) on the role's
  edit page.
- A composite foreign key `assignments(position_id, role_id) → positions(id, role_id)` makes the database reject a
  position that belongs to a different role.
- Position is **required** on every assignment (the prototype shows one on every row). A plain member of a role can
  use a position such as "Anggota".

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

Role cards and role detail count **distinct active members with an assignment in the active period** (view
`role_overview.active_member_count`). Role deletion is blocked while the role has assignments in **any** period
(`assignment_count`, plus `ON DELETE RESTRICT`).

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

`audit_log` gets one row per INSERT/UPDATE/DELETE on members, roles, positions, periods, assignments and
org_settings, written by a trigger with `auth.uid()` as actor (null for service-role/system writes) and the old/new
row as JSON. Only admins can read it; nobody can write it through the API. There is no UI for it yet (query it in
the Supabase dashboard).

## Known limitations

- No email delivery (temporary-password flow instead).
- Logo is a bundled asset (`public/brand/pmk-logo.png`); Settings edits only the organization name.
- Password change via the admin API does not revoke the member's other sessions.
- The member picker in the assignment form lists every active member in one native select; past a few hundred members it needs search-as-you-type.
- Reports, Events, Integrations, notifications, Google Sign-In: not built (out of scope).
