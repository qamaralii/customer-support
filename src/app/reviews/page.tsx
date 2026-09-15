import { StatsCards } from "@/components/review-queue/stats-cards";
import { ReviewQueue } from "@/components/review-queue/review-queue";

export default function ReviewsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground text-sm">
          Customer email cases awaiting review
        </p>
      </div>

      <StatsCards />
      <ReviewQueue />
    </div>
  );
}
