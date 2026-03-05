-- Migration pour Unipile : account_id et simplification linkedin_sessions
-- unipile_account_id est la source de vérité pour les opérations API Unipile
-- encrypted_email/password deviennent optionnels (connexion via Unipile)

alter table public.linkedin_sessions
  add column if not exists unipile_account_id text;

alter table public.linkedin_sessions
  alter column encrypted_email drop not null,
  alter column encrypted_password drop not null;

comment on column public.linkedin_sessions.unipile_account_id is 'ID du compte Unipile (LinkedIn connecté via Unipile)';
