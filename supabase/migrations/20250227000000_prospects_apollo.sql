-- Colonnes Apollo pour l'enrichissement des prospects (emails, statut)
alter table public.prospects
  add column if not exists email text,
  add column if not exists email_status text,
  add column if not exists enriched_at timestamptz,
  add column if not exists phone text,
  add column if not exists apollo_id text;

comment on column public.prospects.email is 'Email trouvé via Apollo (enrichissement)';
comment on column public.prospects.email_status is 'Statut email Apollo: verified, guessed, unavailable';
comment on column public.prospects.enriched_at is 'Date de dernier enrichissement Apollo';
comment on column public.prospects.phone is 'Téléphone trouvé via Apollo';
comment on column public.prospects.apollo_id is 'ID Apollo du prospect';
