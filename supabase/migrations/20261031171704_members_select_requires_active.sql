-- A deactivated member must see nothing, including their own profile row, so the app and RLS
-- agree on "inactive = no access" (other tables already go through private.current_member_id()).
drop policy members_select on public.members;
create policy members_select on public.members for select to authenticated
  using ((select private.is_admin()) or (user_id = (select auth.uid()) and is_active));
