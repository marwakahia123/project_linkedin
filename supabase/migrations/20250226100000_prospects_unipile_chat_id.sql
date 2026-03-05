-- Lien direct prospect <-> conversation Unipile (évite le matching par slug)
alter table public.prospects
  add column if not exists unipile_chat_id text;

comment on column public.prospects.unipile_chat_id is 'ID du chat Unipile créé lors de l''envoi du premier message';
create index if not exists prospects_unipile_chat_id_idx on public.prospects(user_id) where unipile_chat_id is not null;
