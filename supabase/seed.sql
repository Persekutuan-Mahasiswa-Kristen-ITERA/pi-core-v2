-- Development seed — LOCAL ONLY. Organizational structure only; no people.
-- Member accounts for local development are created by `pnpm seed:dev-users` (scripts/seed-dev-users.mjs),
-- which goes through the Auth admin API instead of writing auth.* tables by hand.

insert into public.roles (name, description, sort_order) values
  ('BPH', 'Badan Pengurus Harian', 10),
  ('Kepala Departemen', 'Kepala departemen pelayanan', 20),
  ('Sekretaris', 'Kesekretariatan', 30),
  ('Bendahara', 'Keuangan', 40),
  ('Staff', 'Staff departemen', 50),
  ('Panitia', 'Kepanitiaan kegiatan', 60);

insert into public.positions (role_id, name)
select r.id, p.name
from public.roles r
join (values
  ('BPH', 'Ketua Umum'),
  ('BPH', 'Wakil Ketua Umum'),
  ('Kepala Departemen', 'Kepala Departemen Musik'),
  ('Kepala Departemen', 'Kepala Departemen Doa'),
  ('Sekretaris', 'Sekretaris Umum'),
  ('Bendahara', 'Bendahara Umum'),
  ('Staff', 'Staff Departemen Musik'),
  ('Staff', 'Staff Departemen Doa'),
  ('Panitia', 'Ketua Panitia Natal')
) as p(role_name, name) on p.role_name = r.name;

-- The insert trigger makes only the first period active, so insert the current one first.
insert into public.periods (label, starts_on, ends_on) values ('2026/2027', '2026-08-01', '2027-07-31');
insert into public.periods (label, starts_on, ends_on) values
  ('2025/2026', '2025-08-01', '2026-07-31'),
  ('2024/2025', '2024-08-01', '2025-07-31'),
  ('2023/2024', '2023-08-01', '2024-07-31'),
  ('2022/2023', '2022-08-01', '2023-07-31'),
  ('2021/2022', '2021-08-01', '2022-07-31');
