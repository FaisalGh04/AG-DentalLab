import { Suspense } from "react";
import { StaffManagementClient } from "@/components/admin/staff-management-client";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function AdminStaffPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}>
      <StaffManagementClient />
    </Suspense>
  );
}
