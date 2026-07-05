import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TRACKING_ID_PREFIX = "AG";
const TRACKING_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRACKING_ID_RANDOM_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 10;

export function createTrackingId() {
  const bytes = randomBytes(TRACKING_ID_RANDOM_LENGTH);
  const suffix = Array.from(bytes, (byte) => {
    return TRACKING_ID_ALPHABET[byte % TRACKING_ID_ALPHABET.length];
  }).join("");

  return `${TRACKING_ID_PREFIX}-${suffix}`;
}

export async function generateUniqueTrackingId() {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const trackingId = createTrackingId();
    const existing = await prisma.patientCase.findUnique({
      where: { trackingId },
      select: { id: true },
    });

    if (!existing) return trackingId;
  }

  throw new Error("Unable to generate a unique tracking ID");
}
