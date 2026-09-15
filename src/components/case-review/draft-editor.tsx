"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  FileEdit,
  Save,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Send,
} from "lucide-react";
import type { ReviewStatus } from "@/lib/types";

interface Props {
  subject: string;
  body: string;
  onSubjectChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  isDirty: boolean;
  isReadOnly: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onReject: () => void;
  onEscalate: () => void;
  onApprove: () => void;
  reviewStatus: ReviewStatus;
}

export function DraftEditor({
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  isDirty,
  isReadOnly,
  saving,
  onSave,
  onReset,
  onReject,
  onEscalate,
  onApprove,
  reviewStatus,
}: Props) {
  const isSendable =
    reviewStatus === "AWAITING_HUMAN_REVIEW" ||
    reviewStatus === "FAILED";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileEdit className="h-4 w-4" />
            Proposed Response
            {isDirty && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
          {isReadOnly && (
            <Badge variant="secondary">Read Only</Badge>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="p-6 space-y-4">
        {/* Subject */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Subject
          </label>
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Email subject..."
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Body
          </label>
          <Textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Email body..."
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isReadOnly || !isDirty || saving}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isReadOnly || saving}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset to AI Draft
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              disabled={isReadOnly}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEscalate}
              disabled={isReadOnly}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Escalate
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={!isSendable}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Approve & Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
