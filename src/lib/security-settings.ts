import { prisma } from "@/lib/prisma";

export const GLOBAL_SECURITY_SETTING_ID = "global";

export interface SecuritySettingsDTO {
  staffConfirmationEnabled: boolean;
  updatedAt: string | null;
}

/**
 * Read the persisted global protection state. Missing rows and database read
 * failures both resolve to enabled: a configuration problem must never become
 * an implicit security bypass.
 */
export async function getStaffConfirmationEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.adminSecuritySetting.findUnique({
      where: { id: GLOBAL_SECURITY_SETTING_ID },
      select: { staffConfirmationEnabled: true },
    });
    return setting?.staffConfirmationEnabled ?? true;
  } catch (err) {
    console.error(
      "[security-settings] Read failed; keeping staff confirmation enabled:",
      err,
    );
    return true;
  }
}

export async function getSecuritySettings(): Promise<SecuritySettingsDTO> {
  const setting = await prisma.adminSecuritySetting.findUnique({
    where: { id: GLOBAL_SECURITY_SETTING_ID },
    select: { staffConfirmationEnabled: true, updatedAt: true },
  });
  return {
    staffConfirmationEnabled: setting?.staffConfirmationEnabled ?? true,
    updatedAt: setting?.updatedAt.toISOString() ?? null,
  };
}
