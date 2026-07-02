import { Suspense } from "react";
import { CaseDetailClient } from "@/components/admin/case-detail-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default async function AdminCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}>
      <CaseDetailClient id={id} />
    </Suspense>
  );
}
