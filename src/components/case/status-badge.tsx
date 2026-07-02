import type { CaseStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/constants";

const variantFor: Record<
  CaseStatus,
  "neutral" | "info" | "default" | "success"
> = {
  RECEIVED: "neutral",
  IN_PROGRESS: "info",
  PRODUCTION: "default",
  COMPLETED: "success",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={variantFor[status]}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </Badge>
  );
}
