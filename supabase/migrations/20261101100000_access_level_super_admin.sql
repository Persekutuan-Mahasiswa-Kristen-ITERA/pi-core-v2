-- Adds the super_admin access level. Kept in its own migration: a new enum value cannot be used in
-- the transaction that adds it, and the next migration uses it.
alter type public.access_level add value if not exists 'super_admin' before 'admin';
