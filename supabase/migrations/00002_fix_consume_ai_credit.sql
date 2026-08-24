-- Fix ambiguous "used" in consume_ai_credit.
-- RETURNS TABLE(used integer) clashes with ai_usage.used in SET used = used + 1.
-- Run this in the Supabase SQL editor.

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
