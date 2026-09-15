"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CaseHeader } from "@/components/case-review/case-header";
import { ConversationPanel } from "@/components/case-review/conversation-panel";
import { FindingsPanel } from "@/components/case-review/findings-panel";
import { DraftEditor } from "@/components/case-review/draft-editor";
import { AuditTrail } from "@/components/case-review/audit-trail";
import { ActionDialogs } from "@/components/case-review/action-dialogs";
import { fetchApi } from "@/lib/fetch";
import type { ReviewDetailResponse } from "@/lib/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  reviewId: string;
}

export function CaseWorkspace({ reviewId }: Props) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Local draft state
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Dialog states
  const [rejectOpen, setRejectOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const fetchReview = useCallback(async () => {
    try {
      const res = await fetchApi(`/api/email-reviews/${reviewId}`);
      if (!res.ok) {
        toast.error("Failed to load case");
        return;
      }
      const data: ReviewDetailResponse = await res.json();
      setReview(data);
      setDraftSubject(data.final_draft_subject);
      setDraftBody(data.final_draft_body);
      setIsDirty(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  // Auto-poll every 3s while case is SENDING, stop when resolved
  useEffect(() => {
    if (review?.review_status === "SENDING") {
      if (!pollRef.current) {
        pollRef.current = setInterval(async () => {
          const res = await fetchApi(`/api/email-reviews/${reviewId}`);
          if (!res.ok) return;
          const data: ReviewDetailResponse = await res.json();
          if (data.review_status !== "SENDING") {
            // Resolved — stop polling, update state, notify user
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setReview(data);
            if (data.review_status === "SENT") {
              toast.success("Email sent successfully");
            } else if (data.review_status === "FAILED") {
              toast.error("Send failed — check the error below");
            }
          }
        }, 3000);
      }
    } else {
      // Not SENDING — clear any existing poll
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [review?.review_status, reviewId]);

  // Mark dirty when draft changes
  useEffect(() => {
    if (!review) return;
    const changed =
      draftSubject !== review.final_draft_subject ||
      draftBody !== review.final_draft_body;
    setIsDirty(changed);
  }, [draftSubject, draftBody, review]);

  // ── Actions ──

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchApi(`/api/email-reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          final_draft_subject: draftSubject,
          final_draft_body: draftBody,
        }),
      });
      if (res.ok) {
        toast.success("Draft saved");
        await fetchReview();
      } else {
        toast.error("Failed to save draft");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetchApi(`/api/email-reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_draft: true }),
      });
      if (res.ok) {
        toast.success("Draft reset to AI original");
        await fetchReview();
      } else {
        toast.error("Failed to reset draft");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (reason: string, reviewedBy: string) => {
    try {
      const res = await fetchApi(`/api/email-reviews/${reviewId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, reviewed_by: reviewedBy }),
      });
      if (res.ok) {
        toast.success("Case rejected");
        setRejectOpen(false);
        await fetchReview();
      } else {
        toast.error("Failed to reject");
      }
    } catch {
      toast.error("Failed to reject");
    }
  };

  const handleEscalate = async (
    reason: string,
    assignedTo: string
  ) => {
    try {
      const res = await fetchApi(`/api/email-reviews/${reviewId}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, assigned_to: assignedTo || undefined }),
      });
      if (res.ok) {
        toast.success("Case escalated");
        setEscalateOpen(false);
        await fetchReview();
      } else {
        toast.error("Failed to escalate");
      }
    } catch {
      toast.error("Failed to escalate");
    }
  };

  const handleAssign = async (assignedTo: string) => {
    try {
      const res = await fetchApi(`/api/email-reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      if (res.ok) {
        toast.success(`Assigned to ${assignedTo}`);
        setAssignOpen(false);
        await fetchReview();
      } else {
        toast.error("Failed to assign");
      }
    } catch {
      toast.error("Failed to assign");
    }
  };

  const handleApproveSend = async (reviewedBy: string) => {
    try {
      // Save any pending edits first
      if (isDirty) {
        await fetchApi(`/api/email-reviews/${reviewId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            final_draft_subject: draftSubject,
            final_draft_body: draftBody,
          }),
        });
      }

      const res = await fetchApi(`/api/email-reviews/${reviewId}/approve-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewed_by: reviewedBy,
          final_subject: draftSubject,
          final_body: draftBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Email sent successfully");
      } else {
        toast.error(data.error || "Send failed");
      }
      setApproveOpen(false);
      await fetchReview();
    } catch {
      toast.error("Failed to send");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading case...
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Case not found
      </div>
    );
  }

  const isReadOnly =
    review.review_status === "SENT" ||
    review.review_status === "SENDING" ||
    review.review_status === "REJECTED";

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/reviews")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Queue
      </Button>

      {/* SENDING banner */}
      {review.review_status === "SENDING" && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          <span>
            <strong>Sending...</strong> Email is being delivered via Outlook. This page will update automatically.
          </span>
        </div>
      )}

      {/* SENT banner */}
      {review.review_status === "SENT" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>✓ <strong>Sent</strong> — Email was delivered successfully{review.sent_at ? ` at ${new Date(review.sent_at).toLocaleTimeString()}` : ""}.</span>
        </div>
      )}

      {/* Case Header */}
      <CaseHeader
        review={review}
        onAssign={() => setAssignOpen(true)}
        onRetry={fetchReview}
      />

      {/* Two-column layout: Conversation + Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversationPanel review={review} />
        <FindingsPanel review={review} />
      </div>

      {/* Draft Editor + Actions */}
      <DraftEditor
        subject={draftSubject}
        body={draftBody}
        onSubjectChange={setDraftSubject}
        onBodyChange={setDraftBody}
        isDirty={isDirty}
        isReadOnly={isReadOnly}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        onReject={() => setRejectOpen(true)}
        onEscalate={() => setEscalateOpen(true)}
        onApprove={() => setApproveOpen(true)}
        reviewStatus={review.review_status}
      />

      {/* Audit Trail */}
      <AuditTrail events={review.audit_events} />

      {/* Dialogs */}
      <ActionDialogs
        rejectOpen={rejectOpen}
        onRejectClose={() => setRejectOpen(false)}
        onReject={handleReject}
        escalateOpen={escalateOpen}
        onEscalateClose={() => setEscalateOpen(false)}
        onEscalate={handleEscalate}
        approveOpen={approveOpen}
        onApproveClose={() => setApproveOpen(false)}
        onApprove={handleApproveSend}
        assignOpen={assignOpen}
        onAssignClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
        draftSubject={draftSubject}
        draftBody={draftBody}
      />
    </div>
  );
}
