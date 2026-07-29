"use client";

import * as React from "react";
import type { ConfirmationInputDTO } from "@/lib/validations";
import type { ConfirmIntent } from "@/components/admin/confirm-action-dialog";

type Perform = (confirmation: ConfirmationInputDTO) => Promise<unknown>;

/**
 * Shared plumbing for the confirmation gate. Each gated call site calls
 * `request(intent, perform)` INSTEAD of mutating directly; the mutation itself
 * is deferred until the dialog collects and the server verifies both factors.
 *
 * Keeps all six entry points on one code path, so none can accidentally bypass
 * the gate by mutating inline.
 */
export function useConfirmAction() {
  const [open, setOpen] = React.useState(false);
  const [intent, setIntent] = React.useState<ConfirmIntent | null>(null);
  // Held in a ref, not state: replacing it must never re-render mid-dialog.
  const performRef = React.useRef<Perform | null>(null);

  const request = React.useCallback((next: ConfirmIntent, perform: Perform) => {
    setIntent(next);
    performRef.current = perform;
    setOpen(true);
  }, []);

  const perform = React.useCallback(async (confirmation: ConfirmationInputDTO) => {
    const fn = performRef.current;
    if (!fn) throw new Error("No pending action");
    return fn(confirmation);
  }, []);

  return { open, setOpen, intent, request, perform };
}
