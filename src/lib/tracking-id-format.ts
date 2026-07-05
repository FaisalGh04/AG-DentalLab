export function formatTrackingId(input: string) {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "");
  if (/^AG[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
    return `AG-${normalized.slice(2)}`;
  }
  return normalized;
}
