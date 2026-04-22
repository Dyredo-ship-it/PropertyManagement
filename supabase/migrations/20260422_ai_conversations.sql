-- ============================================================
-- Migration: AI assistant conversation history
-- One conversation per "thread"; messages are stored as plain text so
-- we can re-render the chat without re-running the LLM.
-- Run in Supabase → SQL Editor → New query → Run.
-- ============================================================

create table if not exists ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx on ai_conversations(user_id, last_message_at desc);

create table if not exists ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null default '',
  tool_events jsonb not null default '[]'::jsonb,
  write_outcome jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_conv_idx on ai_messages(conversation_id, created_at);

-- RLS: each user can only read/write their own conversations and messages.
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

drop policy if exists "ai_conversations_own" on ai_conversations;
create policy "ai_conversations_own" on ai_conversations
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and organization_id = current_org_id());

drop policy if exists "ai_messages_own" on ai_messages;
create policy "ai_messages_own" on ai_messages
  for all
  using (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
