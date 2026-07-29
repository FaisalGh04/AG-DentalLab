import { Suspense } from "react";
import { DoctorsClient } from "@/components/admin/doctors-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function AdminDoctorsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}>
      <DoctorsClient />
    </Suspense>
  );
}
