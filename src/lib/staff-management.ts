import bcrypt from "bcryptjs";
import type { CaseActionType, Prisma } from "@prisma/client";
import { buildActionLog } from "@/lib/case-audit";
import { prisma } from "@/lib/prisma";
import { BCRYPT_COST } from "@/lib/staff-auth";
import type { StaffCreateInput, StaffUpdateInput } from "@/lib/validations";
import type {
  ManagedStaffDTO,
  StaffManagementDTO,
} from "@/types/staff-management";

const staffSelect = {
  id: true,
  name: true,
  isManager: true,
  isActive: true,
  order: true,
  failedAttempts: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StaffMemberSelect;

type StaffRow = Prisma.StaffMemberGetPayload<{ select: typeof staffSelect }>;

export class StaffManagementError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface StaffAuditContext {
  adminEmail: string | null;
  ip: string;
}

function toDTO(row: StaffRow): ManagedStaffDTO {
  return {
    ...row,
    lockedUntil: row.lockedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function actionLog(
  action: CaseActionType,
  staff: { id: string; name: string },
  audit: StaffAuditContext,
) {
  return buildActionLog({
    caseId: null,
    trackingId: null,
    action,
    outcome: "SUCCESS",
    staffId: staff.id,
    staffName: staff.name,
    adminEmail: audit.adminEmail,
    ip: audit.ip,
  });
}

export async function listManagedStaff(): Promise<StaffManagementDTO> {
  const [staff, managerSecrets] = await Promise.all([
    prisma.staffMember.findMany({
      select: staffSelect,
      orderBy: [{ isManager: "desc" }, { order: "asc" }, { name: "asc" }],
    }),
    prisma.managerSecret.findMany({
      select: {
        kind: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { kind: "asc" },
    }),
  ]);

  return {
    staff: staff.map(toDTO),
    managerSecrets: managerSecrets.map((secret) => ({
      kind: secret.kind,
      lastUsedAt: secret.lastUsedAt?.toISOString() ?? null,
      createdAt: secret.createdAt.toISOString(),
      updatedAt: secret.updatedAt.toISOString(),
    })),
  };
}

export async function createManagedStaff(
  input: StaffCreateInput,
  audit: StaffAuditContext,
): Promise<ManagedStaffDTO> {
  const [passwordHash, demotedManagerHash] = await Promise.all([
    bcrypt.hash(input.password, BCRYPT_COST),
    input.demotedManagerPassword
      ? bcrypt.hash(input.demotedManagerPassword, BCRYPT_COST)
      : Promise.resolve(null),
  ]);

  const created = await prisma.$transaction(async (tx) => {
    const maxOrder = await tx.staffMember.aggregate({ _max: { order: true } });

    if (input.isManager) {
      const currentManager = await tx.staffMember.findFirst({
        where: { isManager: true },
      });
      if (!currentManager || !currentManager.isActive || !demotedManagerHash) {
        throw new StaffManagementError(
          "An active manager and replacement staff password are required.",
          409,
        );
      }

      await tx.staffMember.update({
        where: { id: currentManager.id },
        data: {
          isManager: false,
          pinHash: demotedManagerHash,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      const row = await tx.staffMember.create({
        data: {
          name: input.name,
          pinHash: passwordHash,
          isManager: true,
          isActive: true,
          order: (maxOrder._max.order ?? -1) + 1,
        },
        select: staffSelect,
      });

      await tx.caseActionLog.create({
        data: actionLog("STAFF_UPDATED", currentManager, audit),
      });
      await tx.caseActionLog.create({
        data: actionLog("STAFF_CREATED", row, audit),
      });
      await tx.caseActionLog.create({
        data: actionLog("STAFF_MANAGER_ASSIGNED", row, audit),
      });
      return row;
    }

    const row = await tx.staffMember.create({
      data: {
        name: input.name,
        pinHash: passwordHash,
        isManager: false,
        isActive: input.isActive,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      select: staffSelect,
    });
    await tx.caseActionLog.create({
      data: actionLog("STAFF_CREATED", row, audit),
    });
    return row;
  });

  return toDTO(created);
}

export async function updateManagedStaff(
  id: string,
  input: StaffUpdateInput,
  audit: StaffAuditContext,
): Promise<ManagedStaffDTO> {
  const [passwordHash, demotedManagerHash] = await Promise.all([
    input.password
      ? bcrypt.hash(input.password, BCRYPT_COST)
      : Promise.resolve(null),
    input.demotedManagerPassword
      ? bcrypt.hash(input.demotedManagerPassword, BCRYPT_COST)
      : Promise.resolve(null),
  ]);

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.staffMember.findUnique({ where: { id } });
    if (!existing)
      throw new StaffManagementError("Staff member not found.", 404);

    if (existing.isManager && input.isActive === false) {
      throw new StaffManagementError(
        "The active manager cannot be deactivated. Assign another manager first.",
        409,
      );
    }

    if (input.makeManager && !existing.isManager) {
      const currentManager = await tx.staffMember.findFirst({
        where: { isManager: true },
      });
      if (!currentManager || !currentManager.isActive || !demotedManagerHash) {
        throw new StaffManagementError(
          "An active manager and replacement staff password are required.",
          409,
        );
      }

      // Demote first to satisfy the database's one-manager partial unique index.
      await tx.staffMember.update({
        where: { id: currentManager.id },
        data: {
          isManager: false,
          pinHash: demotedManagerHash,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      const row = await tx.staffMember.update({
        where: { id },
        data: {
          name: input.name,
          ...(passwordHash ? { pinHash: passwordHash } : {}),
          isManager: true,
          isActive: true,
          failedAttempts: 0,
          lockedUntil: null,
        },
        select: staffSelect,
      });

      await tx.caseActionLog.create({
        data: actionLog("STAFF_UPDATED", currentManager, audit),
      });
      await tx.caseActionLog.create({
        data: actionLog("STAFF_MANAGER_ASSIGNED", row, audit),
      });
      return row;
    }

    const data = {
      name: input.name,
      ...(passwordHash
        ? { pinHash: passwordHash, failedAttempts: 0, lockedUntil: null }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isActive === true
        ? { failedAttempts: 0, lockedUntil: null }
        : {}),
    };

    let row: StaffRow;
    if (input.isActive === false) {
      // Recheck the role in the UPDATE itself. A concurrent manager transfer
      // must not be able to promote this row between the read above and a
      // stale deactivation write.
      const result = await tx.staffMember.updateMany({
        where: { id, isManager: false },
        data,
      });
      if (result.count !== 1) {
        throw new StaffManagementError(
          "The active manager cannot be deactivated. Assign another manager first.",
          409,
        );
      }
      const refreshed = await tx.staffMember.findUnique({
        where: { id },
        select: staffSelect,
      });
      if (!refreshed)
        throw new StaffManagementError("Staff member not found.", 404);
      row = refreshed;
    } else {
      row = await tx.staffMember.update({
        where: { id },
        data,
        select: staffSelect,
      });
    }

    const action: CaseActionType =
      existing.isActive && !row.isActive
        ? "STAFF_DEACTIVATED"
        : !existing.isActive && row.isActive
          ? "STAFF_REACTIVATED"
          : "STAFF_UPDATED";
    await tx.caseActionLog.create({ data: actionLog(action, row, audit) });
    return row;
  });

  return toDTO(updated);
}
