alter table public.prospects
  add column if not exists email_sent_at timestamptz;

comment on column public.prospects.email_sent_at is 'Date d''envoi du premier email au prospect';
