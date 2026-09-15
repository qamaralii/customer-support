"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Clock,
  Mail,
  User,
  UserPlus,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { fetchApi } from "@/lib/fetch";
import { resolveUnderstanding, type EmailReviewRow, type EmailUnderstanding } from "@/lib/types";

interface Props {
  review: EmailReviewRow;
  onAssign: () => void;
  onRetry: () => void;
}

function reviewStatusBadge(status: string) {
  switch (status) {
    case "AWAITING_HUMAN_REVIEW":
      return <Badge className="bg-blue-600 text-white">Pending Review</Badge>;
    case "APPROVED":
      return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>;
    case "SENDING":
      return <Badge className="bg-amber-500 text-white">Sending...</Badge>;
    case "SENT":
      return <Badge className="bg-green-600 text-white">Sent</Badge>;
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function draftStatusBadge(status: string) {
  switch (status) {
    case "READY":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ready</Badge>;
    case "NEEDS_CLARIFICATION":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Needs Clarification</Badge>;
    case "ESCALATE":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Escalate</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function CaseHeader({ review, onAssign, onRetry }: Props) {
  const understanding = resolveUnderstanding(review);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetchApi(`/api/email-reviews/${review.review_id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Case reset — you can now try sending again");
        onRetry();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to retry");
      }
    } catch {
      toast.error("Failed to retry");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Case info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold">{review.subject || "(no subject)"}</h2>
              {review.requires_escalation && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Escalation Required
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {review.sender_name ? `${review.sender_name} <${review.sender_email}>` : review.sender_email}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(review.received_at), "MMM d, yyyy HH:mm")}
                {" "}
                ({formatDistanceToNow(new Date(review.received_at), { addSuffix: true })})
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>ID: {review.review_id}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>Thread: {review.conversation_id?.substring(0, 24)}...</span>
              {(review.message_count ?? 0) > 1 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {review.message_count} emails in thread
                </span>
              )}
            </div>
          </div>

          {/* Right: Status + Assignment */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {reviewStatusBadge(review.review_status)}
              {draftStatusBadge(review.draft_status)}
            </div>

            {understanding?.urgency && (
              <Badge
                variant="outline"
                className={
                  understanding.urgency === "CRITICAL"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : understanding.urgency === "HIGH"
                    ? "bg-orange-100 text-orange-800 border-orange-200"
                    : understanding.urgency === "NORMAL"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                }
              >
                {understanding.urgency} urgency
              </Badge>
            )}

            <div className="flex items-center gap-2 text-sm">
              {review.assigned_to ? (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {review.assigned_to}
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={onAssign}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Assign
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Risk banners */}
        {review.send_error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-start justify-between gap-4">
            <div>
              <strong>Send Failed:</strong> {review.send_error}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0 text-red-700 border-red-300 hover:bg-red-100"
              onClick={handleRetry}
              disabled={retrying}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {retrying ? "Resetting..." : "Retry Send"}
            </Button>
          </div>
        )}
        {review.rejection_reason && (
          <div className="mt-4 rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-800">
            <strong>Rejected:</strong> {review.rejection_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
