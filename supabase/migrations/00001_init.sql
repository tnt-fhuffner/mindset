-- MindSet — schema, RLS, storage, realtime
-- Run this in the Supabase SQL editor (or via supabase db push).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and coalesce(is_blocked, false) = false
  );
$$;

create or replace function public.current_month_start()
returns date
language sql
immutable
as $$
  select date_trunc('month', timezone('utc', now()))::date;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuário',
  username text not null unique,
  avatar_url text,
  bio text,
  role text not null default 'user' check (role in ('admin', 'user')),
  is_blocked boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Mapa sem título',
  content jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private', 'public', 'unlisted')),
  share_token uuid not null default gen_random_uuid(),
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mind_maps_share_token_idx on public.mind_maps (share_token);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('pdf', 'ebook', 'article', 'link', 'image', 'map')),
  title text not null,
  description text,
  file_url text,
  file_path text,
  file_mime text,
  file_size integer,
  link_url text,
  mind_map_id uuid references public.mind_maps(id) on delete set null,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_a <> participant_b)
);

create unique index if not exists conversations_pair_idx
  on public.conversations (least(participant_a, participant_b), greatest(participant_a, participant_b));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 8000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('like', 'comment', 'follow', 'message', 'mention', 'report')),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'file', 'user', 'map')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed', 'removed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  used integer not null default 0,
  primary key (user_id, month)
);

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'generate',
  tokens integer,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists folders_owner_idx on public.folders (owner_id);
create index if not exists mind_maps_owner_idx on public.mind_maps (owner_id, updated_at desc);
create index if not exists mind_maps_public_idx on public.mind_maps (visibility, updated_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists mind_maps_updated_at on public.mind_maps;
create trigger mind_maps_updated_at
  before update on public.mind_maps
  for each row execute function public.set_updated_at();

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(
    split_part(new.email, '@', 1),
    '[^a-z0-9]',
    '',
    'g'
  ));
  if base_username is null or length(base_username) < 3 then
    base_username := 'user';
  end if;
  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, display_name, username, avatar_url, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    final_username,
    new.raw_user_meta_data->>'avatar_url',
    case
      when lower(new.email) = 'felipeqh.1991@gmail.com' then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the master email as admin even if the profile already exists.
create or replace function public.ensure_master_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set role = 'admin'
  from auth.users u
  where p.id = u.id
    and lower(u.email) = 'felipeqh.1991@gmail.com'
    and p.role <> 'admin';
end;
$$;

select public.ensure_master_admin();

create or replace function public.notify_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
begin
  select author_id into author from public.posts where id = new.post_id;
  if author is not null and author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (author, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created
  after insert on public.likes
  for each row execute function public.notify_like();

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author uuid;
  parent_author uuid;
begin
  select author_id into author from public.posts where id = new.post_id;
  if author is not null and author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
    values (author, new.user_id, 'comment', new.post_id, new.id);
  end if;
  if new.parent_id is not null then
    select user_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.user_id and parent_author <> author then
      insert into public.notifications (user_id, actor_id, type, post_id, comment_id)
      values (parent_author, new.user_id, 'comment', new.post_id, new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.notify_comment();

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created
  after insert on public.follows
  for each row execute function public.notify_follow();

create or replace function public.notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  insert into public.notifications (user_id, actor_id, type, payload)
  values (new.receiver_id, new.sender_id, 'message', jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_message();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if other_user = me then
    raise exception 'invalid participant';
  end if;

  select id into conv_id
  from public.conversations
  where (participant_a = me and participant_b = other_user)
     or (participant_a = other_user and participant_b = me);

  if conv_id is null then
    insert into public.conversations (participant_a, participant_b)
    values (me, other_user)
    returning id into conv_id;
  end if;

  return conv_id;
end;
$$;

create or replace function public.increment_download(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set download_count = download_count + 1
  where id = p_post_id;
end;
$$;

create or replace function public.consume_ai_credit(p_limit integer)
returns table(allowed boolean, used integer, monthly_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  month_start date := date_trunc('month', timezone('utc', now()))::date;
  current_used integer;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;

  insert into public.ai_usage as u (user_id, month, used)
  values (me, month_start, 0)
  on conflict (user_id, month) do nothing;

  select u.used into current_used
  from public.ai_usage as u
  where u.user_id = me and u.month = month_start
  for update;

  if current_used >= p_limit then
    return query select false, current_used, p_limit;
    return;
  end if;

  update public.ai_usage as u
  set used = u.used + 1
  where u.user_id = me and u.month = month_start
  returning u.used into current_used;

  insert into public.ai_events (user_id, kind) values (me, 'generate');

  return query select true, current_used, p_limit;
end;
$$;

create or replace function public.get_admin_metrics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start timestamptz := date_trunc('month', timezone('utc', now()));
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return json_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_blocked', (select count(*) from public.profiles where is_blocked),
    'users_active_30d', (
      select count(distinct owner_id) from (
        select owner_id from public.mind_maps where updated_at > now() - interval '30 days'
        union
        select author_id from public.posts where created_at > now() - interval '30 days'
      ) active
    ),
    'posts_total', (select count(*) from public.posts),
    'posts_month', (select count(*) from public.posts where created_at >= month_start),
    'maps_total', (select count(*) from public.mind_maps),
    'downloads_total', (select coalesce(sum(download_count), 0) from public.posts),
    'ai_used_month', (select coalesce(sum(used), 0) from public.ai_usage where month = month_start::date),
    'reports_open', (select count(*) from public.reports where status = 'open'),
    'comments_total', (select count(*) from public.comments)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.mind_maps enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_events enable row level security;

-- profiles
create policy "profiles_select" on public.profiles
  for select using (true);

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_blocked := old.is_blocked;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_admin_delete" on public.profiles
  for delete using (public.is_admin());

-- folders
create policy "folders_select_own" on public.folders
  for select using (owner_id = auth.uid() or public.is_admin());
create policy "folders_insert_own" on public.folders
  for insert with check (owner_id = auth.uid());
create policy "folders_update_own" on public.folders
  for update using (owner_id = auth.uid());
create policy "folders_delete_own" on public.folders
  for delete using (owner_id = auth.uid());

-- mind maps
create policy "maps_select" on public.mind_maps
  for select using (
    owner_id = auth.uid()
    or visibility in ('public', 'unlisted')
    or public.is_admin()
  );
create policy "maps_insert" on public.mind_maps
  for insert with check (owner_id = auth.uid());
create policy "maps_update" on public.mind_maps
  for update using (owner_id = auth.uid() or public.is_admin());
create policy "maps_delete" on public.mind_maps
  for delete using (owner_id = auth.uid() or public.is_admin());

-- posts
create policy "posts_select" on public.posts
  for select using (
    not exists (select 1 from public.profiles p where p.id = posts.author_id and p.is_blocked)
    or author_id = auth.uid()
    or public.is_admin()
  );
create policy "posts_insert" on public.posts
  for insert with check (author_id = auth.uid());
create policy "posts_update" on public.posts
  for update using (author_id = auth.uid() or public.is_admin());
create policy "posts_delete" on public.posts
  for delete using (author_id = auth.uid() or public.is_admin());

-- likes
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes for insert with check (user_id = auth.uid());
create policy "likes_delete" on public.likes for delete using (user_id = auth.uid() or public.is_admin());

-- comments
create policy "comments_select" on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (user_id = auth.uid());
create policy "comments_delete" on public.comments for delete using (user_id = auth.uid() or public.is_admin());

-- follows
create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (follower_id = auth.uid());
create policy "follows_delete" on public.follows for delete using (follower_id = auth.uid());

-- conversations
create policy "conversations_select" on public.conversations
  for select using (participant_a = auth.uid() or participant_b = auth.uid() or public.is_admin());
create policy "conversations_insert" on public.conversations
  for insert with check (participant_a = auth.uid() or participant_b = auth.uid());

-- messages
create policy "messages_select" on public.messages
  for select using (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());
create policy "messages_insert" on public.messages
  for insert with check (sender_id = auth.uid());
create policy "messages_update" on public.messages
  for update using (receiver_id = auth.uid());

-- notifications
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications_delete" on public.notifications
  for delete using (user_id = auth.uid());

-- reports
create policy "reports_insert" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_update" on public.reports
  for update using (public.is_admin());

-- ai usage
create policy "ai_usage_select" on public.ai_usage
  for select using (user_id = auth.uid() or public.is_admin());
create policy "ai_events_select" on public.ai_events
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'uploads',
    'uploads',
    true,
    10485760,
    array[
      'application/pdf',
      'application/epub+zip',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ]
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  )
on conflict (id) do nothing;

create policy "uploads_public_read"
  on storage.objects for select
  using (bucket_id in ('uploads', 'avatars'));

create policy "uploads_auth_insert"
  on storage.objects for insert
  with check (
    bucket_id in ('uploads', 'avatars')
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "uploads_own_update"
  on storage.objects for update
  using (
    bucket_id in ('uploads', 'avatars')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "uploads_own_delete"
  on storage.objects for delete
  using (
    bucket_id in ('uploads', 'avatars')
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.messages replica identity full;
alter table public.notifications replica identity full;
alter table public.likes replica identity full;
alter table public.comments replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.likes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.comments;
  exception when duplicate_object then null;
  end;
end $$;
