import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ reviewId: string }> };

// POST /api/email-reviews/[reviewId]/retry — Reset a FAILED case back to AWAITING_HUMAN_REVIEW
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const supabase = createServerClient();

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

    if (existing.review_status !== "FAILED") {
      return NextResponse.json(
        { success: false, error: `Can only retry a FAILED case, current status: ${existing.review_status}` },
        { status: 400 }
      );
    }

    await supabase
      .from("email_reviews")
      .update({
        review_status: "AWAITING_HUMAN_REVIEW",
        send_error: null,
      })
      .eq("review_id", reviewId);

    await supabase.from("audit_events").insert({
      review_id: reviewId,
      event_type: "DRAFT_SAVED",
      actor: "support_user",
      metadata: { note: "Reset from FAILED to AWAITING_HUMAN_REVIEW for retry" },
    });

    return NextResponse.json({ success: true, review_id: reviewId, status: "AWAITING_HUMAN_REVIEW" });
  } catch (error) {
    console.error("POST retry error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
