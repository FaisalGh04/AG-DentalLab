export interface ManagedStaffDTO {
  id: string;
  name: string;
  isManager: boolean;
  isActive: boolean;
  order: number;
  failedAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerSecretMetadataDTO {
  kind: "PRIMARY" | "BREAK_GLASS";
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffManagementDTO {
  staff: ManagedStaffDTO[];
  managerSecrets: ManagerSecretMetadataDTO[];
}

export interface StaffManagementSessionDTO {
  unlocked: boolean;
  expiresAt: string | null;
}
