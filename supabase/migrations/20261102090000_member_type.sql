-- Members are students (mahasiswa, identified by NIM) or lecturers (dosen, identified by NIP/NIDN).
-- The pembina is a lecturer: they can hold any access level (typically super admin) but no organizational
-- position, since positions belong to the student pengurus.

create type public.member_type as enum ('student', 'lecturer');

alter table public.members
  add column member_type public.member_type not null default 'student',
  -- NIP is 18 digits; NIDN/NIDK 10; allow the range so an internal staff number also fits.
  add column nip text check (nip ~ '^[0-9]{8,20}$'),
  add constraint members_identifier_matches_type
    check ((member_type = 'student' and nip is null) or (member_type = 'lecturer' and nim is null));

create unique index members_nip_key on public.members (nip) where nip is not null;

comment on column public.members.member_type is 'student (mahasiswa, NIM) or lecturer (dosen, NIP/NIDN).';

grant insert (member_type, nip), update (member_type, nip) on public.members to authenticated;

-- Assignments are for students. Same structure as before; a lecturer is rejected like an inactive member.
create or replace function private.assignment_member_active()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  m_active boolean;
  m_type   public.member_type;
begin
  if tg_op = 'UPDATE'
     and new.member_id = old.member_id and new.org_unit_id = old.org_unit_id
     and new.position_id = old.position_id and new.period_id = old.period_id then
    return new;
  end if;
  select m.is_active, m.member_type into m_active, m_type from public.members m where m.id = new.member_id;
  if not coalesce(m_active, false) then
    raise exception 'Member is not active' using errcode = 'P0001', hint = 'member_inactive';
  end if;
  if m_type = 'lecturer' then
    raise exception 'Lecturers do not hold organizational positions' using errcode = 'P0001', hint = 'member_lecturer';
  end if;
  return new;
end
$$;
