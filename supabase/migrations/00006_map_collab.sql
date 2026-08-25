alter table public.mind_maps
  add column if not exists collaborative boolean not null default false;

alter table public.mind_maps replica identity full;

drop policy if exists "maps_update" on public.mind_maps;
create policy "maps_update" on public.mind_maps
  for update
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or (
      collaborative = true
      and visibility in ('public', 'unlisted')
      and auth.uid() is not null
    )
  )
  with check (
    owner_id = auth.uid()
    or public.is_admin()
    or (
      collaborative = true
      and visibility in ('public', 'unlisted')
      and auth.uid() is not null
    )
  );

create or replace function public.protect_map_collab()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.owner_id = auth.uid() or public.is_admin() then
    return new;
  end if;
  new.owner_id := old.owner_id;
  new.share_token := old.share_token;
  new.folder_id := old.folder_id;
  new.collaborative := old.collaborative;
  new.visibility := old.visibility;
  return new;
end;
$$;

drop trigger if exists protect_map_collab on public.mind_maps;
create trigger protect_map_collab
  before update on public.mind_maps
  for each row execute function public.protect_map_collab();

do $$
begin
  begin
    alter publication supabase_realtime add table public.mind_maps;
  exception when duplicate_object then null;
  end;
end $$;
