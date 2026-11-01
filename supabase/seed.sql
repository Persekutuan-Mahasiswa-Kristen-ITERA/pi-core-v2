-- Development seed — LOCAL ONLY. Periods only; no people.
-- The organization structure (units, positions, roles) is baseline data in the migrations.
-- Member accounts for local development are created by `pnpm seed:dev-users` (scripts/seed-dev-users.mjs),
-- which goes through the Auth admin API instead of writing auth.* tables by hand.

-- The insert trigger makes only the first period active, so insert the current one first.
insert into public.periods (label, starts_on, ends_on) values ('2026/2027', '2026-08-01', '2027-07-31');
insert into public.periods (label, starts_on, ends_on) values
  ('2025/2026', '2025-08-01', '2026-07-31'),
  ('2024/2025', '2024-08-01', '2025-07-31'),
  ('2023/2024', '2023-08-01', '2024-07-31'),
  ('2022/2023', '2022-08-01', '2023-07-31'),
  ('2021/2022', '2021-08-01', '2022-07-31');
