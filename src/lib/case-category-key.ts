/**
 * Derive the immutable database key for an admin-created case category.
 * Only the English label is accepted by callers; Arabic is never consulted.
 */
export function generateCaseCategoryKey(labelEn: string): string {
  return labelEn
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[\p{Separator}\p{Punctuation}&]+/gu, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
