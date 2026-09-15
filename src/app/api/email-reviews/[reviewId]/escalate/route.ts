import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

type RouteParams = { params: Promise<{ reviewId: string }> };

// POST /api/email-reviews/[reviewId]/escalate
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: "Escalation reason is required" },
        { status: 400 }
      );
    }

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
        { success: false, error: `Cannot escalate a case with status ${existing.review_status}` },
        { status: 400 }
      );
    }

    const actor = body.actor || "support_user";
    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      requires_escalation: true,
      escalation_reason: body.reason,
      reviewed_by: actor,
      reviewed_at: now,
    };

    if (body.assigned_to) {
      updates.assigned_to = body.assigned_to;
      updates.assigned_at = now;
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

    await supabase.from("audit_events").insert({
      review_id: reviewId,
      event_type: "ESCALATED",
      actor,
      metadata: {
        reason: body.reason,
        assigned_to: body.assigned_to || null,
      },
    });

    return NextResponse.json({
      success: true,
      review_id: reviewId,
      escalated: true,
    });
  } catch (error) {
    console.error("POST escalate error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
