"use client";

import * as React from "react";
import { Check, Link2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useActiveDoctorOptions } from "@/hooks/use-doctors";
import { useAdminI18n } from "@/components/i18n/admin-i18n";

interface Props {
  /** The doctor NAME — always a free-text string, always what gets stored. */
  value: string;
  /** Roster link, or null for a one-off doctor who is not on the roster. */
  doctorId: string | null;
  onChange: (name: string, doctorId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Doctor picker for the New Case form.
 *
 * Free text is a first-class outcome, not a fallback: a one-off referring
 * doctor must be enterable without polluting the roster. Picking a roster entry
 * additionally sets doctorId, which is what makes the case appear in that
 * doctor's public portal.
 *
 * Editing the text after picking CLEARS the link — otherwise the stored name
 * and the linked doctor could silently disagree.
 */
export function DoctorCombobox({
  value,
  doctorId,
  onChange,
  placeholder,
  disabled,
}: Props) {
  const { t } = useAdminI18n();
  const { data: doctors } = useActiveDoctorOptions();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click.
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const linked = doctorId ? doctors?.find((d) => d.id === doctorId) ?? null : null;

  const matches = React.useMemo(() => {
    const list = doctors ?? [];
    const q = normalizeSearchText(value.trim());
    if (!q) return list;
    return list.filter((d) => normalizeSearchText(d.name).includes(q));
  }, [doctors, value]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            // Any manual edit unlinks: the name is now free text again.
            onChange(e.target.value, null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={cn(linked && "pe-24")}
          autoComplete="off"
        />
        {linked && (
          <span className="pointer-events-none absolute end-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
            <Link2 className="h-3 w-3" />
            {t("doctorPick.linked")}
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Search className="h-3 w-3" />
            {t("doctorPick.roster")}
          </p>

          {matches.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {t("doctorPick.noMatch")}
            </p>
          ) : (
            matches.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onChange(d.name, d.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-muted"
              >
                <span className="truncate">{d.name}</span>
                {doctorId === d.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                )}
              </button>
            ))
          )}

          {/* Free text is an explicit, equal option — not a silent fallback. */}
          {value.trim() && (
            <button
              type="button"
              onClick={() => {
                onChange(value, null);
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2 py-2 text-start text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="h-3 w-3" />
              {t("doctorPick.useAsTyped", { name: value.trim() })}
            </button>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        {linked ? t("doctorPick.linkedHint") : t("doctorPick.freeHint")}
      </p>
    </div>
  );
}

/** Unicode normalization keeps Arabic and English roster searches predictable. */
function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase();
}
