import { Suspense } from "react";
import { CaseGroupsClient } from "@/components/admin/case-groups-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function AdminCaseGroupsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}>
      <CaseGroupsClient />
    </Suspense>
  );
}
