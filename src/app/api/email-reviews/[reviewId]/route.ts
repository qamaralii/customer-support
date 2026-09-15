import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ reviewId: string }> };

const SENDING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/email-reviews/[reviewId] — Full case detail with latest message
// Also enforces the SENDING timeout inline.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const supabase = createServerClient();

    const { data: review, error } = await supabase
      .from("email_reviews")
      .select("*")
      .eq("review_id", reviewId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!review) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    // ── Sending timeout check ──
    if (review.review_status === "SENDING") {
      const updatedAt = new Date(review.updated_at).getTime();
      const elapsed = Date.now() - updatedAt;
      if (elapsed > SENDING_TIMEOUT_MS) {
        const timeoutError = `Send timed out after ${Math.round(elapsed / 60000)} minute(s) with no confirmation from Flow 2`;

        await supabase
          .from("email_reviews")
          .update({ review_status: "FAILED", send_error: timeoutError })
          .eq("review_id", reviewId);

        await supabase.from("audit_events").insert({
          review_id: reviewId,
          event_type: "SEND_FAILED",
          actor: "system",
          metadata: { error: timeoutError, timed_out: true },
        });

        // Re-fetch after timeout update
        const { data: timedOut } = await supabase
          .from("email_reviews")
          .select("*")
          .eq("review_id", reviewId)
          .single();

        return NextResponse.json(
          await buildDetailResponse(supabase, timedOut!, reviewId)
        );
      }
    }

    return NextResponse.json(
      await buildDetailResponse(supabase, review, reviewId)
    );
  } catch (error) {
    console.error("GET /api/email-reviews/[reviewId] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildDetailResponse(supabase: any, review: any, reviewId: string) {
  // Fetch latest message for this conversation
  const { data: latestMessage } = await supabase
    .from("email_messages")
    .select("*")
    .eq("conversation_id", review.conversation_id)
    .eq("is_latest", true)
    .maybeSingle();

  // Fetch message count
  const { count: messageCount } = await supabase
    .from("email_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", review.conversation_id);

  // Fetch audit events
  const { data: auditEvents } = await supabase
    .from("audit_events")
    .select("*")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: true });

  return {
    ...review,
    latest_message: latestMessage || null,
    message_count: messageCount || 0,
    audit_events: auditEvents || [],
  };
}

// PATCH /api/email-reviews/[reviewId] — Save edits / assignment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Check case exists
    const { data: existing } = await supabase
      .from("email_reviews")
      .select("review_id, review_status")
      .eq("review_id", reviewId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};
    const auditEvents: Array<{
      review_id: string;
      event_type: string;
      actor: string;
      metadata: Record<string, unknown>;
    }> = [];
    const actor = body.actor || "support_user";

    // Draft edits
    if (body.final_draft_subject !== undefined) {
      updates.final_draft_subject = body.final_draft_subject;
    }
    if (body.final_draft_body !== undefined) {
      updates.final_draft_body = body.final_draft_body;
    }
    if (
      body.final_draft_subject !== undefined ||
      body.final_draft_body !== undefined
    ) {
      auditEvents.push({
        review_id: reviewId,
        event_type: "DRAFT_EDITED",
        actor,
        metadata: {
          subject_changed: body.final_draft_subject !== undefined,
          body_changed: body.final_draft_body !== undefined,
        },
      });
    }

    // Assignment
    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to;
      updates.assigned_at = new Date().toISOString();
      auditEvents.push({
        review_id: reviewId,
        event_type: "ASSIGNED",
        actor,
        metadata: { assigned_to: body.assigned_to },
      });
    }

    // Reset draft to original AI draft (stored in latest email_message)
    if (body.reset_draft === true) {
      // First get conversation_id from the review
      const { data: reviewRow } = await supabase
        .from("email_reviews")
        .select("conversation_id")
        .eq("review_id", reviewId)
        .single();

      if (reviewRow) {
        const { data: latestMsg } = await supabase
          .from("email_messages")
          .select("original_draft_subject, original_draft_body")
          .eq("conversation_id", reviewRow.conversation_id)
          .eq("is_latest", true)
          .maybeSingle();

        if (latestMsg) {
          updates.final_draft_subject = latestMsg.original_draft_subject;
          updates.final_draft_body = latestMsg.original_draft_body;
          auditEvents.push({
            review_id: reviewId,
            event_type: "DRAFT_RESET",
            actor,
            metadata: {},
          });
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("email_reviews")
      .update(updates)
      .eq("review_id", reviewId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Insert audit events
    if (auditEvents.length > 0) {
      await supabase.from("audit_events").insert(auditEvents);
    }

    return NextResponse.json({ success: true, review_id: reviewId });
  } catch (error) {
    console.error("PATCH /api/email-reviews/[reviewId] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
