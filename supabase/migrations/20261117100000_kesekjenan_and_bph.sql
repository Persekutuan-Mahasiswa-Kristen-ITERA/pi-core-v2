-- Kesekjenan and BPH (owner decision, 2026-11-17).
--
-- At PMK ITERA "BPH" means ALL pengurus. Ketua Umum, Sekretaris Jenderal, Sekretaris Umum and
-- Bendahara Umum are the "Kesekjenan". The baseline called the latter group BPH; this fixes the names.
--
--   * unit "BPH PMK ITERA"  -> "Kesekjenan"   (only if it still has the baseline name)
--   * role key 'bph'        -> name "Kesekjenan" (the six Kesekjenan positions, unchanged)
--   * NEW role key 'pengurus' named "BPH": every position, now and later (trigger below).
--
-- Technical keys stay as they are on purpose: the unit type enum value 'bph' and the role key 'bph'
-- are used by PMK-NEXUS (access rules, unit filters, SQL functions). Renaming them would break NEXUS,
-- and giving role key 'bph' to every position would hand every Staff the Kesekjenan permissions in
-- NEXUS (finance, letters, minutes). The new 'pengurus' role grants nothing anywhere.

update public.org_units
set name = 'Kesekjenan'
where type = 'bph' and name = 'BPH PMK ITERA';

update public.roles
set name = 'Kesekjenan',
    description = 'Ketua Umum, Sekretaris Jenderal, Sekretaris Umum dan Bendahara Umum.'
where key = 'bph';

insert into public.roles (key, name, description, sort_order, is_system, grants_admin)
values ('pengurus', 'BPH', 'Semua pengurus PMK ITERA (Badan Pengurus Harian).', 15, true, false);

insert into public.position_roles (position_id, role_id)
select p.id, r.id
from public.positions p
cross join public.roles r
where r.key = 'pengurus'
on conflict do nothing;

-- Every new position is a pengurus position. An admin can still take the role off a position.
create function private.position_add_pengurus_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.position_roles (position_id, role_id)
  select new.id, r.id from public.roles r where r.key = 'pengurus'
  on conflict do nothing;
  return new;
end
$$;
revoke all on function private.position_add_pengurus_role() from public, anon, authenticated;

create trigger positions_add_pengurus_role
after insert on public.positions
for each row execute function private.position_add_pengurus_role();
