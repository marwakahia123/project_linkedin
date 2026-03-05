-- Date d'envoi de l'invitation (pour limite quotidienne)
alter table public.prospects
  add column if not exists invited_at timestamptz;

create index if not exists prospects_invited_at_idx on public.prospects(user_id, invited_at);
