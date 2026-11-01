# PI-CORE v2 — Design notes (Figma vs implementation)

## Source

- Primary source, Figma file `18T2e8GH2l2zTzn7vkP1ax` (PMK-CORE): **not reachable in this build session** — no Figma
  MCP server was configured (the only configured MCP server, `9remote`, failed to connect). No `PMK-Core.pdf` was found.
- Used instead: the PNG exports of every frame in `../PMK-CORE/Design Figma dan color pallete/`, plus the exact token
  values v1 read from Figma through the MCP on 2026-10-15 (`../PMK-CORE/docs/DESIGN.md`). Colors were re-sampled from
  the exports and matched those values. Re-check spacing/typography against live Figma when MCP access is available.

## Tokens (`src/app/globals.css`)

Brown `#5A3E1B` · accent `#A15912` · gold drawer `#E6C65C` · gold check/label `#C9A227` · cream `#F8F7F6` · tint
`#EFE7DF` (= `rgba(161,89,18,.1)` on cream) · tint border `#DFCBB6` · ink `#0F172A` · body `#475569` · muted `#64748B`.
Fonts: Manrope (UI), Poppins (login title + LOGIN wordmark), Inter (login fields). Radius 12px for cards/rows/inputs,
pills fully rounded.

## Contrast (WCAG AA) — flagged, not changed

| Pair                                                      | Ratio  | Status                                                        |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| Gold "Active" text `#C9A227` on period row tint           | 1.98:1 | **Fails** (needs 4.5:1)                                       |
| Muted `#64748B` on tint (the design's stat/filter labels) | 3.89:1 | Fails for small text; implemented with body `#475569` (6.2:1) |
| Muted `#64748B` on cream (inactive nav labels)            | 4.45:1 | Just below 4.5:1                                              |
| Pill/input border `#DFCBB6` vs cream                      | 1.47:1 | Below 3:1 for UI boundaries                                   |
| White on brown button, ink on gold drawer, body on tint   | ≥ 6:1  | Pass                                                          |

The design colors are kept as specified. Suggested fixes for the owner/designer: a darker gold for text such as
`#7A6110` (≈ 5:1 on tint), `#556274` for muted text, and a 1px `#B9946B` border on inputs.
Where the design used muted text for important content (stat labels, row details) the implementation uses the
body color `#475569` (6.2:1) instead.

## Screen-by-screen differences

| Screen             | Difference                                                                             | Reason                                                                |
| ------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Login              | "Log in with Google" shown as plain text "— coming in a later version", not a link     | Google Sign-In is out of scope; a dead link would mislead             |
| Login              | Field labels are visually hidden but present                                           | Accessibility; placeholders alone are not labels                      |
| Dashboard          | No +5% / +2% / −1% deltas                                                              | No stored history to compute them from; not fabricated                |
| Dashboard          | Active Period shows the period label (e.g. 2026/2027) instead of "14 Mo"               | "14 Mo" has no defined source                                         |
| Dashboard          | Quick Access has Members, Roles, Settings — no Events                                  | Events is out of scope                                                |
| Dashboard (member) | Regular members see their own active-period assignments instead of stats               | No design for the member view; stats are admin data                   |
| Directory tabs     | Kept as designed: current tab slate, others ink                                        | Note: the current tab can read as "disabled"; consider an underline   |
| Members            | Rows stack name over "role · period" below 640px; columns from 640px                   | Real names and labels do not fit three columns at 390px               |
| Members            | Extra "Status" filter (Active / Deactivated) and a member count                        | Needed for deactivation (soft delete) and reactivation                |
| Members            | Delete icon = Deactivate (with confirmation)                                           | Soft deactivation keeps history (D-05)                                |
| Members            | Create/Edit Member screen designed from tokens                                         | No frame exists (frame `88:612` is empty)                             |
| Roles              | Caption explains what "Total Members" counts                                           | Count is for the active period (D-07)                                 |
| Role detail        | "← All roles" back link; Edit Role page also manages positions                         | Navigation and position management have no frame                      |
| Role detail        | Delete Role explains why it is blocked when assignments exist                          | Brief requires explicit handling                                      |
| Periods            | "Set Active" asks for confirmation                                                     | It changes dashboard and role counts globally                         |
| Assignments        | Position select has "New position…" which reveals a text field                         | Position is a lookup table (D-02)                                     |
| Assignments        | Rows stack on phones; period filter above the list                                     | Same as Members; list would otherwise mix all years                   |
| Settings           | Organization name is an editable field; logo is read-only                              | Logo upload needs storage; out of MVP                                 |
| Settings           | Each auth method has a one-line note                                                   | Makes "not enabled" explicit for Google                               |
| Drawer             | Integrations shown disabled with a "Soon" badge; Profile added                         | Integrations out of scope; Profile has no other entry from the drawer |
| Bell               | Opens "No notifications" popover                                                       | Least misleading treatment of an icon with no feature                 |
| Reports            | Removed from the navigation (2026-11 refresh)                                          | No Reports design or scope yet                                        |
| Desktop ≥1024px    | Drawer becomes a persistent gold sidebar; bottom nav hidden; content up to 1024px wide | No desktop frames; derived from the mobile drawer                     |
| Typos              | "Posiion", "Sekertaris", "Creat Period", "Connnected" are not reproduced               | Copy fixes                                                            |

## Missing design states (implemented from tokens)

Loading skeletons (`(app)/loading.tsx`), error with retry (`(app)/error.tsx`), empty states for every list, "Admins
only" forbidden state, 404, offline page, inline field errors and form-level error banners, success toasts,
confirmation dialogs (deactivate, reactivate, reset password, set active period, delete role, delete position, remove
assignment), blocked-delete dialogs, the one-time temporary password panel, the forced password change screen, and the
Profile screen.

Screenshots from the last run (390×844 and 1280×800) were compared by eye with the exported frames; no pixel diff was
run.
