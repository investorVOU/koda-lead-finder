-- Persistent, non-secret metadata for a Studio project's Vercel custom domain.
-- Existing domain_status/domain_verified columns are retained for backwards
-- compatibility; the Studio hosting flow uses the explicit custom_* names.

alter table public.studio_projects
  add column if not exists custom_domain_status text,
  add column if not exists custom_domain_verified boolean not null default false;

update public.studio_projects
set
  custom_domain_status = coalesce(custom_domain_status, domain_status),
  custom_domain_verified = case
    when custom_domain_verified then true
    else coalesce(domain_verified, false)
  end
where custom_domain is not null;

alter table public.studio_projects
  drop constraint if exists studio_projects_custom_domain_status_check;

alter table public.studio_projects
  add constraint studio_projects_custom_domain_status_check
  check (
    custom_domain_status is null
    or custom_domain_status in ('pending', 'configuring', 'connected', 'error')
  );

create index if not exists studio_projects_custom_domain_idx
  on public.studio_projects (custom_domain)
  where custom_domain is not null;
