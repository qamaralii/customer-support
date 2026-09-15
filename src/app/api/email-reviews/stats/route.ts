import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET /api/email-reviews/stats — Dashboard statistics
export async function GET() {
  try {
    const supabase = createServerClient();

    const [pendingResult, escalatedResult, sentTodayResult, failedResult] =
      await Promise.all([
        supabase
          .from("email_reviews")
          .select("id", { count: "exact", head: true })
          .eq("review_status", "AWAITING_HUMAN_REVIEW"),
        supabase
          .from("email_reviews")
          .select("id", { count: "exact", head: true })
          .eq("requires_escalation", true)
          .eq("review_status", "AWAITING_HUMAN_REVIEW"),
        supabase
          .from("email_reviews")
          .select("id", { count: "exact", head: true })
          .eq("review_status", "SENT")
          .gte("sent_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase
          .from("email_reviews")
          .select("id", { count: "exact", head: true })
          .eq("review_status", "FAILED"),
      ]);

    return NextResponse.json({
      pending_review: pendingResult.count || 0,
      escalated: escalatedResult.count || 0,
      sent_today: sentTodayResult.count || 0,
      failed_sends: failedResult.count || 0,
    });
  } catch (error) {
    console.error("GET /api/email-reviews/stats error:", error);
    return NextResponse.json(
      { pending_review: 0, escalated: 0, sent_today: 0, failed_sends: 0 },
      { status: 500 }
    );
  }
}
