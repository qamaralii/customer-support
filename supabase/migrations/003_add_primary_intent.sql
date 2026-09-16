-- Migration 003: Add primary_intent to email_reviews for queue display
-- Run this in your Supabase SQL editor

alter table email_reviews
  add column if not exists primary_intent text not null default '';

create index if not exists idx_email_reviews_primary_intent
  on email_reviews(primary_intent);
