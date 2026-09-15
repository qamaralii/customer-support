"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  rejectOpen: boolean;
  onRejectClose: () => void;
  onReject: (reason: string, reviewedBy: string) => void;

  escalateOpen: boolean;
  onEscalateClose: () => void;
  onEscalate: (reason: string, assignedTo: string) => void;

  approveOpen: boolean;
  onApproveClose: () => void;
  onApprove: (reviewedBy: string) => void;

  assignOpen: boolean;
  onAssignClose: () => void;
  onAssign: (assignedTo: string) => void;

  draftSubject: string;
  draftBody: string;
}

export function ActionDialogs({
  rejectOpen,
  onRejectClose,
  onReject,
  escalateOpen,
  onEscalateClose,
  onEscalate,
  approveOpen,
  onApproveClose,
  onApprove,
  assignOpen,
  onAssignClose,
  onAssign,
  draftSubject,
  draftBody,
}: Props) {
  return (
    <>
      <RejectDialog open={rejectOpen} onClose={onRejectClose} onConfirm={onReject} />
      <EscalateDialog open={escalateOpen} onClose={onEscalateClose} onConfirm={onEscalate} />
      <ApproveDialog
        open={approveOpen}
        onClose={onApproveClose}
        onConfirm={onApprove}
        subject={draftSubject}
        body={draftBody}
      />
      <AssignDialog open={assignOpen} onClose={onAssignClose} onConfirm={onAssign} />
    </>
  );
}

// ── Reject Dialog ──

function RejectDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, reviewedBy: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Case</DialogTitle>
          <DialogDescription>
            This response will not be sent. Provide a reason for the rejection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this response being rejected?"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Your Name</Label>
            <Input
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder="Reviewer name"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(reason, reviewedBy);
              setReason("");
              setReviewedBy("");
            }}
            disabled={!reason.trim()}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Escalate Dialog ──

function EscalateDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, assignedTo: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Case</DialogTitle>
          <DialogDescription>
            Flag this case for further investigation or supervisor review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why does this need escalation?"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Assign To (optional)</Label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Team or person name"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              onConfirm(reason, assignedTo);
              setReason("");
              setAssignedTo("");
            }}
            disabled={!reason.trim()}
          >
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Approve & Send Dialog ──

function ApproveDialog({
  open,
  onClose,
  onConfirm,
  subject,
  body,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reviewedBy: string) => void;
  subject: string;
  body: string;
}) {
  const [reviewedBy, setReviewedBy] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        {/* Fixed header */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Approve & Send</DialogTitle>
          <DialogDescription>
            This is the exact email that will be sent to the customer.
            Please review carefully before confirming.
          </DialogDescription>
        </DialogHeader>
        <Separator className="flex-shrink-0" />

        {/* Scrollable preview area */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subject</p>
              <p className="text-sm font-medium">{subject || "(no subject)"}</p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {body || "(empty)"}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer — always visible */}
        <div className="flex-shrink-0 space-y-3 pt-2 border-t">
          <div>
            <Label>Your Name</Label>
            <Input
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder="Reviewer name"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                onConfirm(reviewedBy);
                setReviewedBy("");
              }}
              disabled={!reviewedBy.trim()}
            >
              Confirm & Send
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Assign Dialog ──

function AssignDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignedTo: string) => void;
}) {
  const [assignedTo, setAssignedTo] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Case</DialogTitle>
          <DialogDescription>
            Assign this case to a support team member.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label>Assign To</Label>
          <Input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Name or team"
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(assignedTo);
              setAssignedTo("");
            }}
            disabled={!assignedTo.trim()}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
