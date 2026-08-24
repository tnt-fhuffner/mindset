-- Cover/thumbnail for feed posts.
alter table public.posts
  add column if not exists thumbnail_url text;
