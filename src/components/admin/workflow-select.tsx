"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { useCaseGroupsTree } from "@/hooks/use-case-groups";
import { isProductionCategory } from "@/lib/case-types";
import { cn } from "@/lib/utils";
import type { CaseCategory, CaseWorkflowType } from "@prisma/client";

/**
 * Two-step workflow picker used by the New Case form + the case detail view.
 * The admin first chooses Regular/Digital, then a group that has a stage-set of
 * that type; selecting a group resolves to that stage-set's id (stored as
 * collectionId). Renders NOTHING for non-production categories (field hidden).
 *
 * On edit, `value` (a saved collectionId) is reverse-resolved to its (type, group)
 * so the picker pre-selects correctly — e.g. "digital-cases" → Digital + Zirconia
 * Crown & Bridge. `onChange(null)` fires for incomplete selections; callers that
 * commit immediately (detail view) should ignore null.
 */
export function WorkflowSelect({
  category,
  value,
  onChange,
  disabled,
  error,
}: {
  category: CaseCategory | "" | null | undefined;
  value: string | null;
  onChange: (collectionId: string | null) => void;
  disabled?: boolean;
  error?: string;
}) {
  const { t, locale } = useAdminI18n();
  const isAr = locale === "ar";
  const { data: tree } = useCaseGroupsTree();
  const groups = React.useMemo(() => tree?.groups ?? [], [tree]);
  const production = isProductionCategory(category);

  // Reverse-resolve the saved collectionId → its (type, groupId).
  const resolved = React.useMemo(() => {
    if (!value) return { type: null as CaseWorkflowType | null, groupId: null as string | null };
    for (const g of groups) {
      for (const s of g.stageSets) {
        if (s.id === value) return { type: s.type, groupId: g.id };
      }
    }
    return { type: null, groupId: null };
  }, [value, groups]);

  const [type, setType] = React.useState<CaseWorkflowType | null>(resolved.type);
  // Sync the type only when a saved value resolves to one (edit hydrate); don't
  // clobber a just-picked type while the group is still being chosen (value null).
  React.useEffect(() => {
    if (resolved.type) setType(resolved.type);
  }, [resolved.type]);

  if (!production) return null;

  const groupsForType = type
    ? groups.filter((g) => g.stageSets.some((s) => s.type === type))
    : [];

  const pickType = (next: CaseWorkflowType) => {
    setType(next);
    onChange(null); // group must be re-picked for the new type
  };
  const pickGroup = (groupId: string) => {
    const set = groups.find((g) => g.id === groupId)?.stageSets.find((s) => s.type === type);
    onChange(set?.id ?? null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("form.workflow")}</label>

      {/* Regular / Digital segmented control */}
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
        {(["REGULAR", "DIGITAL"] as CaseWorkflowType[]).map((wt) => (
          <button
            key={wt}
            type="button"
            disabled={disabled}
            onClick={() => pickType(wt)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              type === wt
                ? "bg-brand-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`groups.type.${wt}`)}
          </button>
        ))}
      </div>

      {/* Group dropdown, filtered to groups having a stage-set of the chosen type */}
      <Select
        value={resolved.groupId ?? ""}
        disabled={disabled || !type}
        onValueChange={pickGroup}
      >
        <SelectTrigger>
          <SelectValue placeholder={type ? t("form.pickGroup") : t("form.pickTypeFirst")} />
        </SelectTrigger>
        <SelectContent>
          {groupsForType.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {isAr ? g.labelAr : g.labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
