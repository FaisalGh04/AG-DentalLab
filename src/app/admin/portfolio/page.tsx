import { Suspense } from "react";
import { PortfolioClient } from "@/components/admin/portfolio-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function AdminPortfolioPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-6xl" />}>
      <PortfolioClient />
    </Suspense>
  );
}
