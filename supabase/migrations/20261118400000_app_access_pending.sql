-- Integrations page: also show who matches a rule but cannot use the app yet (D-16).
-- A member still on a temporary password matches nothing (unchanged); the page now lists them
-- separately as "waiting for their first login" so admins see why someone is missing.
--
-- private.app_rules_matching()   the rule evaluation, for any ACTIVE member (no password check)
-- private.app_rules_for_member()  same signature as before: matching AND temporary password done
-- public.app_access_pending()     admins only: active members on a temporary password who match

create function private.app_rules_matching(p_app text, p_member_id uuid)
returns table (rule_id uuid, app_role_key text)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.app_role_key
  from public.app_access_rules r
  join public.members m on m.id = p_member_id and m.is_active
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
revoke all on function private.app_rules_matching(text, uuid) from public, anon, authenticated;

create or replace function private.app_rules_for_member(p_app text, p_member_id uuid)
returns table (rule_id uuid, app_role_key text)
language sql stable security definer set search_path = ''
as $$
  select x.rule_id, x.app_role_key
  from private.app_rules_matching(p_app, p_member_id) x
  where exists (select 1 from public.members m where m.id = p_member_id and not m.must_change_password)
$$;
revoke all on function private.app_rules_for_member(text, uuid) from public, anon, authenticated;

create function public.app_access_pending(p_app text)
returns table (member_id uuid, full_name text, email text, app_role_key text, never_signed_in boolean)
language sql stable security definer set search_path = ''
as $$
  select distinct m.id, m.full_name, m.email, x.app_role_key,
         coalesce((select au.last_sign_in_at is null from auth.users au where au.id = m.user_id), true)
  from public.members m
  cross join lateral private.app_rules_matching(p_app, m.id) x
  where private.is_admin() and m.must_change_password
  order by m.full_name, x.app_role_key
$$;
revoke all on function public.app_access_pending(text) from public, anon;
grant execute on function public.app_access_pending(text) to authenticated;
