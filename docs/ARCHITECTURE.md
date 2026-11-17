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

### D-11 Mahasiswa and dosen (2026-11-02, owner)

`members.member_type` is `student` (mahasiswa, identified by NIM) or `lecturer` (dosen, identified by NIP/NIDN,
8–20 digits). The pembina is a dosen. A check constraint ties the number to the type (no NIM for dosen, no NIP for
mahasiswa). Dosen can hold any access level, typically super admin, but **no positions**: the assignment trigger
rejects them (`member_lecturer`) and the assignment form does not list them. Super admin access never depends on a
position, so this costs the pembina nothing.

### D-12 Language: Indonesian by default, English on request (2026-11-03, owner)

- One switch (`LanguageSwitch`, on Profile, the desktop sidebar, sign-in and the forced password change) calls the
  Server Action `setLocale`, which stores `pi-lang` (`id` | `en`, one year, `SameSite=Lax`) for the device. No URL
  prefix: every screen is per-user and dynamic already (D-03), so locale routing would add nothing.
- Copy lives in `src/lib/i18n/en.ts` and `id.ts`; `en` defines the shape and TypeScript rejects a missing key.
  Server Components read it with `getI18n()`, Client Components with `useDict()`.
- Server Actions, validation and database errors still answer in English (tests and logs depend on it).
  `translateMessage` turns them into Indonesian where they are shown (form errors, banners, toasts).
- The static, precached `/offline` page carries both languages; a tiny inline script picks one from the cookie, so it
  works even when the app's JavaScript is not cached.
- The E2E suite sets the `pi-lang=en` cookie and reduced motion in `playwright.config.ts`, so its English locators and
  counts stay stable.

### D-13 Google sign-in for existing accounts only (2026-11-16, owner)

"Log in with Google" is a second way **into** an account a PI-CORE admin already created. It never creates accounts.

**PI-CORE runs the Google OpenID Connect flow itself** (not Supabase's Google provider), so Google's consent screen
names `core.pmkitera.web.id` instead of the Supabase project domain (owner choice; a Supabase custom domain is paid).

1. `/auth/google` creates state, nonce and a PKCE verifier, keeps them in a 10-minute httpOnly cookie scoped to
   `/auth/google`, and redirects to Google.
2. `/auth/google/callback` checks the state (CSRF), exchanges the code with the PKCE verifier and the client secret,
   and verifies the ID token with `jose`: Google's signing keys, issuer, audience = our client id, expiry, nonce, and
   `email_verified`.
3. The verified email must be an **active member with a login** (`members.email`, `user_id` set). Unknown Google
   accounts get "This Google account has no PI-CORE login"; a deactivated member gets the inactive message (Google
   proved they own the email, so this reveals nothing).
4. The Supabase session is minted server-side: the Auth admin API generates a one-time magic-link token (no email is
   sent) and the callback redeems it immediately with `verifyOtp`, which writes the usual session cookies. RLS, NEXUS
   and pmk-form see an ordinary Supabase session; Supabase's own Google provider stays **off** and sign-up stays closed.
5. A member still on a temporary password gets a **random password** and the forced change cleared (owner decision):
   Google proved who they are and the admin-known temporary password must stop working. Cookies are re-issued (D-09).

- Without `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` the button is hidden.
- `GOOGLE_OAUTH_DEV_ENDPOINTS` points the flow at a fake provider for local tests; ignored when `NODE_ENV=production`.
- Preview deployments cannot use Google unless their exact callback URL is registered in Google Cloud Console.
- Shared organisation Gmail accounts are not members and cannot sign in (owner chose personal accounts).
- Other apps offer Google through PI-CORE: D-14.
- Setup: `docs/OPERATIONS.md`, entry 2026-11-16.

### D-14 Google sign-in for other PMK apps (2026-11-17)

Each app keeps its own session cookies on its own domain; nothing is shared across `*.pmkitera.web.id`
(a parent-domain cookie would hand the session to every subdomain, including ones PI-CORE does not control).
Google is only ever talked to by PI-CORE, so there is one OAuth client and one redirect URI.

1. The app's `/auth/google` makes a random `handoff` value, keeps it in its own httpOnly cookie, and sends the browser
   to `core…/auth/google?app=<id>&handoff=<value>`. PI-CORE refuses unknown apps and malformed values before Google.
2. PI-CORE runs D-13 steps 1-3 unchanged (state, PKCE, ID token checks, active member with a login), and replaces a
   temporary password **before** minting the token (a password change voids outstanding tokens).
3. No PI-CORE session is made. PI-CORE generates the one-time magic-link token and redirects to the app's fixed
   finish URL with `handoff` and `token_hash` (or `handoff` and `error=notRegistered|inactive|failed`).
4. The app's finish route requires `handoff` to equal its cookie (stops login CSRF: someone else's token cannot be
   planted in a victim's browser), then redeems the token with `verifyOtp` on its own domain. The token works once.
5. The app still does its own authorisation (pmk-form: `form.admin_members` + active PI-CORE member).

- Allowed apps are a fixed list in `src/lib/google-handoff.ts` (`form` → `https://form.pmkitera.web.id/auth/google/finish`).
  Adding an app = one line there plus the two routes in the app (copy pmk-form's `app/auth/google/`).
- `GOOGLE_HANDOFF_DEV_APPS` replaces the list for local tests; ignored when `NODE_ENV=production`.

### D-15 "BPH" = all pengurus; the top group is the Kesekjenan (2026-11-17, owner)

At PMK ITERA **BPH means every pengurus** (Kesekjenan, department and bureau heads and secretaries, division heads,
staff). Ketua Umum, Sekretaris Jenderal, Sekretaris Umum 1/2 and Bendahara Umum 1/2 form the **Kesekjenan**.
Migration `20261117100000_kesekjenan_and_bph.sql`:

- The unit "BPH PMK ITERA" is renamed "Kesekjenan"; the unit type is labelled "Kesekjenan" in the UI.
- Role key `bph` (the six Kesekjenan positions) is renamed "Kesekjenan".
- New system role key `pengurus`, named **"BPH"**, on every position. New positions get it: the trigger for
  inserts outside the app, and the "New position" form ticks it by default (the form saves exactly the ticked
  roles). Untick it for a position that is not a pengurus, e.g. a department account. It grants nothing (no `grants_admin`, no NEXUS rule).
- **Technical keys are unchanged**: enum value `bph` and role key `bph` now mean "Kesekjenan". PMK-NEXUS uses both
  (access rules by role key, unit filters, SQL functions); renaming them would break NEXUS, and putting role key
  `bph` on every position would give every staff member the Kesekjenan's NEXUS permissions.

### D-16 App access from PI-CORE (2026-11-18, owner)

Other PMK apps do not keep their own admin lists; PI-CORE decides who gets which **app role**. Migration
`20261118100000_app_access.sql`, screens under **Integrations** (`/integrations`, `/integrations/<app>`).

- `apps` and `app_roles` are owned by migrations (first app: PMK ARK with `admin` and `pengurus`).
- `app_access_rules`: "app role X goes to <subject>". Subject = a **member** (any period), a **PI-CORE role**, a
  **position**, or an **org unit** (optionally with its child units). The last three match assignments in the
  **active period**, so access moves with the seats. Same shape as PMK-NEXUS `access_rules`; role rules use
  `roles.id` because custom roles have no key.
- Deactivated members and members on a temporary password match nothing.
- **Super admins** add, disable and delete rules; admins can read them and see who has access; members see
  nothing. Every change goes to `audit_log`.
- Apps call `public.my_app_roles('<app>')` with the signed-in user's PI-CORE session and get the caller's roles
  only (sorted, no duplicates). `public.app_access_holders('<app>')` lists holders for the Integrations page
  (admins only). Both evaluate rules through one function, `private.app_rules_for_member()`.
- Baseline (owner decision): ARK `pengurus` for Departemen CMIT and Departemen Pelayanan Khusus, divisions
  included. ARK `admin` is given to named members on the Integrations page.
- Second app (migration `20261118200000_app_lynk.sql`): **PI-LYNK** (`lynk`). `admin` = Departemen CMIT,
  `pengurus` = every department (divisions included); PI-LYNK keeps its own history of who did what.
- The app enforces the meaning of its roles (ARK: `admin` includes everything `pengurus` may do).
- ARK and PI-LYNK are in the Google handoff list (D-14) with `https://ark.pmkitera.web.id/auth/google/finish`
  and `https://s.pmkitera.web.id/auth/google/finish`.

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
- Reports, Events, notifications: not built (out of scope). Integrations: D-16 (app access). Google sign-in: D-13 (existing accounts only), D-14 (other apps).
