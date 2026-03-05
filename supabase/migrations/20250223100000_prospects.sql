-- Table des prospects (recherche LinkedIn + campagnes)
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  full_name text not null,
  job_title text,
  company text,
  linkedin_url text,
  profile_photo text,
  status text not null default 'new' check (status in ('new', 'invited', 'connected', 'ignored')),
  campaign_id uuid,
  created_at timestamptz default now()
);

-- RLS
alter table public.prospects enable row level security;

create policy "Users can manage own prospects"
  on public.prospects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index pour dédoublonnage et listes
create index if not exists prospects_user_id_idx on public.prospects(user_id);
create index if not exists prospects_linkedin_url_idx on public.prospects(user_id, linkedin_url);
create index if not exists prospects_status_idx on public.prospects(user_id, status);
