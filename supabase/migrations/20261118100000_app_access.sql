-- App access (D-16): which PMK app roles a member gets, managed in PI-CORE.
--
--   apps              the PMK apps that read their access from PI-CORE (seeded here: PMK ARK)
--   app_roles         the roles an app knows, e.g. ARK "admin" and "pengurus" (owned by migrations)
--   app_access_rules  "app role X goes to <subject>", subject = a member, a PI-CORE role, a position
--                     or an org unit (optionally with its child units). Same shape as PMK-NEXUS rules.
--
-- Role, position and unit rules match assignments in the ACTIVE period only, so access follows the
-- people who hold the seats. Member rules hold regardless of period. Inactive members and members on
-- a temporary password match nothing.
--
-- Super admins manage rules; admins can read them. Apps call public.my_app_roles('<app>') with the
-- signed-in user's session and get the caller's roles only.

create table public.apps (
  key         text primary key check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  description text check (char_length(description) <= 280),
  url         text check (url ~ '^https://'),
  sort_order  integer not null default 100
);

create table public.app_roles (
  app_key     text not null references public.apps (key) on delete cascade,
  key         text not null check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  description text check (char_length(description) <= 280),
  sort_order  integer not null default 100,
  primary key (app_key, key)
);

create table public.app_access_rules (
  id                  uuid primary key default gen_random_uuid(),
  app_key             text not null,
  app_role_key        text not null,
  subject_type        text not null check (subject_type in ('member', 'role', 'position', 'org_unit')),
  member_id           uuid references public.members (id) on delete cascade,
  role_id             uuid references public.roles (id) on delete cascade,
  position_id         uuid references public.positions (id) on delete cascade,
  org_unit_id         uuid references public.org_units (id) on delete cascade,
  include_child_units boolean not null default false,
  is_enabled          boolean not null default true,
  note                text check (note is null or char_length(note) <= 280),
  created_at          timestamptz not null default now(),
  created_by          uuid,
  updated_at          timestamptz not null default now(),
  updated_by          uuid,
  foreign key (app_key, app_role_key) references public.app_roles (app_key, key) on delete cascade,
  -- Each subject type uses exactly its own column, so a rule can never be ambiguous.
  constraint app_access_rules_subject_shape check (
       (subject_type = 'member'   and member_id is not null and role_id is null and position_id is null and org_unit_id is null and not include_child_units)
    or (subject_type = 'role'     and role_id is not null and member_id is null and position_id is null and org_unit_id is null and not include_child_units)
    or (subject_type = 'position' and position_id is not null and member_id is null and role_id is null and org_unit_id is null and not include_child_units)
    or (subject_type = 'org_unit' and org_unit_id is not null and member_id is null and role_id is null and position_id is null)
  )
);
create unique index app_access_rules_no_duplicates on public.app_access_rules (
  app_key, app_role_key, subject_type,
  coalesce(member_id, role_id, position_id, org_unit_id), include_child_units
);
create index app_access_rules_app on public.app_access_rules (app_key) where is_enabled;

create trigger app_access_rules_stamp before insert or update on public.app_access_rules
  for each row execute function private.stamp_row();
create trigger app_access_rules_audit after insert or update or delete on public.app_access_rules
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------------------------
-- Evaluation (one place; used by my_app_roles and app_access_holders)
-- ---------------------------------------------------------------------------------------------

-- The enabled rules of p_app that give p_member_id access. Callers check who may ask.
create function private.app_rules_for_member(p_app text, p_member_id uuid)
returns table (rule_id uuid, app_role_key text)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.app_role_key
  from public.app_access_rules r
  join public.members m on m.id = p_member_id and m.is_active and not m.must_change_password
  where r.app_key = p_app
    and r.is_enabled
    and (
      (r.subject_type = 'member' and r.member_id = m.id)
      or exists (
        select 1
        from public.assignments a
        join public.periods p on p.id = a.period_id and p.is_active
        join public.org_units u on u.id = a.org_unit_id
        where a.member_id = m.id
          and (
            (r.subject_type = 'role' and exists (
              select 1 from public.position_roles pr
              where pr.position_id = a.position_id and pr.role_id = r.role_id))
            or (r.subject_type = 'position' and a.position_id = r.position_id)
            or (r.subject_type = 'org_unit'
                and (a.org_unit_id = r.org_unit_id or (r.include_child_units and u.parent_id = r.org_unit_id)))
          )
      )
    )
$$;
revoke all on function private.app_rules_for_member(text, uuid) from public, anon, authenticated;

-- For apps: the caller's roles in p_app (sorted, no duplicates; empty when none).
create function public.my_app_roles(p_app text)
returns text[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct x.app_role_key order by x.app_role_key), '{}')
  from private.app_rules_for_member(p_app, private.current_member_id()) x
$$;
revoke all on function public.my_app_roles(text) from public, anon;
grant execute on function public.my_app_roles(text) to authenticated;

-- For the Integrations page: who has which role in p_app right now, and through which rule. Admins only.
create function public.app_access_holders(p_app text)
returns table (member_id uuid, full_name text, email text, app_role_key text, rule_id uuid)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.full_name, m.email, x.app_role_key, x.rule_id
  from public.members m
  cross join lateral private.app_rules_for_member(p_app, m.id) x
  where private.is_admin()
  order by m.full_name, x.app_role_key
$$;
revoke all on function public.app_access_holders(text) from public, anon;
grant execute on function public.app_access_holders(text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------------------------

grant select on public.apps, public.app_roles to authenticated;
grant select, delete on public.app_access_rules to authenticated;
grant insert (app_key, app_role_key, subject_type, member_id, role_id, position_id, org_unit_id,
              include_child_units, is_enabled, note),
      update (is_enabled, note)
  on public.app_access_rules to authenticated;

alter table public.apps             enable row level security;
alter table public.app_roles        enable row level security;
alter table public.app_access_rules enable row level security;

create policy apps_select on public.apps for select to authenticated
  using ((select private.is_admin()));
create policy app_roles_select on public.app_roles for select to authenticated
  using ((select private.is_admin()));

create policy app_access_rules_select on public.app_access_rules for select to authenticated
  using ((select private.is_admin()));
create policy app_access_rules_insert on public.app_access_rules for insert to authenticated
  with check ((select private.is_super_admin()));
create policy app_access_rules_update on public.app_access_rules for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy app_access_rules_delete on public.app_access_rules for delete to authenticated
  using ((select private.is_super_admin()));

-- ---------------------------------------------------------------------------------------------
-- Baseline: PMK ARK (owner decision 2026-11-18)
-- ---------------------------------------------------------------------------------------------

insert into public.apps (key, name, description, url, sort_order) values
  ('ark', 'PMK ARK', 'Arsip materi ibadah dan pelayanan PMK ITERA.', 'https://ark.pmkitera.web.id', 10);

insert into public.app_roles (app_key, key, name, description, sort_order) values
  ('ark', 'admin',    'Admin ARK',    'Mengelola kategori, periode pelayanan dan publikasi dokumen. Termasuk semua hak Pengurus ARK.', 10),
  ('ark', 'pengurus', 'Pengurus ARK', 'Mengunggah dan mengubah dokumen arsip.', 20);

-- Pengurus ARK: everyone in Departemen CMIT and Departemen Pelayanan Khusus, divisions included.
-- Admin ARK is given to specific members on the Integrations page (needs real member rows).
insert into public.app_access_rules (app_key, app_role_key, subject_type, org_unit_id, include_child_units, note)
select 'ark', 'pengurus', 'org_unit', u.id, true, 'Aturan awal'
from public.org_units u
where u.type = 'department' and u.name in ('Departemen CMIT', 'Departemen Pelayanan Khusus');
