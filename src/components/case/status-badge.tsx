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

export function StatusBadge({
  status,
  label,
}: {
  status: CaseStatus;
  /** Optional translated label; falls back to the English STATUS_META label
   *  (admin views pass nothing and stay English). */
  label?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={variantFor[status]}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {label ?? meta.label}
    </Badge>
  );
}
