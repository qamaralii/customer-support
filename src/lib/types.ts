// ── Langflow HITL Payload (what arrives from Flow 1) ──
// Supports both the original payload structure and the updated flow structure.

export interface HITLPayload {
  message_id: string;
  conversation_id: string;
  connected_account_id?: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  received_at: string;
  current_email: string;

  // Customer object (new flow)
  customer?: { name: string; email: string };

  // Thread — "thread_context" in new flow, "thread" in old flow
  thread_context?: ThreadContext;
  thread?: ThreadContext;

  // Understanding — present in old flow, absent in new flow
  understanding?: EmailUnderstanding;

  // Evidence — "investigation_evidence" in new flow, "evidence" in old flow
  investigation_evidence?: Evidence;
  evidence?: Evidence;

  // Draft
  draft: Draft;

  requires_escalation?: boolean;
  review_status: string;
}

export interface ThreadContext {
  history_status: string;
  prior_message_count: number;
  messages: ThreadMessage[];
  // Extra fields in new flow
  subject?: string;
  received_at?: string;
  body_text?: string;
}

export interface ThreadMessage {
  message_id: string;
  direction: "INBOUND" | "OUTBOUND_SUPPORT" | "CURRENT_INBOUND";
  sender_email: string;
  sender_name: string;
  subject: string;
  received_at: string;
  body_text: string;
  source_folder?: string;
  is_current?: boolean;
  sequence?: number;
}

export interface EmailUnderstanding {
  primary_intent: string;
  secondary_intents: string[];
  latest_customer_request: string;
  unresolved_questions: string[];
  tone: "NEUTRAL" | "POLITE" | "CONCERNED" | "FRUSTRATED" | "ANGRY";
  urgency: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  escalation_required: boolean;
  identifiers: Identifiers;
  identifier_conflicts: IdentifierConflict[];
  reason: string;
}

export interface Identifiers {
  customer_id: string | null;
  loan_id: string | null;
  application_id: string | null;
  transaction_reference: string | null;
  other_identifiers: Array<{ type: string; value: string }>;
}

export interface IdentifierConflict {
  type: string;
  values: string[];
}

export interface Evidence {
  verified_facts: string[];
  unverified_inferences: string[];
  customer_safe_facts: string[];
  missing_information: string[];
  conflicts: string[];
  needs_escalation: boolean;
  escalation_reason: string;
  summary: string;
}

export interface Draft {
  subject: string;
  body: string;
  draft_status: DraftStatus;
}

// ── Status enums ──

export type DraftStatus = "READY" | "NEEDS_CLARIFICATION" | "ESCALATE";

export type ReviewStatus =
  | "PROCESSING"
  | "AWAITING_HUMAN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SENDING"
  | "SENT"
  | "FAILED";

// ── Per-message record (child of email_reviews, keyed by conversation_id) ──

export interface EmailMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  received_at: string;
  current_email: string;
  // thread contains all messages (INBOUND, OUTBOUND_SUPPORT, CURRENT_INBOUND)
  thread: ThreadContext | Record<string, never>;
  // understanding may be empty {} for new-flow cases
  understanding: EmailUnderstanding | Record<string, never>;
  // evidence stores investigation_evidence (normalised on ingest)
  evidence: Evidence | Record<string, never>;
  original_draft_subject: string;
  original_draft_body: string;
  original_draft_status: DraftStatus;
  is_latest: boolean;
  created_at: string;
}

// ── Thread-level review row (email_reviews table) ──

export interface EmailReviewRow {
  id: string;
  review_id: string;
  conversation_id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  received_at: string;          // updated to latest email's received_at on each new message
  primary_intent: string;       // denormalised from latest message's understanding.primary_intent
  final_draft_subject: string;
  final_draft_body: string;
  draft_status: DraftStatus;
  review_status: ReviewStatus;
  requires_escalation: boolean;
  assigned_to: string | null;
  assigned_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  escalation_reason: string | null;
  send_error: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;

  // Populated by the detail endpoint (join from email_messages where is_latest = true)
  latest_message?: EmailMessage;

  // Populated by the list endpoint (count from email_messages)
  message_count?: number;
}

// ── Audit events ──

export type AuditEventType =
  | "CASE_RECEIVED"
  | "EMAIL_UPDATED"
  | "ASSIGNED"
  | "DRAFT_EDITED"
  | "DRAFT_SAVED"
  | "DRAFT_RESET"
  | "ESCALATED"
  | "REJECTED"
  | "APPROVED"
  | "SEND_STARTED"
  | "SEND_SUCCEEDED"
  | "SEND_FAILED";

export interface AuditEvent {
  id: string;
  review_id: string;
  event_type: AuditEventType;
  actor: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── API response shapes ──

export interface ReviewListResponse {
  data: EmailReviewRow[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewCreateResponse {
  success: boolean;
  review_id: string;
  status: ReviewStatus;
}

export interface ReviewDetailResponse extends EmailReviewRow {
  audit_events: AuditEvent[];
}

// ── Queue stats ──

export interface QueueStats {
  pending_review: number;
  escalated: number;
  sent_today: number;
  failed_sends: number;
}

// ── Helpers: read from latest_message (detail view) or row directly (list view) ──

export function resolveEvidence(row: EmailReviewRow): Evidence | null {
  const msg = row.latest_message;
  if (msg) {
    const ev = msg.evidence as Evidence | undefined;
    if (ev && typeof ev === "object" && "summary" in ev) return ev;
    return null;
  }
  return null;
}

export function resolveThread(row: EmailReviewRow): ThreadContext | null {
  const msg = row.latest_message;
  if (msg) {
    const t = msg.thread as ThreadContext | undefined;
    if (t && typeof t === "object" && "messages" in t) return t;
    return null;
  }
  return null;
}

export function resolveUnderstanding(row: EmailReviewRow): EmailUnderstanding | null {
  const msg = row.latest_message;
  if (msg) {
    const u = msg.understanding as EmailUnderstanding | undefined;
    if (u && typeof u === "object" && "primary_intent" in u) return u;
    return null;
  }
  return null;
}

export function resolveCurrentEmail(row: EmailReviewRow): string {
  return row.latest_message?.current_email || "";
}

export function resolveOriginalDraft(row: EmailReviewRow): {
  subject: string;
  body: string;
  status: DraftStatus;
} {
  const msg = row.latest_message;
  return {
    subject: msg?.original_draft_subject || "",
    body: msg?.original_draft_body || "",
    status: (msg?.original_draft_status as DraftStatus) || "READY",
  };
}
