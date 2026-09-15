import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ reviewId: string }> };

// POST /api/email-reviews/[reviewId]/approve-send
// Marks the case APPROVED → SENDING, fires Langflow Flow 2 with a callback_url,
// then returns immediately. The final SENT/FAILED transition happens when
// Flow 2 calls POST /api/email-reviews/[reviewId]/send-result.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    const actor = body.reviewed_by || "support_user";

    // Fetch the review case
    const { data: review, error: fetchError } = await supabase
      .from("email_reviews")
      .select("*")
      .eq("review_id", reviewId)
      .maybeSingle();

    if (fetchError || !review) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    // Verify case is in a sendable state
    if (review.review_status === "SENT") {
      return NextResponse.json(
        { success: false, error: "Case already sent" },
        { status: 400 }
      );
    }
    if (review.review_status === "SENDING") {
      return NextResponse.json(
        { success: false, error: "Case is currently being sent" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Step 1: Mark as APPROVED, persist any last-minute draft edits
    await supabase
      .from("email_reviews")
      .update({
        review_status: "APPROVED",
        reviewed_by: actor,
        reviewed_at: now,
        ...(body.final_subject !== undefined && {
          final_draft_subject: body.final_subject,
        }),
        ...(body.final_body !== undefined && {
          final_draft_body: body.final_body,
        }),
      })
      .eq("review_id", reviewId);

    await supabase.from("audit_events").insert({
      review_id: reviewId,
      event_type: "APPROVED",
      actor,
      metadata: {},
    });

    // Step 2: Check Flow 2 URL is configured before moving to SENDING
    const flow2Url = process.env.LANGFLOW_FLOW2_WEBHOOK_URL;
    if (!flow2Url) {
      await supabase
        .from("email_reviews")
        .update({
          review_status: "FAILED",
          send_error: "LANGFLOW_FLOW2_WEBHOOK_URL not configured",
        })
        .eq("review_id", reviewId);

      await supabase.from("audit_events").insert({
        review_id: reviewId,
        event_type: "SEND_FAILED",
        actor: "system",
        metadata: { error: "LANGFLOW_FLOW2_WEBHOOK_URL not configured" },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Send flow not configured",
          review_id: reviewId,
          status: "FAILED",
        },
        { status: 500 }
      );
    }

    // Step 3: Mark as SENDING
    await supabase
      .from("email_reviews")
      .update({ review_status: "SENDING" })
      .eq("review_id", reviewId);

    await supabase.from("audit_events").insert({
      review_id: reviewId,
      event_type: "SEND_STARTED",
      actor: "system",
      metadata: {},
    });

    // Step 4: Build callback URL
    // Prefer explicit BASE_URL env var (set this to your ngrok/Railway URL).
    // Falls back to deriving from request headers (works on Railway but not
    // behind ngrok where Next.js sees localhost internally).
    let callbackBase = process.env.BASE_URL?.replace(/\/$/, "");
    if (!callbackBase) {
      const host =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "localhost:3000";
      const protocol =
        request.headers.get("x-forwarded-proto") || "http";
      callbackBase = `${protocol}://${host}`;
    }
    const callbackUrl = `${callbackBase}/api/email-reviews/${reviewId}/send-result`;

    // Re-fetch latest draft + get message_id from latest email_message
    const { data: latestReview } = await supabase
      .from("email_reviews")
      .select("final_draft_subject, final_draft_body, conversation_id")
      .eq("review_id", reviewId)
      .single();

    // message_id now lives in email_messages
    const { data: latestMsg } = await supabase
      .from("email_messages")
      .select("message_id")
      .eq("conversation_id", review.conversation_id)
      .eq("is_latest", true)
      .maybeSingle();

    const flow2Payload = {
      review_id: reviewId,
      message_id: latestMsg?.message_id || null,
      conversation_id: latestReview?.conversation_id || review.conversation_id,
      action: "APPROVE",
      final_subject: latestReview?.final_draft_subject || review.final_draft_subject,
      final_body: latestReview?.final_draft_body || review.final_draft_body,
      reviewed_by: actor,
      reviewed_at: now,
      callback_url: callbackUrl,
    };

    // Step 5: Fire Flow 2 — we do NOT wait for the Outlook send to complete.
    // A 200 from Langflow's /run endpoint only means it accepted the job.
    // Flow 2 will call callback_url when the Outlook send actually succeeds or fails.
    try {
      const flow2Response = await fetch(flow2Url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.LANGFLOW_FLOW2_API_KEY && {
            "x-api-key": process.env.LANGFLOW_FLOW2_API_KEY,
          }),
        },
        body: JSON.stringify(flow2Payload),
        signal: AbortSignal.timeout(30000), // 30s just to confirm Langflow accepted it
      });

      if (flow2Response.ok) {
        // Langflow accepted the run — case stays SENDING until send-result callback arrives
        return NextResponse.json({
          success: true,
          review_id: reviewId,
          status: "SENDING",
          callback_url: callbackUrl,
        });
      } else {
        // Langflow rejected the request outright (bad config, auth failure, etc.)
        const errorText = await flow2Response.text().catch(() => "Unknown error");
        await supabase
          .from("email_reviews")
          .update({
            review_status: "FAILED",
            send_error: `Flow 2 rejected request (${flow2Response.status}): ${errorText.substring(0, 300)}`,
          })
          .eq("review_id", reviewId);

        await supabase.from("audit_events").insert({
          review_id: reviewId,
          event_type: "SEND_FAILED",
          actor: "system",
          metadata: {
            flow2_status: flow2Response.status,
            error: errorText.substring(0, 500),
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: `Flow 2 rejected with status ${flow2Response.status}`,
            review_id: reviewId,
            status: "FAILED",
          },
          { status: 502 }
        );
      }
    } catch (fetchErr) {
      // Network / timeout reaching Langflow
      const errorMessage = fetchErr instanceof Error ? fetchErr.message : "Unknown error";

      await supabase
        .from("email_reviews")
        .update({
          review_status: "FAILED",
          send_error: `Could not reach Flow 2: ${errorMessage}`,
        })
        .eq("review_id", reviewId);

      await supabase.from("audit_events").insert({
        review_id: reviewId,
        event_type: "SEND_FAILED",
        actor: "system",
        metadata: { error: errorMessage },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Failed to reach Flow 2: ${errorMessage}`,
          review_id: reviewId,
          status: "FAILED",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("POST approve-send error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
