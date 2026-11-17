-- PI-LYNK reads its access from PI-CORE (D-16), owner decision 2026-11-18:
--   Admin PI-LYNK     Departemen CMIT (divisions included): every link, reports, import, history.
--   Pengurus PI-LYNK  pengurus of every department (divisions included): create links, change or
--                     delete their own links. PI-LYNK records every action with the actor's email.
-- Both can be changed on the Integrations page.

insert into public.apps (key, name, description, url, sort_order) values
  ('lynk', 'PI-LYNK', 'Pemendek tautan PMK ITERA (s.pmkitera.web.id).', 'https://s.pmkitera.web.id', 20);

insert into public.app_roles (app_key, key, name, description, sort_order) values
  ('lynk', 'admin',    'Admin PI-LYNK',    'Mengelola semua tautan, laporan, impor dan riwayat. Termasuk semua hak Pengurus PI-LYNK.', 10),
  ('lynk', 'pengurus', 'Pengurus PI-LYNK', 'Membuat tautan, lalu mengubah atau menghapus tautan buatannya sendiri.', 20);

insert into public.app_access_rules (app_key, app_role_key, subject_type, org_unit_id, include_child_units, note)
select 'lynk', 'admin', 'org_unit', u.id, true, 'Aturan awal'
from public.org_units u
where u.type = 'department' and u.name = 'Departemen CMIT';

insert into public.app_access_rules (app_key, app_role_key, subject_type, org_unit_id, include_child_units, note)
select 'lynk', 'pengurus', 'org_unit', u.id, true, 'Aturan awal'
from public.org_units u
where u.type = 'department';
