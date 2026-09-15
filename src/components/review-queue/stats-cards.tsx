"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, AlertTriangle, Send, XCircle } from "lucide-react";
import { fetchApi } from "@/lib/fetch";
import type { QueueStats } from "@/lib/types";

export function StatsCards() {
  const [stats, setStats] = useState<QueueStats>({
    pending_review: 0,
    escalated: 0,
    sent_today: 0,
    failed_sends: 0,
  });

  useEffect(() => {
    fetchApi("/api/email-reviews/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const cards = [
    {
      label: "Pending Review",
      value: stats.pending_review,
      icon: Inbox,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Escalated",
      value: stats.escalated,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Sent Today",
      value: stats.sent_today,
      icon: Send,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Failed Sends",
      value: stats.failed_sends,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`rounded-lg p-3 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
