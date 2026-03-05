-- Table pour stocker les conversations LinkedIn synchronisées via Unipile
create table if not exists public.linkedin_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  unipile_chat_id text not null,
  prospect_id uuid references public.prospects(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, unipile_chat_id)
);

create table if not exists public.linkedin_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.linkedin_conversations(id) on delete cascade not null,
  unipile_message_id text,
  sender_provider_id text,
  body text,
  role text check (role in ('user', 'prospect', 'system')),
  created_at timestamptz default now()
);

create index if not exists linkedin_conversations_user_id_idx on public.linkedin_conversations(user_id);
create index if not exists linkedin_messages_conversation_id_idx on public.linkedin_messages(conversation_id);

alter table public.linkedin_conversations enable row level security;
alter table public.linkedin_messages enable row level security;

create policy "Users can manage own conversations"
  on public.linkedin_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own messages via conversation"
  on public.linkedin_messages for all
  using (
    exists (
      select 1 from public.linkedin_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.linkedin_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
