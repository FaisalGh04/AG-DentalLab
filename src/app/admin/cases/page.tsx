import { Suspense } from "react";
import { CasesClient } from "@/components/admin/cases-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function AdminCasesPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-6xl" />}>
      <CasesClient />
    </Suspense>
  );
}
