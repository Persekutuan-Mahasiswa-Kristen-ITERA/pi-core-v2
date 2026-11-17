-- The PMK ITERA website admin (www.pmkitera.web.id) reads its access from PI-CORE (D-16).
-- Owner decision 2026-11-18, per menu; editors manage every item in their menu, the website keeps
-- a history of who changed what (visible to Admin Website). All rules are editable on the
-- Integrations page.
--   admin        Admin Website       every menu + history       Departemen CMIT
--   renungan     Editor Renungan     devotionals                Departemen Pembinaan Rohani
--   acara        Editor Acara        events                     Departemen Internal, Departemen Eksternal
--   artikel      Editor Artikel      articles                   Departemen Eksternal, Departemen Pembinaan Rohani
--   dokumentasi  Editor Dokumentasi  documentation              (no rule yet: CMIT has it through admin)

insert into public.apps (key, name, description, url, sort_order) values
  ('web', 'Website PMK ITERA', 'Admin website www.pmkitera.web.id: artikel, renungan, acara dan dokumentasi.', 'https://www.pmkitera.web.id', 30);

insert into public.app_roles (app_key, key, name, description, sort_order) values
  ('web', 'admin',       'Admin Website',      'Semua menu admin website dan riwayat perubahan.', 10),
  ('web', 'artikel',     'Editor Artikel',     'Menambah, mengubah dan menghapus artikel.', 20),
  ('web', 'renungan',    'Editor Renungan',    'Menambah, mengubah dan menghapus renungan.', 30),
  ('web', 'acara',       'Editor Acara',       'Menambah, mengubah dan menghapus acara (event).', 40),
  ('web', 'dokumentasi', 'Editor Dokumentasi', 'Menambah, mengubah dan menghapus dokumentasi.', 50);

insert into public.app_access_rules (app_key, app_role_key, subject_type, org_unit_id, include_child_units, note)
select 'web', r.role_key, 'org_unit', u.id, true, 'Aturan awal'
from (values
  ('admin',    'Departemen CMIT'),
  ('renungan', 'Departemen Pembinaan Rohani'),
  ('acara',    'Departemen Internal'),
  ('acara',    'Departemen Eksternal'),
  ('artikel',  'Departemen Eksternal'),
  ('artikel',  'Departemen Pembinaan Rohani')
) as r(role_key, unit_name)
join public.org_units u on u.type = 'department' and u.name = r.unit_name;
