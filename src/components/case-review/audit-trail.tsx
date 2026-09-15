"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Clock,
  FileText,
  UserCheck,
  XCircle,
  AlertTriangle,
  Send,
  CheckCircle,
  RotateCcw,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import type { AuditEvent } from "@/lib/types";

interface Props {
  events: AuditEvent[];
}

const eventConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  CASE_RECEIVED:  { icon: Inbox,       label: "Case Received",         color: "text-blue-600" },
  EMAIL_UPDATED:  { icon: RefreshCw,   label: "New Email in Thread",   color: "text-blue-600" },
  ASSIGNED:       { icon: UserCheck,   label: "Assigned",              color: "text-purple-600" },
  DRAFT_EDITED:   { icon: FileText,    label: "Draft Edited",          color: "text-gray-600" },
  DRAFT_SAVED:    { icon: FileText,    label: "Draft Saved",           color: "text-gray-600" },
  DRAFT_RESET:    { icon: RotateCcw,   label: "Draft Reset",           color: "text-gray-600" },
  ESCALATED:      { icon: AlertTriangle, label: "Escalated",           color: "text-amber-600" },
  REJECTED:       { icon: XCircle,     label: "Rejected",              color: "text-red-600" },
  APPROVED:       { icon: CheckCircle, label: "Approved",              color: "text-green-600" },
  SEND_STARTED:   { icon: Send,        label: "Send Started",          color: "text-blue-600" },
  SEND_SUCCEEDED: { icon: CheckCircle, label: "Sent Successfully",     color: "text-green-600" },
  SEND_FAILED:    { icon: XCircle,     label: "Send Failed",           color: "text-red-600" },
};

export function AuditTrail({ events }: Props) {
  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Audit Trail
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="p-4">
            <div className="relative space-y-0">
              {events.map((event, idx) => {
                const config = eventConfig[event.event_type] || {
                  icon: FileText,
                  label: event.event_type,
                  color: "text-gray-600",
                };
                const Icon = config.icon;
                const isLast = idx === events.length - 1;
                const meta = event.metadata as Record<string, unknown> | undefined;

                return (
                  <div key={event.id} className="flex gap-3 pb-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-1 bg-background border ${config.color}`}>
                        <Icon className={`h-3 w-3 ${config.color}`} />
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          by {event.actor}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.created_at), "MMM d, yyyy HH:mm:ss")}
                      </p>
                      {meta && Object.keys(meta).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                          {meta.reason != null && (
                            <p>Reason: {String(meta.reason)}</p>
                          )}
                          {meta.assigned_to != null && (
                            <p>Assigned to: {String(meta.assigned_to)}</p>
                          )}
                          {meta.error != null && (
                            <p className="text-red-600">
                              Error: {String(meta.error)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
