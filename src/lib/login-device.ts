export const LOGIN_DEVICE_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-ag-login-device"
    : "ag-login-device";

const LOGIN_DEVICE_ID_PATTERN = /^[a-f0-9]{32}$/;

export function isLoginDeviceId(value: string | undefined): value is string {
  return !!value && LOGIN_DEVICE_ID_PATTERN.test(value);
}

/** Generate a 128-bit opaque browser identifier using Web Crypto. */
export function generateLoginDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Read the opaque login-device cookie from an Auth.js callback request.
 * Invalid values are ignored rather than entering attacker-controlled Redis keys.
 */
export function getLoginDeviceId(headers: Headers): string | null {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== LOGIN_DEVICE_COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();
    return isLoginDeviceId(value) ? value : null;
  }

  return null;
}
