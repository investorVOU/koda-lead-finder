create table if not exists public.studio_credit_usage (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  project_id uuid null
    references public.studio_projects(id)
    on delete set null,

  action text not null
    check (
      action in (
        'website_build',
        'ai_edit'
      )
    ),

  credits integer not null
    check (credits > 0),

  created_at timestamptz not null
    default now()
);

create index if not exists
  studio_credit_usage_user_created_idx
on public.studio_credit_usage (
  user_id,
  created_at desc
);

create index if not exists
  studio_credit_usage_project_idx
on public.studio_credit_usage (
  project_id
);

alter table public.studio_credit_usage
enable row level security;

drop policy if exists
  "Users can view own studio credit usage"
on public.studio_credit_usage;

create policy
  "Users can view own studio credit usage"
on public.studio_credit_usage
for select
to authenticated
using (
  auth.uid() = user_id
);

revoke insert, update, delete
on public.studio_credit_usage
from anon, authenticated;

grant select
on public.studio_credit_usage
to authenticated;

grant all
on public.studio_credit_usage
to service_role;


create or replace function public.consume_studio_credits(
  p_user_id uuid,
  p_project_id uuid,
  p_action text,
  p_cost integer,
  p_limit integer default null
)
returns table (
  success boolean,
  usage_id uuid,
  used integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer := 0;
  v_usage_id uuid;
begin
  if p_cost <= 0 then
    raise exception 'Studio credit cost must be greater than zero';
  end if;

  if p_action not in (
    'website_build',
    'ai_edit'
  ) then
    raise exception 'Invalid Studio credit action';
  end if;

  /*
   * Lock the user's subscription row so two builds
   * cannot spend the same remaining credits simultaneously.
   */
  perform 1
  from public.subscriptions
  where user_id = p_user_id
  for update;

  select
    coalesce(sum(credits), 0)::integer
  into v_used
  from public.studio_credit_usage
  where user_id = p_user_id
    and created_at >= date_trunc(
      'month',
      now()
    );

  if p_limit is not null
    and v_used + p_cost > p_limit
  then
    return query
    select
      false,
      null::uuid,
      v_used,
      greatest(
        p_limit - v_used,
        0
      );

    return;
  end if;

  insert into public.studio_credit_usage (
    user_id,
    project_id,
    action,
    credits
  )
  values (
    p_user_id,
    p_project_id,
    p_action,
    p_cost
  )
  returning id
  into v_usage_id;

  v_used := v_used + p_cost;

  return query
  select
    true,
    v_usage_id,
    v_used,
    case
      when p_limit is null
        then null::integer
      else greatest(
        p_limit - v_used,
        0
      )
    end;
end;
$$;

revoke all
on function public.consume_studio_credits(
  uuid,
  uuid,
  text,
  integer,
  integer
)
from public, anon, authenticated;

grant execute
on function public.consume_studio_credits(
  uuid,
  uuid,
  text,
  integer,
  integer
)
to service_role;
