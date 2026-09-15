-- Five Star Customer Support — Migration 002: Thread Model
-- Run this in your Supabase SQL editor AFTER 001_initial_schema.sql
--
-- This migration promotes conversation_id to the unique key on email_reviews,
-- moves per-message fields into a new email_messages child table,
-- and clears existing test data (Option B — no data migration).

-- ── Step 1: Clear existing test data ──
delete from audit_events;
delete from email_reviews;

-- ── Step 2: Create email_messages table ──
create table if not exists email_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  message_id text unique not null,

  received_at timestamptz not null default now(),
  current_email text not null default '',

  -- Full thread context (all messages in chronological order)
  thread jsonb not null default '{}'::jsonb,

  -- AI outputs (may be empty for new-flow cases that put evidence separately)
  understanding jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,

  -- Original AI-generated draft (immutable)
  original_draft_subject text not null default '',
  original_draft_body text not null default '',
  original_draft_status text not null default 'READY',

  -- Marks the most recent message in this thread
  is_latest boolean not null default false,

  created_at timestamptz not null default now()
);

-- ── Step 3: Indexes on email_messages ──
create index if not exists idx_email_messages_conversation_id
  on email_messages(conversation_id);

create index if not exists idx_email_messages_is_latest
  on email_messages(is_latest);

create index if not exists idx_email_messages_conversation_latest
  on email_messages(conversation_id, is_latest);

-- ── Step 4: RLS on email_messages ──
alter table email_messages enable row level security;

create policy "Allow all for service role" on email_messages
  for all using (true) with check (true);

-- ── Step 5: Restructure email_reviews ──

-- Drop the unique constraint on message_id
alter table email_reviews
  drop constraint if exists email_reviews_message_id_key;

-- Add unique constraint on conversation_id (now the thread identity)
alter table email_reviews
  add constraint email_reviews_conversation_id_key unique (conversation_id);

-- Remove per-message columns (now live in email_messages)
alter table email_reviews drop column if exists message_id;
alter table email_reviews drop column if exists current_email;
alter table email_reviews drop column if exists thread;
alter table email_reviews drop column if exists understanding;
alter table email_reviews drop column if exists evidence;
alter table email_reviews drop column if exists original_draft_subject;
alter table email_reviews drop column if exists original_draft_body;
alter table email_reviews drop column if exists original_draft_status;

-- ── Step 6: Drop the now-redundant message_id index ──
drop index if exists idx_email_reviews_message_id;
