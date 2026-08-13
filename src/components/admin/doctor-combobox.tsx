"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const positionMenu = React.useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const padding = 12;
    const gap = 4;
    const preferredHeight = 320;
    const below = window.innerHeight - rect.bottom - padding - gap;
    const above = rect.top - padding - gap;
    const placeBelow = below >= Math.min(200, above);
    const available = Math.max(96, placeBelow ? below : above);
    const maxHeight = Math.min(preferredHeight, available);
    const width = Math.min(rect.width, window.innerWidth - padding * 2);
    const left = Math.min(
      Math.max(padding, rect.left),
      window.innerWidth - padding - width,
    );

    setMenuStyle({
      position: "fixed",
      left,
      top: placeBelow ? rect.bottom + gap : rect.top - gap - maxHeight,
      width,
      maxHeight,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
    const update = () => positionMenu();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open, positionMenu]);

  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !wrapRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const linked = doctorId ? doctors?.find((d) => d.id === doctorId) ?? null : null;

  const matches = React.useMemo(() => {
    const list = doctors ?? [];
    const q = normalizeSearchText(value.trim());
    if (!q) return list;
    return list.filter((d) => normalizeSearchText(d.name).includes(q));
  }, [doctors, value]);

  return (
    <div ref={wrapRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls="doctor-roster-options"
          onChange={(e) => {
            // Any manual edit unlinks: the name is now free text again.
            onChange(e.target.value, null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() =>
                menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
              );
            }
          }}
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

      {open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            id="doctor-roster-options"
            role="listbox"
            style={menuStyle}
            className="pointer-events-auto z-[80] overflow-y-auto overscroll-contain rounded-xl border border-white/70 bg-popover/95 p-1 text-popover-foreground shadow-glow backdrop-blur-xl"
          >
            <p className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Search className="h-3 w-3" />
              {t("doctorPick.roster")}
            </p>

            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t("doctorPick.noMatch")}
              </p>
            ) : (
              matches.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={doctorId === d.id}
                  onClick={() => {
                    onChange(d.name, d.id);
                    setOpen(false);
                    inputRef.current?.focus({ preventScroll: true });
                  }}
                  className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm outline-none transition-colors hover:bg-brand-50 focus:bg-brand-50 focus:text-brand-900 sm:min-h-11 xl:min-h-9"
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
                  inputRef.current?.focus({ preventScroll: true });
                }}
                className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg border-t border-border px-3 py-2 text-start text-xs text-muted-foreground outline-none transition-colors hover:bg-brand-50 focus:bg-brand-50 sm:min-h-11 xl:min-h-9"
              >
                <X className="h-3 w-3" />
                {t("doctorPick.useAsTyped", { name: value.trim() })}
              </button>
            )}
          </div>,
          document.body,
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
