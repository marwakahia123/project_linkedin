-- Table des sessions LinkedIn (identifiants chiffrés + cookies)
create table if not exists public.linkedin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  encrypted_email text not null,
  encrypted_password text not null,
  cookies jsonb,
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.linkedin_sessions enable row level security;

create policy "Users can manage own linkedin session"
  on public.linkedin_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index
create index if not exists linkedin_sessions_user_id_idx on public.linkedin_sessions(user_id);
