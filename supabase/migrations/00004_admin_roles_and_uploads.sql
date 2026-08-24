-- Allow the service role (admin API) to set profile roles.
-- Without this, creating a user as admin silently stayed as "user".
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.role := old.role;
  new.is_blocked := old.is_blocked;
  return new;
end;
$$;

-- Ensure the public uploads bucket accepts PDFs up to 10 MB.
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'application/epub+zip',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ]
where id = 'uploads';
