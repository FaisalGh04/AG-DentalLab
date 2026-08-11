"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ConfirmationInputDTO } from "@/lib/validations";
import type { ConfirmIntent } from "@/components/admin/confirm-action-dialog";
import { useSecuritySettings } from "@/hooks/use-security-settings";

type Perform = (confirmation?: ConfirmationInputDTO) => Promise<unknown>;

/**
 * Shared plumbing for the confirmation gate. Each gated call site calls
 * `request(intent, perform)` instead of mutating directly. An explicitly
 * disabled server setting runs immediately; every other state opens the dialog.
 *
 * Keeps all six entry points on one code path, so none can accidentally bypass
 * the gate by mutating inline.
 */
export function useConfirmAction() {
  const settings = useSecuritySettings();
  const [open, setOpen] = React.useState(false);
  const [intent, setIntent] = React.useState<ConfirmIntent | null>(null);
  // Held in a ref, not state: replacing it must never re-render mid-dialog.
  const performRef = React.useRef<Perform | null>(null);

  const request = React.useCallback(
    (next: ConfirmIntent, perform: Perform) => {
      // Unknown/loading/error defaults to the protected dialog. Only an
      // explicit authenticated response with false can bypass it.
      if (settings.data?.staffConfirmationEnabled === false) {
        void perform(undefined).catch((err) => {
          toast.error(err instanceof Error ? err.message : "Action failed");
        });
        return;
      }
      setIntent(next);
      performRef.current = perform;
      setOpen(true);
    },
    [settings.data?.staffConfirmationEnabled],
  );

  const perform = React.useCallback(async (confirmation: ConfirmationInputDTO) => {
    const fn = performRef.current;
    if (!fn) throw new Error("No pending action");
    return fn(confirmation);
  }, []);

  return { open, setOpen, intent, request, perform };
}
