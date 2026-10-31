# PI-CORE v2

**PMK ITERA Centralized Organization & Role Engine** — members, organizational roles and positions, academic periods
and assignments for Persekutuan Mahasiswa Kristen ITERA. Installable PWA (iOS: Safari → Add to Home Screen; Android:
Chrome → Install app). PI-NEXUS will consume this data later; PI-LYNK, PI-INGRESS, PI-ARK and pmkitera.web.id are
separate apps and are not touched by this repo.

Docs: [Architecture & decisions](docs/ARCHITECTURE.md) · [Operations log](docs/OPERATIONS.md) · [Security & permission matrix](docs/SECURITY.md) ·
[PWA](docs/PWA.md) · [Design notes](docs/DESIGN-NOTES.md)

## Requirements

- Node 20+ (developed on Node 24), pnpm 10
- Docker (for the local Supabase stack)
- The Supabase CLI is a dev dependency (`pnpm exec supabase …`); no global install needed

## Local setup

```bash
pnpm install
pnpm db:start                 # local Supabase in Docker; applies migrations + supabase/seed.sql
pnpm exec supabase status -o env   # copy API_URL, PUBLISHABLE_KEY, SECRET_KEY, DB_URL into .env.local
cp .env.example .env.local    # then fill it in (see below)
SEED_PASSWORD='choose-one-123' pnpm seed:dev-users   # fake local accounts (admin@example.com, maria@…)
pnpm dev                      # http://localhost:3000
```

The service worker registers only in production builds (`pnpm build && pnpm start`).

### Environment variables

| Name                                   | Where            | Purpose                                                                                  |
| -------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | browser + server | Supabase project URL                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Publishable (anon) key — access limited by RLS                                           |
| `SUPABASE_SECRET_KEY`                  | **server only**  | Secret / service-role key. Auth admin operations only. Never prefix with `NEXT_PUBLIC_`. |
| `SUPABASE_DB_URL`                      | local tooling    | Integration tests only                                                                   |

`.env*` files are git-ignored; only `.env.example` is committed.

## Database

- Schema, constraints, RLS, triggers: `supabase/migrations/` (versioned; never change the database by hand in the
  dashboard).
- `supabase/seed.sql`: development roles, positions and periods (no people). Applied by `db:start` / `db:reset`
  locally only.
- After changing the schema: `pnpm exec supabase migration new <name>` **from an interactive terminal** (when stdin
  is not a TTY the CLI waits for SQL on stdin), write the SQL, `pnpm exec supabase migration up`, then `pnpm db:types`.

### Applying to a hosted Supabase project

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push          # applies supabase/migrations/* (not the seed)
```

Then in the Supabase dashboard → Authentication:

- **Sign In / Providers → Email**: keep **enabled** (this is the login method). "Confirm email" can stay as it is;
  admin-created users are created already confirmed.
- **Allow new users to sign up**: **off**. (Do not disable the Email provider to block sign-ups — that also blocks
  login. Locally this is `[auth] enable_signup = false` in `supabase/config.toml`.)
- **Passwords**: minimum length 8, require letters and digits.
- **URL Configuration**: Site URL = the production URL; add preview URLs to the redirect allow-list.

### Hosted keys for local use

`.env.hosted.local` (git-ignored) holds the hosted project's URL, publishable key and secret key. Fetch them with
`pnpm exec supabase projects api-keys --project-ref <ref> --reveal -o json` — **without `--reveal` the secret key comes
back masked** and the API answers `401 Invalid API key`. `pnpm dev:hosted` runs the dev server against the hosted
project instead of local Docker (careful: that is real data). It prints the Supabase host it uses; Next.js still lists
`.env.local` under "Environments", but variables loaded from `.env.hosted.local` take precedence.

## First admin (bootstrap)

Run once per environment, from a trusted machine, with that environment's URL and secret key:

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… \
  node scripts/bootstrap-admin.mjs --email you@example.org --name "Your Name"
# locally: pnpm bootstrap:admin --email you@example.org --name "Your Name"
```

It prints a temporary password **once**; log in and you are forced to choose your own. The script refuses to run if
an active admin already exists — further admins are created in the app (Members → Create Member → PI-CORE access:
Admin). No credentials are stored in the repo.

## Accounts

Public sign-up is disabled. Admins create members; PI-CORE shows a one-time temporary password to share privately,
and the member must change it at first login. Admins can issue a new temporary password from the member's page.
Deactivating a member blocks login and hides all data from them but keeps their history (see
[ARCHITECTURE D-04/D-05](docs/ARCHITECTURE.md#decisions)).

## Scripts

| Command                                   | What it does                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev` / `build` / `start`            | Next.js                                                                     |
| `pnpm typecheck`                          | Route type generation + `tsc --noEmit`                                      |
| `pnpm lint`                               | ESLint                                                                      |
| `pnpm format` / `format:check`            | Prettier                                                                    |
| `pnpm test`                               | Unit tests (Vitest)                                                         |
| `pnpm test:integration`                   | RLS/constraint/provisioning tests against **local** Supabase (`.env.local`) |
| `pnpm test:e2e`                           | Playwright against `next start` + local Supabase (see below)                |
| `pnpm db:start` / `db:reset` / `db:types` | Local Supabase                                                              |
| `pnpm seed:dev-users`                     | Fake local accounts (refuses non-local URLs)                                |
| `pnpm bootstrap:admin`                    | First admin                                                                 |

E2E: `pnpm build`, seed users with `SEED_PASSWORD`, then `E2E_PASSWORD="$SEED_PASSWORD" pnpm test:e2e`
(first time: `pnpm exec playwright install chromium`).

## Deployment (Vercel)

1. Create the hosted Supabase project, push migrations, configure Auth (above), bootstrap the first admin.
2. Import the GitHub repo in Vercel (framework: Next.js, install `pnpm install`, build `pnpm build`).
3. Set the three env vars for Production and Preview. `SUPABASE_SECRET_KEY` without any `NEXT_PUBLIC_` prefix.
4. Deploy a **preview** first and run the device checklist in [docs/PWA.md](docs/PWA.md). Production deploys need the
   owner's approval.

HTTPS is required for installation and for the service worker; Vercel provides it.

## Replacing the logo

Put a higher-resolution PNG (transparent, square-ish, ideally ≥1024px) somewhere and run
`python3 scripts/generate-icons.py <file>` (needs Pillow). It regenerates `public/icons/*`, `public/brand/pmk-logo.png`
and `src/app/favicon.ico`.
