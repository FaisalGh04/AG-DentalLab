// Doctor roster operations. Code generation lives here (server-side only) so
// the random suffix is never produced on a client where it could be predicted.

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildCode, randomSuffix, withDoctorPrefix } from "@/lib/doctor-code";
import type { DoctorDTO } from "@/types/doctor";

/** Retries cover the sequence/code unique-constraint race on concurrent creates. */
const MAX_ATTEMPTS = 5;

type DoctorRow = {
  id: string;
  name: string;
  code: string;
  codeLetters: string;
  sequence: number;
  isActive: boolean;
  codeRotatedAt: Date | null;
  createdAt: Date;
  _count?: { cases: number };
};

function toDTO(d: DoctorRow): DoctorDTO {
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    codeLetters: d.codeLetters,
    sequence: d.sequence,
    isActive: d.isActive,
    codeRotatedAt: d.codeRotatedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    caseCount: d._count?.cases ?? 0,
  };
}

/** Roster in creation order, with the linked-case count for each. */
export async function listDoctors(): Promise<DoctorDTO[]> {
  const rows = await prisma.doctor.findMany({
    orderBy: { sequence: "asc" },
    include: { _count: { select: { cases: true } } },
  });
  return rows.map(toDTO);
}

/** A fresh 4-char suffix. Over-samples so rejection sampling always fills it. */
function freshSuffix(): string {
  return randomSuffix(randomBytes(16));
}

/**
 * Create a doctor. `sequence` is max+1 and is NEVER reused after a delete —
 * reusing a number would make an older reference resolve to a different doctor.
 * On a unique-constraint collision (concurrent create) we re-read and retry.
 */
export async function createDoctor(input: {
  name: string;
  codeLetters: string;
}): Promise<DoctorDTO> {
  const name = withDoctorPrefix(input.name);
  const letters = input.codeLetters.trim().toLowerCase();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const max = await prisma.doctor.aggregate({ _max: { sequence: true } });
    const sequence = (max._max.sequence ?? 0) + 1;
    const code = buildCode(letters, sequence, freshSuffix());
    try {
      const created = await prisma.doctor.create({
        data: { name, code, codeLetters: letters, sequence },
        include: { _count: { select: { cases: true } } },
      });
      return toDTO(created);
    } catch (e) {
      // P2002 = unique constraint. Another create took this sequence; retry.
      if (
        typeof e === "object" &&
        e !== null &&
        (e as { code?: string }).code === "P2002" &&
        attempt < MAX_ATTEMPTS - 1
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not allocate a doctor sequence after several attempts");
}

/** Rename only. Code and sequence are immutable once issued — cases reference them. */
export async function renameDoctor(id: string, name: string): Promise<DoctorDTO> {
  const updated = await prisma.doctor.update({
    where: { id },
    data: { name: withDoctorPrefix(name) },
    include: { _count: { select: { cases: true } } },
  });
  return toDTO(updated);
}

export async function setDoctorActive(id: string, isActive: boolean): Promise<DoctorDTO> {
  const updated = await prisma.doctor.update({
    where: { id },
    data: { isActive },
    include: { _count: { select: { cases: true } } },
  });
  return toDTO(updated);
}

/**
 * Regenerate ONLY the random suffix. The {letters}{sequence} part a doctor has
 * memorised stays stable, and the old code stops working immediately.
 */
export async function rotateDoctorCode(id: string): Promise<DoctorDTO> {
  const existing = await prisma.doctor.findUnique({ where: { id } });
  if (!existing) throw new Error("Doctor not found");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = buildCode(existing.codeLetters, existing.sequence, freshSuffix());
    if (code === existing.code) continue; // astronomically unlikely; regenerate
    try {
      const updated = await prisma.doctor.update({
        where: { id },
        data: { code, codeRotatedAt: new Date() },
        include: { _count: { select: { cases: true } } },
      });
      return toDTO(updated);
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        (e as { code?: string }).code === "P2002" &&
        attempt < MAX_ATTEMPTS - 1
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not generate a new code after several attempts");
}

/** How many cases would be UNLINKED (not deleted) by removing this doctor. */
export async function countLinkedCases(id: string): Promise<number> {
  return prisma.patientCase.count({ where: { doctorId: id } });
}

/**
 * Delete a roster entry. Linked cases are NOT deleted — the FK is SET NULL, so
 * each case keeps its doctorName snapshot and simply becomes unlinked.
 */
export async function deleteDoctor(id: string): Promise<{ unlinkedCases: number }> {
  const unlinkedCases = await countLinkedCases(id);
  await prisma.doctor.delete({ where: { id } });
  return { unlinkedCases };
}
