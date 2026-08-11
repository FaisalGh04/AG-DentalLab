export const CLOUDFLARE_ORIGIN_HEADER = "x-ag-origin-secret";
export const VERIFIED_CLOUDFLARE_ORIGIN_HEADER =
  "x-ag-cloudflare-origin-verified";

const VERIFIED_VALUE = "1";

export function isCloudflareOriginVerificationRequired(): boolean {
  const secret = process.env.CLOUDFLARE_ORIGIN_SECRET;
  return (
    process.env.NODE_ENV === "production" &&
    secret !== undefined &&
    secret.length > 0
  );
}

/**
 * Compare SHA-256 digests so comparison work does not stop at the first
 * mismatched character. Web Crypto keeps this helper safe for the Edge runtime.
 */
async function constantTimeSecretEqual(
  presented: string,
  expected: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [presentedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(presented)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(presentedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}

export async function verifyCloudflareOriginSecret(
  presented: string | null,
): Promise<boolean> {
  const expected = process.env.CLOUDFLARE_ORIGIN_SECRET;
  if (!expected || presented === null) return false;
  return constantTimeSecretEqual(presented, expected);
}

export function markCloudflareOriginVerified(headers: Headers): void {
  headers.set(VERIFIED_CLOUDFLARE_ORIGIN_HEADER, VERIFIED_VALUE);
}

export function isCloudflareOriginVerified(headers: Headers): boolean {
  return headers.get(VERIFIED_CLOUDFLARE_ORIGIN_HEADER) === VERIFIED_VALUE;
}
