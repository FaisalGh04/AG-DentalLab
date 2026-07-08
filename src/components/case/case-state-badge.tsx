import { Badge } from "@/components/ui/badge";
import { getStage, localizedLabel } from "@/lib/production-templates";
import type { Locale } from "@/lib/i18n/config";

interface CaseStateBadgeProps {
  collectionId: string | null;
  currentStageId: string | null;
  isCompleted: boolean;
  /** Locale for the stage label; admin passes nothing and stays English. */
  locale?: Locale;
  /** Optional override labels (public tracker passes translated strings). */
  labels?: { completed?: string; noCollection?: string };
}

/**
 * Compact badge summarizing where a case is: Completed, its current stage name,
 * or "No collection" when none has been chosen. Replaces the old StatusBadge.
 */
export function CaseStateBadge({
  collectionId,
  currentStageId,
  isCompleted,
  locale = "en",
  labels,
}: CaseStateBadgeProps) {
  if (isCompleted) {
    return (
      <Badge variant="success">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {labels?.completed ?? "Completed"}
      </Badge>
    );
  }

  if (!collectionId) {
    return <Badge variant="neutral">{labels?.noCollection ?? "No collection"}</Badge>;
  }

  const found = getStage(collectionId, currentStageId);
  const label = found ? localizedLabel(found.stage, locale) : "In progress";
  return (
    <Badge variant="info">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
