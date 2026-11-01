-- PI-CORE v2 — organization structure from PI-CORE v1, position-derived admin access, super admins.
--
-- Concepts (docs/ARCHITECTURE.md D-01, D-02, D-10):
--   * org_units       the PMK ITERA tree: organization -> bph | department | bureau; department -> division.
--   * positions       a title for one unit TYPE (Kepala Divisi exists in every division), with a rank
--                     (lower = more senior) and an "only one holder per unit and period" flag.
--   * roles           bundles of capabilities. The only capability today is grants_admin.
--   * position_roles  the roles a position carries.
--   * assignments     member x org unit x position x period.
--   * access          super_admin: set by hand, not tied to a period, the only level that manages the
--                     structure, access levels and super admin accounts.
--                     admin: set by hand, OR held through an assignment in the ACTIVE period whose position
--                     carries a role with grants_admin (v1 ADR-0002: Ketua Umum, Sekjen, Sekum, every
--                     Kepala Departemen and Kepala Biro).
--                     member: everyone else.
--
-- No policy or function reads a role NAME; private.is_admin() reads roles.grants_admin.

-- ---------------------------------------------------------------------------------------------
-- Safety: roles/positions/assignments are replaced. Refuse if they hold data, instead of losing it.
-- ---------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from public.assignments)
     or exists (select 1 from public.positions)
     or exists (select 1 from public.roles) then
    raise exception 'roles/positions/assignments are not empty; migrate that data by hand before this migration';
  end if;
end
$$;

drop view public.role_overview;
-- periods_select reads assignments, so it has to go before the table (recreated below).
drop policy periods_select on public.periods;
-- one statement: the policies on roles/positions read assignments
drop table public.assignments, public.positions, public.roles;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create type public.org_unit_type as enum ('organization', 'bph', 'department', 'bureau', 'division');

create table public.org_units (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.org_units (id) on delete restrict,
  type       public.org_unit_type not null,
  name       text not null check (char_length(btrim(name)) between 2 and 80),
  sort_order integer not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  -- the root is the only unit without a parent
  check ((type = 'organization') = (parent_id is null)),
  -- target of the composite FK from assignments: org_unit.type = position.unit_type
  unique (id, type)
);
create unique index org_units_single_root on public.org_units ((true)) where parent_id is null;
create unique index org_units_parent_name_key on public.org_units (parent_id, lower(btrim(name)))
  where parent_id is not null;
create index org_units_parent_idx on public.org_units (parent_id);

create table public.positions (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(btrim(name)) between 2 and 80),
  unit_type          public.org_unit_type not null check (unit_type <> 'organization'),
  rank               integer not null check (rank between 1 and 999),
  is_unique_per_unit boolean not null default false,
  created_at         timestamptz not null default now(),
  created_by         uuid,
  updated_at         timestamptz not null default now(),
  updated_by         uuid,
  -- targets of the composite FKs from assignments
  unique (id, unit_type),
  unique (id, is_unique_per_unit)
);
create unique index positions_unit_type_name_key on public.positions (unit_type, lower(btrim(name)));

create table public.roles (
  id           uuid primary key default gen_random_uuid(),
  key          text unique check (key ~ '^[a-z][a-z0-9_]{1,40}$'), -- set for system roles only
  name         text not null check (char_length(btrim(name)) between 2 and 60),
  description  text check (char_length(description) <= 280),
  sort_order   integer not null default 100,
  is_system    boolean not null default false,
  grants_admin boolean not null default false,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  updated_at   timestamptz not null default now(),
  updated_by   uuid
);
create unique index roles_name_key on public.roles (lower(btrim(name)));

create table public.position_roles (
  position_id uuid not null references public.positions (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  primary key (position_id, role_id)
);
create index position_roles_role_idx on public.position_roles (role_id);

create table public.assignments (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members (id) on delete restrict,
  org_unit_id        uuid not null,
  position_id        uuid not null,
  period_id          uuid not null references public.periods (id) on delete restrict,
  -- copied from the position by private.assignment_fill(); never written by clients
  unit_type          public.org_unit_type not null,
  is_unique_per_unit boolean not null,
  created_at         timestamptz not null default now(),
  created_by         uuid,
  updated_at         timestamptz not null default now(),
  updated_by         uuid,
  -- together these two force org_unit.type = position.unit_type
  constraint assignments_unit_type_fk
    foreign key (org_unit_id, unit_type) references public.org_units (id, type) on delete restrict,
  constraint assignments_position_type_fk
    foreign key (position_id, unit_type) references public.positions (id, unit_type) on delete restrict,
  -- keeps the copied flag honest; toggling it on the position cascades here
  constraint assignments_position_unique_fk
    foreign key (position_id, is_unique_per_unit) references public.positions (id, is_unique_per_unit)
    on update cascade on delete restrict,
  constraint assignments_unique unique (member_id, org_unit_id, position_id, period_id)
);
-- One Kepala Divisi per division per period, one Ketua Umum per period, ...
create unique index assignments_one_holder on public.assignments (org_unit_id, position_id, period_id)
  where is_unique_per_unit;
create index assignments_period_idx on public.assignments (period_id);
create index assignments_member_idx on public.assignments (member_id);
create index assignments_org_unit_idx on public.assignments (org_unit_id);
create index assignments_position_idx on public.assignments (position_id);

-- ---------------------------------------------------------------------------------------------
-- Access functions
-- ---------------------------------------------------------------------------------------------

create function private.is_super_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid()) and m.is_active and m.access_level = 'super_admin'
  )
$$;
revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated, service_role;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid())
      and m.is_active
      and (
        m.access_level in ('super_admin', 'admin')
        or exists (
          select 1
          from public.assignments a
          join public.periods p on p.id = a.period_id and p.is_active
          join public.position_roles pr on pr.position_id = a.position_id
          join public.roles r on r.id = pr.role_id and r.grants_admin
          where a.member_id = m.id
        )
      )
  )
$$;

-- The caller's effective access, for the app. Reveals nothing about anyone else.
create function public.current_access()
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when private.is_super_admin() then 'super_admin'
    when private.is_admin() then 'admin'
    else 'member'
  end
$$;
revoke all on function public.current_access() from public, anon;
grant execute on function public.current_access() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Member guards
-- ---------------------------------------------------------------------------------------------

-- The last-admin guard becomes a last-SUPER-admin guard: admins can come and go with positions,
-- but someone must always be able to manage the structure and access levels.
drop trigger members_last_admin on public.members;
drop function private.guard_last_admin();

create function private.guard_last_super_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.access_level = 'super_admin' and old.is_active
     and (new.access_level <> 'super_admin' or not new.is_active) then
    perform pg_advisory_xact_lock(hashtext('pi_core.members.last_super_admin'));
    if not exists (
      select 1 from public.members m
      where m.id <> old.id and m.access_level = 'super_admin' and m.is_active
    ) then
      raise exception 'Cannot remove the last active super admin' using errcode = 'P0001', hint = 'last_super_admin';
    end if;
  end if;
  return new;
end
$$;

-- Only a super admin grants or changes access levels. Writes without a user (service role:
-- bootstrap script, migrations) are trusted, as everywhere else in this schema.
create function private.guard_member_access_level()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.access_level <> 'member' and not private.is_super_admin() then
      raise exception 'Only a super admin can grant admin access' using errcode = '42501';
    end if;
  elsif new.access_level is distinct from old.access_level and not private.is_super_admin() then
    raise exception 'Only a super admin can change access levels' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger members_last_super_admin before update on public.members
  for each row execute function private.guard_last_super_admin();
create trigger members_access_level before insert or update on public.members
  for each row execute function private.guard_member_access_level();

-- ---------------------------------------------------------------------------------------------
-- Structure guards
-- ---------------------------------------------------------------------------------------------

create function private.org_unit_check_parent()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  parent_type public.org_unit_type;
begin
  if new.parent_id is null then
    return new;
  end if;
  select u.type into parent_type from public.org_units u where u.id = new.parent_id;
  if (new.type in ('bph', 'department', 'bureau') and parent_type is distinct from 'organization')
     or (new.type = 'division' and parent_type is distinct from 'department') then
    raise exception 'A % cannot be placed under a %', new.type, coalesce(parent_type::text, 'missing unit')
      using errcode = 'P0001', hint = 'org_unit_parent';
  end if;
  return new;
end
$$;

-- Copies unit_type / is_unique_per_unit from the position and rejects mismatches with a clear error
-- (the composite FKs reject them too). Assignments to an inactive unit are refused.
create function private.assignment_fill()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  p_type   public.org_unit_type;
  p_unique boolean;
  u_type   public.org_unit_type;
  u_active boolean;
begin
  select p.unit_type, p.is_unique_per_unit into p_type, p_unique from public.positions p where p.id = new.position_id;
  select u.type, u.is_active into u_type, u_active from public.org_units u where u.id = new.org_unit_id;
  if p_type is null or u_type is null then
    raise exception 'Position or unit not found' using errcode = '23503';
  end if;
  if p_type <> u_type then
    raise exception 'Position % does not exist in a % unit', new.position_id, u_type
      using errcode = 'P0001', hint = 'unit_type_mismatch';
  end if;
  if not u_active and (tg_op = 'INSERT' or new.org_unit_id is distinct from old.org_unit_id) then
    raise exception 'Unit is inactive' using errcode = 'P0001', hint = 'unit_inactive';
  end if;
  new.unit_type := p_type;
  new.is_unique_per_unit := p_unique;
  return new;
end
$$;

-- Same rule as before, but an update that does not move the assignment (e.g. the cascade from
-- toggling a position's is_unique_per_unit) is allowed for a deactivated member's history.
create or replace function private.assignment_member_active()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.member_id = old.member_id and new.org_unit_id = old.org_unit_id
     and new.position_id = old.position_id and new.period_id = old.period_id then
    return new;
  end if;
  if not exists (select 1 from public.members m where m.id = new.member_id and m.is_active) then
    raise exception 'Member is not active' using errcode = 'P0001', hint = 'member_inactive';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

create trigger org_units_stamp before insert or update on public.org_units
  for each row execute function private.stamp_row();
create trigger org_units_parent before insert or update on public.org_units
  for each row execute function private.org_unit_check_parent();
create trigger positions_stamp before insert or update on public.positions
  for each row execute function private.stamp_row();
create trigger roles_stamp before insert or update on public.roles
  for each row execute function private.stamp_row();
create trigger position_roles_stamp before insert or update on public.position_roles
  for each row execute function private.stamp_row();
create trigger assignments_stamp before insert or update on public.assignments
  for each row execute function private.stamp_row();
create trigger assignments_fill before insert or update on public.assignments
  for each row execute function private.assignment_fill();
create trigger assignments_member_active before insert or update on public.assignments
  for each row execute function private.assignment_member_active();

create trigger org_units_audit after insert or update or delete on public.org_units
  for each row execute function private.write_audit_log();
create trigger positions_audit after insert or update or delete on public.positions
  for each row execute function private.write_audit_log();
create trigger roles_audit after insert or update or delete on public.roles
  for each row execute function private.write_audit_log();
create trigger position_roles_audit after insert or update or delete on public.position_roles
  for each row execute function private.write_audit_log();
create trigger assignments_audit after insert or update or delete on public.assignments
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------------------------
-- Read model: role cards. Count = distinct active members holding, in the ACTIVE period, a position
-- that carries the role.
-- ---------------------------------------------------------------------------------------------

create view public.role_overview with (security_invoker = true) as
select
  r.id,
  r.key,
  r.name,
  r.description,
  r.sort_order,
  r.is_system,
  r.grants_admin,
  (
    select count(distinct a.member_id)
    from public.assignments a
    join public.position_roles pr on pr.position_id = a.position_id and pr.role_id = r.id
    join public.periods p on p.id = a.period_id and p.is_active
    join public.members m on m.id = a.member_id and m.is_active
  )::int as active_member_count,
  (select count(*) from public.position_roles pr where pr.role_id = r.id)::int as position_count
from public.roles r;

-- ---------------------------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------------------------

revoke all on public.org_units, public.positions, public.roles, public.position_roles, public.assignments,
  public.role_overview from anon, authenticated;

-- type and parent are fixed after creation (moving units would break the tree rules and history)
grant select, delete on public.org_units to authenticated;
grant insert (parent_id, type, name, sort_order, is_active), update (name, sort_order, is_active)
  on public.org_units to authenticated;

-- unit_type is fixed after creation
grant select, delete on public.positions to authenticated;
grant insert (name, unit_type, rank, is_unique_per_unit), update (name, rank, is_unique_per_unit)
  on public.positions to authenticated;

-- key and is_system are owned by migrations
grant select, delete on public.roles to authenticated;
grant insert (name, description, sort_order, grants_admin), update (name, description, sort_order, grants_admin)
  on public.roles to authenticated;

grant select, delete on public.position_roles to authenticated;
grant insert (position_id, role_id) on public.position_roles to authenticated;

grant select, delete on public.assignments to authenticated;
grant insert (member_id, org_unit_id, position_id, period_id), update (member_id, org_unit_id, position_id, period_id)
  on public.assignments to authenticated;

grant select on public.role_overview to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.org_units      enable row level security;
alter table public.positions      enable row level security;
alter table public.roles          enable row level security;
alter table public.position_roles enable row level security;
alter table public.assignments    enable row level security;

-- members: admins may edit members, but only a super admin may touch a super admin's row.
drop policy members_insert on public.members;
drop policy members_update on public.members;
create policy members_insert on public.members for insert to authenticated
  with check ((select private.is_super_admin()) or ((select private.is_admin()) and access_level = 'member'));
create policy members_update on public.members for update to authenticated
  using ((select private.is_super_admin()) or ((select private.is_admin()) and access_level <> 'super_admin'))
  with check ((select private.is_super_admin()) or ((select private.is_admin()) and access_level <> 'super_admin'));

-- org_settings: super admins only (v1 settings:manage).
drop policy org_settings_update on public.org_settings;
create policy org_settings_update on public.org_settings for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Structure is readable by every active member (v1 orgunit:read); only super admins change it.
create policy org_units_select on public.org_units for select to authenticated
  using ((select private.current_member_id()) is not null);
create policy org_units_insert on public.org_units for insert to authenticated
  with check ((select private.is_super_admin()));
create policy org_units_update on public.org_units for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy org_units_delete on public.org_units for delete to authenticated
  using ((select private.is_super_admin()));

create policy positions_select on public.positions for select to authenticated
  using ((select private.current_member_id()) is not null);
create policy positions_insert on public.positions for insert to authenticated
  with check ((select private.is_super_admin()));
create policy positions_update on public.positions for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy positions_delete on public.positions for delete to authenticated
  using ((select private.is_super_admin()));

-- roles: admins see all; a member sees the roles carried by their own positions.
create policy roles_select on public.roles for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.assignments a
      join public.position_roles pr on pr.position_id = a.position_id
      where pr.role_id = roles.id and a.member_id = (select private.current_member_id())
    )
  );
create policy roles_insert on public.roles for insert to authenticated
  with check ((select private.is_super_admin()));
create policy roles_update on public.roles for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy roles_delete on public.roles for delete to authenticated
  using ((select private.is_super_admin()) and not is_system);

create policy position_roles_select on public.position_roles for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.assignments a
      where a.position_id = position_roles.position_id and a.member_id = (select private.current_member_id())
    )
  );
create policy position_roles_insert on public.position_roles for insert to authenticated
  with check ((select private.is_super_admin()));
create policy position_roles_delete on public.position_roles for delete to authenticated
  using ((select private.is_super_admin()));

-- assignments: admins (manual or through their position) manage them; a member sees their own.
create policy assignments_select on public.assignments for select to authenticated
  using ((select private.is_admin()) or member_id = (select private.current_member_id()));
create policy assignments_insert on public.assignments for insert to authenticated
  with check ((select private.is_admin()));
create policy assignments_update on public.assignments for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy assignments_delete on public.assignments for delete to authenticated
  using ((select private.is_admin()));

-- periods: same rule as before, against the new assignments table.
create policy periods_select on public.periods for select to authenticated
  using (
    (select private.is_admin())
    or ((select private.current_member_id()) is not null and is_active)
    or exists (select 1 from public.assignments a
               where a.period_id = periods.id and a.member_id = (select private.current_member_id()))
  );

-- ---------------------------------------------------------------------------------------------
-- Baseline data: the PMK ITERA structure from PI-CORE v1 (owner-confirmed names, 2026-10-15).
-- Real organizational data, so it lives here and reaches every environment, not in seed.sql.
-- ---------------------------------------------------------------------------------------------

insert into public.org_units (type, name, sort_order) values ('organization', 'PMK ITERA', 0);

insert into public.org_units (parent_id, type, name, sort_order)
select root.id, u.type::public.org_unit_type, u.name, u.sort_order
from public.org_units root
cross join (values
  ('bph',        'BPH PMK ITERA',               10),
  ('department', 'Departemen Internal',         20),
  ('department', 'Departemen Eksternal',        30),
  ('department', 'Departemen Pelayanan Khusus', 40),
  ('department', 'Departemen Talenta',          50),
  ('department', 'Departemen Operasional',      60),
  ('department', 'Departemen CMIT',             70),
  ('department', 'Departemen Pembinaan Rohani', 80),
  ('bureau',     'Biro Kewirausahaan',          90)
) as u(type, name, sort_order)
where root.parent_id is null;

insert into public.org_units (parent_id, type, name, sort_order)
select dept.id, 'division', d.name, d.sort_order
from (values
  ('Departemen Internal',         'EO',              10),
  ('Departemen Internal',         'Harmonisasi',     20),
  ('Departemen Eksternal',        'Intra Kampus',    10),
  ('Departemen Eksternal',        'Ekstra Kampus',   20),
  ('Departemen Pelayanan Khusus', 'Worship',         10),
  ('Departemen Pelayanan Khusus', 'Worship Creator', 20),
  ('Departemen Pelayanan Khusus', 'Musik',           30),
  ('Departemen Talenta',          'Art Interest',    10),
  ('Departemen Talenta',          'Ekstra Youth',    20),
  ('Departemen Operasional',      'Logistik',        10),
  ('Departemen Operasional',      'Akomodasi',       20),
  ('Departemen CMIT',             'Pubdok',          10),
  ('Departemen CMIT',             'Desain',          20),
  ('Departemen CMIT',             'IT',              30),
  ('Departemen Pembinaan Rohani', 'Gospel Group',    10),
  ('Departemen Pembinaan Rohani', 'Doa',             20)
) as d(department, name, sort_order)
join public.org_units dept on dept.type = 'department' and dept.name = d.department;

insert into public.positions (name, unit_type, rank, is_unique_per_unit) values
  ('Ketua Umum',            'bph',        10, true),
  ('Sekretaris Jenderal',   'bph',        20, true),
  ('Sekretaris Umum 1',     'bph',        30, true),
  ('Sekretaris Umum 2',     'bph',        30, true),
  ('Bendahara Umum 1',      'bph',        30, true),
  ('Bendahara Umum 2',      'bph',        30, true),
  ('Kepala Departemen',     'department', 40, true),
  ('Sekretaris Departemen', 'department', 50, true),
  ('Kepala Biro',           'bureau',     40, true),
  ('Sekretaris Biro',       'bureau',     50, true),
  ('Kepala Divisi',         'division',   60, true),
  ('Staff',                 'division',   70, false),
  ('Staff',                 'bureau',     70, false);

insert into public.roles (key, name, description, sort_order, is_system, grants_admin) values
  ('organization_admin', 'Organization Admin',
   'Holders manage members, periods and assignments in PI-CORE while their position is in the active period.',
   10, true, true),
  ('bph',               'BPH',                             'BPH leadership.',                          20, true, false),
  ('bendahara',         'Bendahara',                       'Bendahara Umum.',                          30, true, false),
  ('kepala_departemen', 'Kepala Departemen / Kepala Biro', 'Head of a department or bureau.',          40, true, false),
  ('sekretaris',        'Sekretaris',                      'Sekretaris Departemen / Sekretaris Biro.', 50, true, false),
  ('kepala_divisi',     'Kepala Divisi',                   'Head of a division.',                      60, true, false),
  ('staff',             'Staff',                           'Staff of a division or bureau.',           70, true, false);

insert into public.position_roles (position_id, role_id)
select p.id, r.id
from (values
  ('bph',        'Ketua Umum',            'bph'),
  ('bph',        'Ketua Umum',            'organization_admin'),
  ('bph',        'Sekretaris Jenderal',   'bph'),
  ('bph',        'Sekretaris Jenderal',   'organization_admin'),
  ('bph',        'Sekretaris Umum 1',     'bph'),
  ('bph',        'Sekretaris Umum 1',     'organization_admin'),
  ('bph',        'Sekretaris Umum 2',     'bph'),
  ('bph',        'Sekretaris Umum 2',     'organization_admin'),
  ('bph',        'Bendahara Umum 1',      'bph'),
  ('bph',        'Bendahara Umum 1',      'bendahara'),
  ('bph',        'Bendahara Umum 2',      'bph'),
  ('bph',        'Bendahara Umum 2',      'bendahara'),
  ('department', 'Kepala Departemen',     'kepala_departemen'),
  ('department', 'Kepala Departemen',     'organization_admin'),
  ('department', 'Sekretaris Departemen', 'sekretaris'),
  ('bureau',     'Kepala Biro',           'kepala_departemen'),
  ('bureau',     'Kepala Biro',           'organization_admin'),
  ('bureau',     'Sekretaris Biro',       'sekretaris'),
  ('division',   'Kepala Divisi',         'kepala_divisi'),
  ('division',   'Staff',                 'staff'),
  ('bureau',     'Staff',                 'staff')
) as m(unit_type, position_name, role_key)
join public.positions p on p.unit_type = m.unit_type::public.org_unit_type and p.name = m.position_name
join public.roles r on r.key = m.role_key;

-- Every existing admin was created by the bootstrap script or by hand before super admins existed;
-- they become super admins so nobody loses the ability to manage access.
update public.members set access_level = 'super_admin' where access_level = 'admin';
