"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  AlertTriangle,
  Info,
  ShieldAlert,
  Tag,
  Target,
} from "lucide-react";
import {
  resolveEvidence,
  resolveUnderstanding,
  type EmailReviewRow,
  type Identifiers,
} from "@/lib/types";

interface Props {
  review: EmailReviewRow;
}

function toneBadge(tone: string) {
  const colors: Record<string, string> = {
    NEUTRAL: "bg-gray-100 text-gray-700",
    POLITE: "bg-green-100 text-green-700",
    CONCERNED: "bg-amber-100 text-amber-700",
    FRUSTRATED: "bg-orange-100 text-orange-700",
    ANGRY: "bg-red-100 text-red-700",
  };
  return (
    <Badge variant="outline" className={colors[tone] || "bg-gray-100"}>
      {tone}
    </Badge>
  );
}

export function FindingsPanel({ review }: Props) {
  const understanding = resolveUnderstanding(review);
  const evidence = resolveEvidence(review);

  const hasFindings = understanding || evidence;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Findings
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-5">
            {!hasFindings && (
              <p className="text-sm text-muted-foreground">
                No AI findings available for this case.
              </p>
            )}

            {/* Intent & Tone — from understanding (old flow) */}
            {understanding && (
              <Section title="Understanding" icon={Target}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{understanding.primary_intent}</Badge>
                    {understanding.secondary_intents?.map((intent, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {intent}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {toneBadge(understanding.tone)}
                    <Badge
                      variant="outline"
                      className={
                        understanding.urgency === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : understanding.urgency === "HIGH"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {understanding.urgency}
                    </Badge>
                  </div>

                  {understanding.latest_customer_request && (
                    <div className="text-sm">
                      <span className="font-medium text-muted-foreground">
                        Request:{" "}
                      </span>
                      {understanding.latest_customer_request}
                    </div>
                  )}

                  {understanding.reason && (
                    <p className="text-xs text-muted-foreground">
                      {understanding.reason}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {/* Identifiers — from understanding (old flow) */}
            {understanding?.identifiers && (
              <Section title="Identifiers" icon={Tag}>
                <IdentifiersList identifiers={understanding.identifiers} />
                {understanding.identifier_conflicts?.length > 0 && (
                  <WarningBox
                    title="Identifier Conflicts"
                    items={understanding.identifier_conflicts.map(
                      (c) => `${c.type}: ${c.values.join(", ")}`
                    )}
                  />
                )}
              </Section>
            )}

            {/* Evidence Summary — from evidence / investigation_evidence (both flows) */}
            {evidence && (
              <>
                <Section title="Evidence Summary" icon={Info}>
                  {evidence.summary && (
                    <p className="text-sm">{evidence.summary}</p>
                  )}
                  {evidence.customer_safe_facts?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Customer-Safe Facts
                      </p>
                      <ul className="text-sm space-y-1">
                        {evidence.customer_safe_facts.map((fact, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">&#8226;</span>
                            {fact}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {evidence.verified_facts?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Verified Facts
                      </p>
                      <ul className="text-sm space-y-1">
                        {evidence.verified_facts.map((fact, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">&#8226;</span>
                            {fact}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Section>

                {/* Missing Information */}
                {evidence.missing_information?.length > 0 && (
                  <WarningBox
                    title="Missing Information"
                    items={evidence.missing_information}
                  />
                )}

                {/* Conflicts */}
                {evidence.conflicts?.length > 0 && (
                  <WarningBox
                    title="Conflicts"
                    items={evidence.conflicts}
                    variant="error"
                  />
                )}

                {/* Unresolved Questions — old flow only */}
                {understanding?.unresolved_questions &&
                  understanding.unresolved_questions.length > 0 && (
                    <WarningBox
                      title="Unresolved Questions"
                      items={understanding.unresolved_questions}
                    />
                  )}

                {/* Escalation */}
                {(evidence.needs_escalation ||
                  understanding?.escalation_required) && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        Escalation Required
                      </span>
                    </div>
                    {evidence.escalation_reason && (
                      <p className="text-sm text-red-700">
                        {evidence.escalation_reason}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-sm font-medium">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function IdentifiersList({ identifiers }: { identifiers: Identifiers }) {
  const items = [
    { label: "Customer ID", value: identifiers.customer_id },
    { label: "Loan ID", value: identifiers.loan_id },
    { label: "Application ID", value: identifiers.application_id },
    { label: "Transaction Ref", value: identifiers.transaction_reference },
  ].filter((item) => item.value);

  const otherIds = identifiers.other_identifiers || [];

  if (items.length === 0 && otherIds.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No identifiers extracted</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {item.label}
          </p>
          <p className="text-sm font-mono">{item.value}</p>
        </div>
      ))}
      {otherIds.map((oid, i) => (
        <div key={i} className="rounded bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {oid.type}
          </p>
          <p className="text-sm font-mono">{oid.value}</p>
        </div>
      ))}
    </div>
  );
}

function WarningBox({
  title,
  items,
  variant = "warning",
}: {
  title: string;
  items: string[];
  variant?: "warning" | "error";
}) {
  const colors =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-lg border p-3 ${colors}`}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ul className="text-sm space-y-1 ml-5">
        {items.map((item, i) => (
          <li key={i} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

