-- Rollback Phase 1 organization tables (staging only)

drop table if exists public.organization_invitations;
drop table if exists public.activity_logs;
drop table if exists public.organization_members;
drop table if exists public.organizations;

drop type if exists public.org_member_status;
drop type if exists public.org_member_role;