"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { caseCreateSchema, type CaseCreateInput } from "@/lib/validations";
import { CASE_CATEGORY_ORDER, CATEGORY_META } from "@/lib/constants";
import { getCaseTypesForCategory } from "@/lib/case-types";
import { PRODUCTION_COLLECTIONS } from "@/lib/production-templates";
import { useCreateCase, useUpdateCase } from "@/hooks/use-cases";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import type { AdminCaseDTO } from "@/types/case";
import type { CaseCategory } from "@prisma/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: AdminCaseDTO | null;
  onSaved?: (id: string) => void;
}

export function CaseFormDialog({ open, onOpenChange, existing, onSaved }: Props) {
  const isEdit = !!existing;
  const create = useCreateCase();
  const update = useUpdateCase(existing?.id ?? "");
  const pending = create.isPending || update.isPending;
  const [createdTrackingId, setCreatedTrackingId] = React.useState<string | null>(
    null,
  );
  // Est. completion time (HH:mm) is kept in local state and combined with the
  // date on submit. Empty string = no specific time (stored as 00:00 UTC).
  const [estTime, setEstTime] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CaseCreateInput>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: {
      category: undefined as unknown as CaseCategory,
      collectionId: null,
    },
  });

  // Hydrate the form when opening in edit mode.
  React.useEffect(() => {
    if (open && existing) {
      reset({
        patientFirstName: existing.patientFirstName,
        patientLastName: existing.patientLastName,
        doctorName: existing.doctorName,
        caseType: existing.caseType,
        category: existing.category,
        collectionId: existing.collectionId,
        estimatedCompletionDate: existing.estimatedCompletionDate
          ? existing.estimatedCompletionDate.slice(0, 10)
          : "",
        notes: existing.notes ?? "",
      });
      setEstTime(extractUtcTime(existing.estimatedCompletionDate));
    } else if (open && !existing) {
      reset({
        patientFirstName: "",
        patientLastName: "",
        doctorName: "",
        caseType: "",
        category: undefined as unknown as CaseCategory,
        collectionId: null,
        estimatedCompletionDate: "",
        notes: "",
      });
      setEstTime("");
    }
  }, [open, existing, reset]);

  async function onSubmit(values: CaseCreateInput) {
    // Combine the date (yyyy-mm-dd) and time (HH:mm) as a UTC wall-clock so the
    // stored value renders identically for every viewer. No date => null.
    const datePart = values.estimatedCompletionDate?.slice(0, 10);
    const payload = {
      ...values,
      estimatedCompletionDate: datePart
        ? new Date(`${datePart}T${estTime || "00:00"}:00.000Z`).toISOString()
        : null,
    };

    try {
      if (isEdit) {
        const res = await update.mutateAsync(payload);
        toast.success("Case updated");
        onOpenChange(false);
        onSaved?.(res.id);
        return;
      }

      const res = await create.mutateAsync(payload);
      toast.success(isEdit ? "Case updated" : "Case created");
      onOpenChange(false);
      setCreatedTrackingId(res.trackingId);
      onSaved?.(res.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const category = watch("category");
  const collectionId = watch("collectionId");
  const caseType = watch("caseType");
  const availableCaseTypes = getCaseTypesForCategory(category);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Case" : "New Case"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the case details."
              : "Create a case when it arrives at the lab."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {existing && (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tracking ID
              </p>
              <TrackingIdCopy trackingId={existing.trackingId} className="mt-2" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient First Name" error={errors.patientFirstName?.message}>
              <Input {...register("patientFirstName")} placeholder="Sara" />
            </Field>
            <Field label="Patient Last Name" error={errors.patientLastName?.message}>
              <Input {...register("patientLastName")} placeholder="Khalil" />
            </Field>
          </div>

          <Field label="Doctor Name" error={errors.doctorName?.message}>
            <Input {...register("doctorName")} placeholder="Dr. Omar Haddad" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={errors.category?.message}>
              <Select
                value={category ?? ""}
                onValueChange={(v) => {
                  setValue("category", v as CaseCategory, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("caseType", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CASE_CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Case Type" error={errors.caseType?.message}>
              <Select
                value={caseType || ""}
                disabled={!category}
                onValueChange={(v) =>
                  setValue("caseType", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      category ? "Select case type" : "Select category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCaseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Collection (optional)"
            error={errors.collectionId?.message}
          >
            <Select
              value={collectionId ?? ""}
              onValueChange={(v) =>
                setValue("collectionId", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a production collection (can set later)" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_COLLECTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Estimated Completion Date"
              error={errors.estimatedCompletionDate?.message}
            >
              <Input type="date" {...register("estimatedCompletionDate")} />
            </Field>
            <Field label="Estimated Completion Time">
              <Input
                type="time"
                value={estTime}
                onChange={(e) => setEstTime(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Notes" error={errors.notes?.message}>
            <Textarea
              {...register("notes")}
              placeholder="Shade, special instructions, etc."
              rows={3}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog
      open={!!createdTrackingId}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setCreatedTrackingId(null);
      }}
    >
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <DialogHeader>
          <DialogTitle>Case Created Successfully</DialogTitle>
          <DialogDescription>
            Share this tracking ID with the doctor for public case tracking.
          </DialogDescription>
        </DialogHeader>
        {createdTrackingId && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tracking ID
            </p>
            <TrackingIdCopy
              trackingId={createdTrackingId}
              className="mt-3 text-sm"
            />
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => setCreatedTrackingId(null)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

/** Pull the "HH:mm" (UTC) out of a stored ISO date; "" when unset/midnight. */
function extractUtcTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return hh === "00" && mm === "00" ? "" : `${hh}:${mm}`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
