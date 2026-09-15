import { CaseWorkspace } from "@/components/case-review/case-workspace";

interface Props {
  params: Promise<{ reviewId: string }>;
}

export default async function CaseReviewPage({ params }: Props) {
  const { reviewId } = await params;

  return <CaseWorkspace reviewId={reviewId} />;
}
