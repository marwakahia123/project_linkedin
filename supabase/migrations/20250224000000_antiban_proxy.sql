-- Colonnes anti-ban et proxy pour linkedin_sessions
alter table public.linkedin_sessions
  add column if not exists account_restricted boolean not null default false,
  add column if not exists first_invitation_at timestamptz,
  add column if not exists proxy_host text,
  add column if not exists proxy_port integer,
  add column if not exists proxy_username text,
  add column if not exists proxy_password text;

comment on column public.linkedin_sessions.account_restricted is 'True si LinkedIn a restreint le compte (vérification identité, etc.)';
comment on column public.linkedin_sessions.first_invitation_at is 'Date de la première invitation envoyée (pour warm-up progressif)';
comment on column public.linkedin_sessions.proxy_host is 'Proxy résidentiel : host';
comment on column public.linkedin_sessions.proxy_port is 'Proxy résidentiel : port';
comment on column public.linkedin_sessions.proxy_username is 'Proxy résidentiel : username (optionnel)';
comment on column public.linkedin_sessions.proxy_password is 'Proxy résidentiel : password (optionnel)';
