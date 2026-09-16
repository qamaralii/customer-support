import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { nanoid } from "nanoid";
import type { HITLPayload } from "@/lib/types";

// POST /api/email-reviews — Receive review case from Langflow Flow 1
// Thread model: one row in email_reviews per conversation_id,
// one row in email_messages per individual email (message_id).
export async function POST(request: NextRequest) {
  try {
    // Optional API key auth
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token !== apiKey) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const payload: HITLPayload = await request.json();

    // Validate required fields
    if (!payload.message_id) {
      return NextResponse.json(
        { success: false, error: "message_id is required" },
        { status: 400 }
      );
    }
    if (!payload.sender_email) {
      return NextResponse.json(
        { success: false, error: "sender_email is required" },
        { status: 400 }
      );
    }
    if (!payload.conversation_id) {
      return NextResponse.json(
        { success: false, error: "conversation_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ── Duplicate message check (message_id is unique across email_messages) ──
    const { data: existingMessage } = await supabase
      .from("email_messages")
      .select("id, conversation_id")
      .eq("message_id", payload.message_id)
      .maybeSingle();

    if (existingMessage) {
      // Find the review_id for this conversation
      const { data: existingReview } = await supabase
        .from("email_reviews")
        .select("review_id")
        .eq("conversation_id", existingMessage.conversation_id)
        .maybeSingle();

      return NextResponse.json(
        {
          success: false,
          error: "Duplicate message_id",
          existing_review_id: existingReview?.review_id || null,
        },
        { status: 409 }
      );
    }

    // ── Normalise payload — support both old and new flow structures ──
    const thread = payload.thread_context || payload.thread || {};
    const evidence = payload.investigation_evidence || payload.evidence || {};
    const understanding = payload.understanding || {};
    const senderName = payload.sender_name || payload.customer?.name || "";
    const requiresEscalation = !!(
      payload.requires_escalation ||
      (payload.understanding as { escalation_required?: boolean })?.escalation_required ||
      (evidence as { needs_escalation?: boolean })?.needs_escalation
    );
    const escalationReason =
      (evidence as { escalation_reason?: string })?.escalation_reason || null;
    const draftStatus = payload.draft?.draft_status || "READY";
    // Denormalise primary_intent onto email_reviews for fast queue display
    const primaryIntent =
      (understanding as { primary_intent?: string })?.primary_intent || "";

    // ── Check if a thread already exists for this conversation_id ──
    const { data: existingThread } = await supabase
      .from("email_reviews")
      .select("review_id, conversation_id")
      .eq("conversation_id", payload.conversation_id)
      .maybeSingle();

    if (existingThread) {
      // ── CASE B: Existing thread — new email arrived ──

      // Mark all previous messages in this thread as not-latest
      await supabase
        .from("email_messages")
        .update({ is_latest: false })
        .eq("conversation_id", payload.conversation_id);

      // Insert the new message
      await supabase.from("email_messages").insert({
        conversation_id: payload.conversation_id,
        message_id: payload.message_id,
        received_at: payload.received_at || new Date().toISOString(),
        current_email: payload.current_email || "",
        thread: thread,
        understanding: understanding,
        evidence: evidence,
        original_draft_subject: payload.draft?.subject || "",
        original_draft_body: payload.draft?.body || "",
        original_draft_status: draftStatus,
        is_latest: true,
      });

      // Update the thread row — reopen regardless of previous status
      await supabase
        .from("email_reviews")
        .update({
          sender_name: senderName,
          subject: payload.subject || "",
          received_at: payload.received_at || new Date().toISOString(),
          final_draft_subject: payload.draft?.subject || "",
          final_draft_body: payload.draft?.body || "",
          draft_status: draftStatus,
          review_status: "AWAITING_HUMAN_REVIEW",
          requires_escalation: requiresEscalation,
          escalation_reason: escalationReason,
          primary_intent: primaryIntent,
          send_error: null,
        })
        .eq("conversation_id", payload.conversation_id);

      // Audit event
      await supabase.from("audit_events").insert({
        review_id: existingThread.review_id,
        event_type: "EMAIL_UPDATED",
        actor: "langflow",
        metadata: {
          message_id: payload.message_id,
          draft_status: draftStatus,
          requires_escalation: requiresEscalation,
        },
      });

      return NextResponse.json(
        {
          success: true,
          review_id: existingThread.review_id,
          status: "AWAITING_HUMAN_REVIEW",
        },
        { status: 200 }
      );
    } else {
      // ── CASE A: New thread ──
      const reviewId = `REV-${nanoid(10)}`;

      // Insert thread row
      const { error: threadError } = await supabase
        .from("email_reviews")
        .insert({
          review_id: reviewId,
          conversation_id: payload.conversation_id,
          sender_email: payload.sender_email,
          sender_name: senderName,
          subject: payload.subject || "",
          received_at: payload.received_at || new Date().toISOString(),
          final_draft_subject: payload.draft?.subject || "",
          final_draft_body: payload.draft?.body || "",
          draft_status: draftStatus,
          review_status: "AWAITING_HUMAN_REVIEW",
          requires_escalation: requiresEscalation,
          escalation_reason: escalationReason,
          primary_intent: primaryIntent,
        });

      if (threadError) {
        console.error("Thread insert error:", threadError);
        return NextResponse.json(
          { success: false, error: threadError.message },
          { status: 500 }
        );
      }

      // Insert first message
      const { error: msgError } = await supabase
        .from("email_messages")
        .insert({
          conversation_id: payload.conversation_id,
          message_id: payload.message_id,
          received_at: payload.received_at || new Date().toISOString(),
          current_email: payload.current_email || "",
          thread: thread,
          understanding: understanding,
          evidence: evidence,
          original_draft_subject: payload.draft?.subject || "",
          original_draft_body: payload.draft?.body || "",
          original_draft_status: draftStatus,
          is_latest: true,
        });

      if (msgError) {
        console.error("Message insert error:", msgError);
        // Clean up the thread row
        await supabase
          .from("email_reviews")
          .delete()
          .eq("review_id", reviewId);
        return NextResponse.json(
          { success: false, error: msgError.message },
          { status: 500 }
        );
      }

      // Audit event
      await supabase.from("audit_events").insert({
        review_id: reviewId,
        event_type: "CASE_RECEIVED",
        actor: "langflow",
        metadata: {
          message_id: payload.message_id,
          conversation_id: payload.conversation_id,
          draft_status: draftStatus,
          requires_escalation: requiresEscalation,
        },
      });

      return NextResponse.json(
        {
          success: true,
          review_id: reviewId,
          status: "AWAITING_HUMAN_REVIEW",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("POST /api/email-reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/email-reviews — List review cases (queue)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = (page - 1) * limit;

    const status = searchParams.get("status");
    const draftStatus = searchParams.get("draft_status");
    const escalation = searchParams.get("escalation");
    const assignee = searchParams.get("assignee");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "received_at";
    const order = searchParams.get("order") || "desc";

    const supabase = createServerClient();

    // Build query — include message count via subquery
    let query = supabase
      .from("email_reviews")
      .select(
        `id, review_id, conversation_id, sender_email, sender_name, subject,
         received_at, primary_intent, draft_status, review_status, requires_escalation,
         assigned_to, assigned_at, reviewed_by, reviewed_at,
         sent_at, send_error, created_at, updated_at, escalation_reason,
         message_count:email_messages(count)`,
        { count: "exact" }
      );

    if (status) query = query.eq("review_status", status);
    if (draftStatus) query = query.eq("draft_status", draftStatus);
    if (escalation === "true") query = query.eq("requires_escalation", true);
    if (assignee) query = query.eq("assigned_to", assignee);
    if (search) {
      query = query.or(
        `sender_email.ilike.%${search}%,sender_name.ilike.%${search}%,subject.ilike.%${search}%`
      );
    }

    const ascending = order === "asc";
    query = query.order(sort, { ascending }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("GET /api/email-reviews error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Normalise message_count from Supabase aggregate shape [{count: N}] → N
    const rows = (data || []).map((row) => ({
      ...row,
      message_count:
        Array.isArray(row.message_count)
          ? (row.message_count[0] as { count: number })?.count ?? 0
          : (row.message_count ?? 0),
    }));

    return NextResponse.json({
      data: rows,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/email-reviews error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
