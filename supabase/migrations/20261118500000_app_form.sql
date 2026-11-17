-- pmk-form reads its admins from PI-CORE too (D-16), owner request 2026-11-18.
-- One role: Admin pmk-form (forms, responses, attachments, admin log). pmk-form accepts this role
-- in addition to its legacy invite list (form.admin_members), so nobody loses access while moving.
--
-- Initial rules: every ACTIVE pmk-form admin who has an active PI-CORE member row gets a member rule.
-- Only where schema `form` exists (the hosted project); a fresh PI-CORE database just gets the app.

insert into public.apps (key, name, description, url, sort_order) values
  ('form', 'pmk-form', 'Formulir PMK ITERA (form.pmkitera.web.id): form, respons dan lampiran.', 'https://form.pmkitera.web.id', 40);

insert into public.app_roles (app_key, key, name, description, sort_order) values
  ('form', 'admin', 'Admin pmk-form', 'Mengelola semua form, respons, lampiran dan log admin pmk-form.', 10);

do $$
begin
  if to_regclass('form.admin_members') is not null then
    insert into public.app_access_rules (app_key, app_role_key, subject_type, member_id, note)
    select 'form', 'admin', 'member', m.id, 'Dari daftar admin pmk-form'
    from form.admin_members am
    join public.members m on lower(m.email) = lower(am.email) and m.is_active
    where am.status = 'active'
    on conflict do nothing;
  end if;
end
$$;
