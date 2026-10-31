-- PI-CORE v2 — core schema
--
-- Concepts (see docs/DATA-MODEL.md):
--   * members.access_level  = SYSTEM access to PI-CORE itself (admin | member).
--   * roles / positions      = ORGANIZATIONAL structure (BPH, Sekretaris, ...). They never grant
--                              system access; nothing in this schema reads a role name to decide
--                              authorization.
--   * assignments            = member + role + position + period.
--
-- Authorization is enforced here with RLS + column privileges; the app layer repeats the checks
-- but is not trusted to be the only guard.

-- ---------------------------------------------------------------------------------------------
-- Schemas and types
-- ---------------------------------------------------------------------------------------------

-- `private` is not exposed through the Data API (only `public` and `graphql_public` are).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.access_level as enum ('admin', 'member');

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table public.members (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid unique references auth.users (id) on delete set null,
  full_name            text not null check (char_length(btrim(full_name)) between 2 and 120),
  email                text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nim                  text check (nim ~ '^[0-9]{6,12}$'),
  phone                text check (phone ~ '^\+?[0-9]{8,15}$'),
  access_level         public.access_level not null default 'member',
  is_active            boolean not null default true,
  deactivated_at       timestamptz,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  created_by           uuid,
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);
create unique index members_email_key on public.members (email);
create unique index members_nim_key on public.members (nim) where nim is not null;
create index members_full_name_idx on public.members (lower(full_name));

comment on column public.members.access_level is
  'System access to PI-CORE (admin|member). Independent of organizational roles.';

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  description text check (char_length(description) <= 280),
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create unique index roles_name_key on public.roles (lower(btrim(name)));

-- Position = the specific title inside a role (e.g. role "BPH" -> position "Ketua Umum").
-- A lookup table, not free text, so the same title is not spelled three ways and can be filtered on.
create table public.positions (
  id         uuid primary key default gen_random_uuid(),
  role_id    uuid not null references public.roles (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 2 and 80),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  -- target of the composite FK from assignments, which guarantees position.role_id = assignment.role_id
  unique (id, role_id)
);
create unique index positions_role_name_key on public.positions (role_id, lower(btrim(name)));

create table public.periods (
  id         uuid primary key default gen_random_uuid(),
  label      text not null check (
               label ~ '^[0-9]{4}/[0-9]{4}$'
               and split_part(label, '/', 2)::int = split_part(label, '/', 1)::int + 1
             ),
  starts_on  date,
  ends_on    date,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (starts_on is null or ends_on is null or ends_on > starts_on)
);
create unique index periods_label_key on public.periods (label);
-- At most one active period, enforced by the database.
create unique index periods_single_active on public.periods (is_active) where is_active;

create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members (id) on delete restrict,
  role_id     uuid not null references public.roles (id) on delete restrict,
  position_id uuid not null,
  period_id   uuid not null references public.periods (id) on delete restrict,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  constraint assignments_position_matches_role
    foreign key (position_id, role_id) references public.positions (id, role_id) on delete restrict,
  constraint assignments_unique unique (member_id, role_id, position_id, period_id)
);
create index assignments_role_period_idx on public.assignments (role_id, period_id);
create index assignments_period_idx on public.assignments (period_id);
create index assignments_position_idx on public.assignments (position_id, role_id);

-- Singleton row with organization identity.
create table public.org_settings (
  id         boolean primary key default true check (id),
  org_name   text not null check (char_length(btrim(org_name)) between 2 and 120),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,              -- auth.users.id; null = system / service role
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb
);
create index audit_log_occurred_idx on public.audit_log (occurred_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

-- ---------------------------------------------------------------------------------------------
-- Helper functions (private schema, SECURITY DEFINER, empty search_path)
-- ---------------------------------------------------------------------------------------------

create function private.current_member_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.id from public.members m
  where m.user_id = (select auth.uid()) and m.is_active
$$;

create function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.user_id = (select auth.uid()) and m.is_active and m.access_level = 'admin'
  )
$$;

revoke all on function private.current_member_id() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.current_member_id() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

-- created_*/updated_* are owned by the database, never by the caller.
create function private.stamp_row()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;

create function private.write_audit_log()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rec_id text;
begin
  rec_id := case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id') else (to_jsonb(new) ->> 'id') end;
  insert into public.audit_log (actor_id, table_name, record_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    rec_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end
$$;

-- Never leave the organization without an active admin. Serialized with an advisory lock so two
-- admins demoting each other concurrently cannot both succeed.
create function private.guard_last_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.access_level = 'admin' and old.is_active
     and (new.access_level <> 'admin' or not new.is_active) then
    perform pg_advisory_xact_lock(hashtext('pi_core.members.last_admin'));
    if not exists (
      select 1 from public.members m
      where m.id <> old.id and m.access_level = 'admin' and m.is_active
    ) then
      raise exception 'Cannot remove the last active admin' using errcode = 'P0001', hint = 'last_admin';
    end if;
  end if;
  return new;
end
$$;

create function private.track_deactivation()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.is_active is distinct from old.is_active then
    new.deactivated_at := case when new.is_active then null else now() end;
  end if;
  return new;
end
$$;

-- The first period ever created becomes active; otherwise new periods start inactive.
-- is_active can only change through set_active_period().
create function private.period_insert_defaults()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.is_active := not exists (select 1 from public.periods p where p.is_active);
  return new;
end
$$;

create function private.assignment_member_active()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.members m where m.id = new.member_id and m.is_active) then
    raise exception 'Member is not active' using errcode = 'P0001', hint = 'member_inactive';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

create trigger members_stamp before insert or update on public.members
  for each row execute function private.stamp_row();
create trigger members_last_admin before update on public.members
  for each row execute function private.guard_last_admin();
create trigger members_deactivation before update on public.members
  for each row execute function private.track_deactivation();

create trigger roles_stamp before insert or update on public.roles
  for each row execute function private.stamp_row();
create trigger positions_stamp before insert or update on public.positions
  for each row execute function private.stamp_row();
create trigger periods_stamp before insert or update on public.periods
  for each row execute function private.stamp_row();
create trigger periods_insert_defaults before insert on public.periods
  for each row execute function private.period_insert_defaults();
create trigger assignments_stamp before insert or update on public.assignments
  for each row execute function private.stamp_row();
create trigger assignments_member_active before insert or update on public.assignments
  for each row execute function private.assignment_member_active();
create trigger org_settings_stamp before insert or update on public.org_settings
  for each row execute function private.stamp_row();

create trigger members_audit after insert or update or delete on public.members
  for each row execute function private.write_audit_log();
create trigger roles_audit after insert or update or delete on public.roles
  for each row execute function private.write_audit_log();
create trigger positions_audit after insert or update or delete on public.positions
  for each row execute function private.write_audit_log();
create trigger periods_audit after insert or update or delete on public.periods
  for each row execute function private.write_audit_log();
create trigger assignments_audit after insert or update or delete on public.assignments
  for each row execute function private.write_audit_log();
create trigger org_settings_audit after insert or update or delete on public.org_settings
  for each row execute function private.write_audit_log();

-- ---------------------------------------------------------------------------------------------
-- RPC: atomic "Set Active" for periods
-- ---------------------------------------------------------------------------------------------

create function public.set_active_period(p_period_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.periods where id = p_period_id) then
    raise exception 'Period not found' using errcode = 'P0002';
  end if;
  -- Two statements in one function = one transaction. The partial unique index is checked per
  -- row, so the old period is cleared first.
  update public.periods set is_active = false where is_active and id <> p_period_id;
  update public.periods set is_active = true where id = p_period_id and not is_active;
end
$$;
revoke all on function public.set_active_period(uuid) from public, anon;
grant execute on function public.set_active_period(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Read model: role cards with member counts for the ACTIVE period (distinct active members).
-- security_invoker so RLS of the underlying tables applies to the caller.
-- ---------------------------------------------------------------------------------------------

create view public.role_overview with (security_invoker = true) as
select
  r.id,
  r.name,
  r.description,
  r.sort_order,
  (
    select count(distinct a.member_id)
    from public.assignments a
    join public.periods p on p.id = a.period_id and p.is_active
    join public.members m on m.id = a.member_id and m.is_active
    where a.role_id = r.id
  )::int as active_member_count,
  (select count(*) from public.assignments a where a.role_id = r.id)::int as assignment_count
from public.roles r;

-- ---------------------------------------------------------------------------------------------
-- Privileges. Supabase grants everything on public tables to anon/authenticated by default;
-- start from nothing and grant only what the policies below are meant to allow.
-- ---------------------------------------------------------------------------------------------

revoke all on public.members, public.roles, public.positions, public.periods, public.assignments,
  public.org_settings, public.audit_log, public.role_overview from anon, authenticated;

grant select on public.members to authenticated;
grant insert (user_id, full_name, email, nim, phone, access_level, must_change_password)
  on public.members to authenticated;
grant update (full_name, email, nim, phone, access_level, is_active, must_change_password)
  on public.members to authenticated;

grant select, delete on public.roles to authenticated;
grant insert (name, description, sort_order), update (name, description, sort_order)
  on public.roles to authenticated;

grant select, delete on public.positions to authenticated;
grant insert (role_id, name), update (name) on public.positions to authenticated;

grant select on public.periods to authenticated;
grant insert (label, starts_on, ends_on), update (label, starts_on, ends_on)
  on public.periods to authenticated;

grant select, delete on public.assignments to authenticated;
grant insert (member_id, role_id, position_id, period_id), update (member_id, role_id, position_id, period_id)
  on public.assignments to authenticated;

grant select on public.org_settings to authenticated;
grant update (org_name) on public.org_settings to authenticated;

grant select on public.audit_log to authenticated;
grant select on public.role_overview to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.members      enable row level security;
alter table public.roles        enable row level security;
alter table public.positions    enable row level security;
alter table public.periods      enable row level security;
alter table public.assignments  enable row level security;
alter table public.org_settings enable row level security;
alter table public.audit_log    enable row level security;

-- members: admins see everyone; a member sees only their own row. Only admins write.
-- No DELETE policy: members are deactivated, never deleted through the API.
create policy members_select on public.members for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy members_insert on public.members for insert to authenticated
  with check ((select private.is_admin()));
create policy members_update on public.members for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- assignments: admins see all; a member sees their own. Only admins write.
create policy assignments_select on public.assignments for select to authenticated
  using ((select private.is_admin()) or member_id = (select private.current_member_id()));
create policy assignments_insert on public.assignments for insert to authenticated
  with check ((select private.is_admin()));
create policy assignments_update on public.assignments for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy assignments_delete on public.assignments for delete to authenticated
  using ((select private.is_admin()));

-- roles / positions: admins see all; a member sees only the ones on their own assignments.
create policy roles_select on public.roles for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.assignments a
               where a.role_id = roles.id and a.member_id = (select private.current_member_id()))
  );
create policy roles_insert on public.roles for insert to authenticated
  with check ((select private.is_admin()));
create policy roles_update on public.roles for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy roles_delete on public.roles for delete to authenticated
  using ((select private.is_admin()));

create policy positions_select on public.positions for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.assignments a
               where a.position_id = positions.id and a.member_id = (select private.current_member_id()))
  );
create policy positions_insert on public.positions for insert to authenticated
  with check ((select private.is_admin()));
create policy positions_update on public.positions for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy positions_delete on public.positions for delete to authenticated
  using ((select private.is_admin()));

-- periods: admins see all; an active member sees the active period and the periods of their own
-- assignments. No DELETE grant at all.
create policy periods_select on public.periods for select to authenticated
  using (
    (select private.is_admin())
    or ((select private.current_member_id()) is not null and is_active)
    or exists (select 1 from public.assignments a
               where a.period_id = periods.id and a.member_id = (select private.current_member_id()))
  );
create policy periods_insert on public.periods for insert to authenticated
  with check ((select private.is_admin()));
create policy periods_update on public.periods for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- org_settings: every active member may read the organization name; admins update it.
create policy org_settings_select on public.org_settings for select to authenticated
  using ((select private.current_member_id()) is not null);
create policy org_settings_update on public.org_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- audit_log: admins read; nobody writes through the API (rows come from triggers only).
create policy audit_log_select on public.audit_log for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- Baseline data that every environment needs (not dev seed data)
-- ---------------------------------------------------------------------------------------------

insert into public.org_settings (org_name) values ('Persekutuan Mahasiswa Kristen ITERA');
