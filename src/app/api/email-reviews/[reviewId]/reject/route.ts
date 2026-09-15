import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ reviewId: string }> };

// POST /api/email-reviews/[reviewId]/reject
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Check case exists and is in a rejectable state
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

    if (existing.review_status === "SENT" || existing.review_status === "SENDING") {
      return NextResponse.json(
        { success: false, error: `Cannot reject a case with status ${existing.review_status}` },
        { status: 400 }
      );
    }

    const actor = body.reviewed_by || "support_user";
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("email_reviews")
      .update({
        review_status: "REJECTED",
        rejection_reason: body.reason,
        reviewed_by: actor,
        reviewed_at: now,
      })
      .eq("review_id", reviewId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    await supabase.from("audit_events").insert({
      review_id: reviewId,
      event_type: "REJECTED",
      actor,
      metadata: { reason: body.reason },
    });

    return NextResponse.json({
      success: true,
      review_id: reviewId,
      status: "REJECTED",
    });
  } catch (error) {
    console.error("POST reject error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
