-- In-app + e-mail: seguidores avisados em post novo; preferências de e-mail.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'comment', 'follow', 'message', 'mention', 'report', 'post'));

alter table public.profiles
  add column if not exists notify_email_posts boolean not null default true;

alter table public.profiles
  add column if not exists notify_email_messages boolean not null default true;

create index if not exists follows_following_idx on public.follows (following_id);

create or replace function public.notify_followers_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, actor_id, type, post_id)
  select f.follower_id, new.author_id, 'post', new.id
  from public.follows f
  join public.profiles p on p.id = f.follower_id
  where f.following_id = new.author_id
    and coalesce(p.is_blocked, false) = false;
  return new;
end;
$$;

drop trigger if exists on_post_created_notify on public.posts;
create trigger on_post_created_notify
  after insert on public.posts
  for each row execute function public.notify_followers_on_post();
