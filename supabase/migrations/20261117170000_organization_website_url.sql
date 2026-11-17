-- Public website used for initial Retell knowledge base ingestion per org

alter table public.organizations
  add column if not exists website_url text;