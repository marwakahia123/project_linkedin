-- Suivi de l'envoi du premier message (IA) aux prospects connectés
alter table public.prospects
  add column if not exists first_message_sent_at timestamptz;

comment on column public.prospects.first_message_sent_at is 'Date d''envoi du premier message au prospect connecté';
