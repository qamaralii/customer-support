"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/fetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  User,
  Mail,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { EmailReviewRow } from "@/lib/types";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "AWAITING_HUMAN_REVIEW", label: "Pending" },
  { value: "NEEDS_CLARIFICATION", label: "Needs Clarification" },
  { value: "escalated", label: "Escalated" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

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

function reviewStatusBadge(status: string) {
  switch (status) {
    case "AWAITING_HUMAN_REVIEW": return <Badge className="bg-blue-600">Pending Review</Badge>;
    case "APPROVED":              return <Badge className="bg-emerald-600">Approved</Badge>;
    case "REJECTED":              return <Badge variant="destructive">Rejected</Badge>;
    case "SENDING":               return <Badge className="bg-amber-500">Sending...</Badge>;
    case "SENT":                  return <Badge className="bg-green-600">Sent</Badge>;
    case "FAILED":                return <Badge variant="destructive">Failed</Badge>;
    default:                      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ReviewQueue() {
  const router = useRouter();
  const [reviews, setReviews] = useState<EmailReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    if (activeTab === "AWAITING_HUMAN_REVIEW") {
      params.set("status", "AWAITING_HUMAN_REVIEW");
    } else if (activeTab === "NEEDS_CLARIFICATION") {
      params.set("status", "AWAITING_HUMAN_REVIEW");
      params.set("draft_status", "NEEDS_CLARIFICATION");
    } else if (activeTab === "escalated") {
      params.set("escalation", "true");
    } else if (activeTab === "SENT") {
      params.set("status", "SENT");
    } else if (activeTab === "FAILED") {
      params.set("status", "FAILED");
    }

    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetchApi(`/api/email-reviews?${params.toString()}`);
      const data = await res.json();
      setReviews(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setPage(1);
          }}
        >
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sender, subject..."
            className="pl-9 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                fetchReviews();
              }
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Customer</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="w-[130px]">Draft Status</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="w-[100px]">Assigned</TableHead>
              <TableHead className="w-[110px]">Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No cases found
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => {
                const msgCount = review.message_count ?? 0;

                return (
                  <TableRow
                    key={review.review_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/reviews/${review.review_id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm truncate max-w-[180px]">
                          {review.sender_name || review.sender_email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {review.sender_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {review.requires_escalation && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="text-sm truncate max-w-[280px]">
                            {review.subject || "(no subject)"}
                          </span>
                        </div>
                        {msgCount > 1 && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{msgCount} emails in thread</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{draftStatusBadge(review.draft_status)}</TableCell>
                    <TableCell>{reviewStatusBadge(review.review_status)}</TableCell>
                    <TableCell>
                      {review.assigned_to ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[80px]">
                            {review.assigned_to}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(review.received_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
