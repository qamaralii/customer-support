-- Five Star Customer Support - Email Reviews Schema
-- Run this in your Supabase SQL editor

-- ── email_reviews table ──
create table if not exists email_reviews (
  id uuid primary key default gen_random_uuid(),
  review_id text unique not null,
  message_id text unique not null,
  conversation_id text not null,

  sender_email text not null,
  sender_name text not null default '',
  subject text not null default '',
  received_at timestamptz not null default now(),
  current_email text not null default '',

  thread jsonb not null default '{}'::jsonb,
  understanding jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,

  -- Original AI draft (immutable after creation)
  original_draft_subject text not null default '',
  original_draft_body text not null default '',
  original_draft_status text not null default 'READY',

  -- Final/edited draft (mutable)
  final_draft_subject text not null default '',
  final_draft_body text not null default '',

  -- Status fields
  draft_status text not null default 'READY',
  review_status text not null default 'AWAITING_HUMAN_REVIEW',

  requires_escalation boolean not null default false,

  -- Assignment
  assigned_to text,
  assigned_at timestamptz,

  -- Review decision
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  escalation_reason text,

  -- Send tracking
  send_error text,
  sent_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── audit_events table ──
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  review_id text not null references email_reviews(review_id) on delete cascade,
  event_type text not null,
  actor text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Indexes ──
create index if not exists idx_email_reviews_review_status on email_reviews(review_status);
create index if not exists idx_email_reviews_draft_status on email_reviews(draft_status);
create index if not exists idx_email_reviews_requires_escalation on email_reviews(requires_escalation);
create index if not exists idx_email_reviews_assigned_to on email_reviews(assigned_to);
create index if not exists idx_email_reviews_received_at on email_reviews(received_at desc);
create index if not exists idx_email_reviews_created_at on email_reviews(created_at desc);
create index if not exists idx_email_reviews_message_id on email_reviews(message_id);
create index if not exists idx_audit_events_review_id on audit_events(review_id);
create index if not exists idx_audit_events_created_at on audit_events(created_at desc);

-- ── Auto-update updated_at ──
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on email_reviews;
create trigger set_updated_at
  before update on email_reviews
  for each row
  execute function update_updated_at_column();

-- ── Row Level Security ──
-- For V1 we enable RLS but allow all access via service role key
alter table email_reviews enable row level security;
alter table audit_events enable row level security;

-- Allow all operations for authenticated/service role
create policy "Allow all for service role" on email_reviews
  for all using (true) with check (true);

create policy "Allow all for service role" on audit_events
  for all using (true) with check (true);
