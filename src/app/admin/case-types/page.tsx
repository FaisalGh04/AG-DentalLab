import { Suspense } from "react";
import { CaseTypesClient } from "@/components/admin/case-types-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function AdminCaseTypesPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}>
      <CaseTypesClient />
    </Suspense>
  );
}
