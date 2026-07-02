"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { CATEGORY_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { useCreateCase, useUpdateCase } from "@/hooks/use-cases";
import type { AdminCaseDTO } from "@/types/case";
import type { CaseCategory, CaseStatus } from "@prisma/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: AdminCaseDTO | null;
  onSaved?: (id: string) => void;
}

const CATEGORIES = Object.keys(CATEGORY_META) as CaseCategory[];

export function CaseFormDialog({ open, onOpenChange, existing, onSaved }: Props) {
  const isEdit = !!existing;
  const create = useCreateCase();
  const update = useUpdateCase(existing?.id ?? "");
  const pending = create.isPending || update.isPending;

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
      currentStatus: "RECEIVED",
      category: "FIXED_RESTORATIONS",
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
        currentStatus: existing.currentStatus,
        estimatedCompletionDate: existing.estimatedCompletionDate
          ? existing.estimatedCompletionDate.slice(0, 10)
          : "",
        notes: existing.notes ?? "",
      });
    } else if (open && !existing) {
      reset({
        patientFirstName: "",
        patientLastName: "",
        doctorName: "",
        caseType: "",
        category: "FIXED_RESTORATIONS",
        currentStatus: "RECEIVED",
        estimatedCompletionDate: "",
        notes: "",
      });
    }
  }, [open, existing, reset]);

  async function onSubmit(values: CaseCreateInput) {
    // Convert date input (yyyy-mm-dd) to ISO or null.
    const payload = {
      ...values,
      estimatedCompletionDate: values.estimatedCompletionDate
        ? new Date(values.estimatedCompletionDate).toISOString()
        : null,
    };

    try {
      const res = isEdit
        ? await update.mutateAsync(payload)
        : await create.mutateAsync(payload);
      toast.success(isEdit ? "Case updated" : "Case created");
      onOpenChange(false);
      onSaved?.(res.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const category = watch("category");
  const status = watch("currentStatus");

  return (
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

          <Field label="Case Type" error={errors.caseType?.message}>
            <Input
              {...register("caseType")}
              placeholder="Zirconia Bridge (3 units)"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" error={errors.category?.message}>
              <Select
                value={category}
                onValueChange={(v) => setValue("category", v as CaseCategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Status" error={errors.currentStatus?.message}>
              <Select
                value={status}
                onValueChange={(v) =>
                  setValue("currentStatus", v as CaseStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field
            label="Estimated Completion Date"
            error={errors.estimatedCompletionDate?.message}
          >
            <Input type="date" {...register("estimatedCompletionDate")} />
          </Field>

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
  );
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
