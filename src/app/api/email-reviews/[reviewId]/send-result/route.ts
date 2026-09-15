import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ reviewId: string }> };

// POST /api/email-reviews/[reviewId]/send-result
// Called by Langflow Flow 2 after the Outlook send attempt completes.
// Body: { success: boolean, sent_at?: string, error?: string }
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Verify case exists and is in SENDING state
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

    // Accept callbacks for SENDING or APPROVED (in case of timing edge cases)
    if (
      existing.review_status !== "SENDING" &&
      existing.review_status !== "APPROVED"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Unexpected status for send-result: ${existing.review_status}`,
        },
        { status: 400 }
      );
    }

    if (body.success === true) {
      // ── Success ──
      const sentAt = body.sent_at || new Date().toISOString();

      await supabase
        .from("email_reviews")
        .update({
          review_status: "SENT",
          sent_at: sentAt,
          send_error: null,
        })
        .eq("review_id", reviewId);

      await supabase.from("audit_events").insert({
        review_id: reviewId,
        event_type: "SEND_SUCCEEDED",
        actor: "langflow",
        metadata: { sent_at: sentAt },
      });

      return NextResponse.json({ success: true, review_id: reviewId, status: "SENT" });
    } else {
      // ── Failure ──
      const errorMsg = body.error || "Unknown error from Flow 2";

      await supabase
        .from("email_reviews")
        .update({
          review_status: "FAILED",
          send_error: errorMsg,
        })
        .eq("review_id", reviewId);

      await supabase.from("audit_events").insert({
        review_id: reviewId,
        event_type: "SEND_FAILED",
        actor: "langflow",
        metadata: { error: errorMsg },
      });

      return NextResponse.json({
        success: false,
        review_id: reviewId,
        status: "FAILED",
        error: errorMsg,
      });
    }
  } catch (error) {
    console.error("POST send-result error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
