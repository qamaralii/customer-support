"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Send, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { resolveThread, resolveCurrentEmail, type EmailReviewRow, type ThreadContext, type ThreadMessage } from "@/lib/types";

interface Props {
  review: EmailReviewRow;
}

function directionInfo(direction: string) {
  switch (direction) {
    case "CURRENT_INBOUND":
      return {
        icon: Mail,
        label: "Current Email",
        bg: "bg-blue-50 border-blue-200",
        accent: "text-blue-700",
      };
    case "INBOUND":
      return {
        icon: Mail,
        label: "Customer",
        bg: "bg-gray-50 border-gray-200",
        accent: "text-gray-700",
      };
    case "OUTBOUND_SUPPORT":
      return {
        icon: Send,
        label: "Support",
        bg: "bg-green-50 border-green-200",
        accent: "text-green-700",
      };
    default:
      return {
        icon: ArrowRight,
        label: direction,
        bg: "bg-gray-50 border-gray-200",
        accent: "text-gray-700",
      };
  }
}

export function ConversationPanel({ review }: Props) {
  const thread = resolveThread(review);
  const messages: ThreadMessage[] = thread?.messages || [];
  const currentEmail = resolveCurrentEmail(review);
  const latestMessageId = review.latest_message?.message_id || review.conversation_id;

  // Build the complete message list: historical + current
  // If current email isn't already in messages, add it
  const hasCurrentInMessages = messages.some(
    (m) => m.direction === "CURRENT_INBOUND"
  );

  const allMessages = hasCurrentInMessages
    ? messages
    : [
        ...messages,
        {
          message_id: latestMessageId,
          direction: "CURRENT_INBOUND" as const,
          sender_email: review.sender_email,
          sender_name: review.sender_name,
          subject: review.subject,
          received_at: review.received_at,
          body_text: currentEmail,
        },
      ];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Customer Conversation
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {allMessages.length} messages
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-4">
            {allMessages.length === 0 ? (
              // Just show the current email if no thread
              <MessageBubble
                direction="CURRENT_INBOUND"
                senderName={review.sender_name}
                senderEmail={review.sender_email}
                receivedAt={review.received_at}
                body={currentEmail}
              />
            ) : (
              allMessages.map((msg, idx) => (
                <MessageBubble
                  key={msg.message_id || idx}
                  direction={msg.direction}
                  senderName={msg.sender_name}
                  senderEmail={msg.sender_email}
                  receivedAt={msg.received_at}
                  body={msg.body_text}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageBubble({
  direction,
  senderName,
  senderEmail,
  receivedAt,
  body,
}: {
  direction: string;
  senderName: string;
  senderEmail: string;
  receivedAt: string;
  body: string;
}) {
  const info = directionInfo(direction);
  const Icon = info.icon;

  return (
    <div className={`rounded-lg border p-4 ${info.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${info.accent}`} />
          <span className={`text-xs font-medium ${info.accent}`}>
            {info.label}
          </span>
          {direction === "CURRENT_INBOUND" && (
            <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">
              Latest
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {receivedAt
            ? format(new Date(receivedAt), "MMM d, HH:mm")
            : ""}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {senderName ? `${senderName} <${senderEmail}>` : senderEmail}
      </p>
      <div className="text-sm whitespace-pre-wrap leading-relaxed">
        {body || "(empty)"}
      </div>
    </div>
  );
}
