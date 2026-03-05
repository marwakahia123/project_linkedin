-- Templates de message par type (premier contact, relance, etc.)
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('premier_contact', 'relance', 'remerciement', 'cloture', 'autre')),
  label text,
  body text not null,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.message_templates is 'Templates de messages LinkedIn par type (premier contact, relance, etc.)';
comment on column public.message_templates.type is 'Type: premier_contact (invitation acceptée), relance, remerciement, cloture, autre';
comment on column public.message_templates.body is 'Contenu du template. Placeholders: {{first_name}}, {{last_name}}, {{company}}, {{job_title}}';

alter table public.message_templates enable row level security;

create policy "Users can manage own templates"
  on public.message_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists message_templates_user_id_idx on public.message_templates(user_id);
create index if not exists message_templates_user_type_idx on public.message_templates(user_id, type);
