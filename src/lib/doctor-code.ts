// Doctor public-code generation: ag-{letters}{sequence}-{random4}
//
// The 3-letter part is a TRANSLITERATION SUGGESTION only. Arabic omits short
// vowels, so معتصم is written m-ʿ-t-s-m and could reasonably romanise as
// "Mutasim", "Moatasem", "Mu'tasim"… There is no deterministic answer, which is
// exactly why the admin can edit these letters before saving.
//
// Two-tier approach:
//   1. A dictionary of common Arabic given names -> their conventional Latin
//      spelling. This is what makes the output usable: it restores the vowels a
//      character map cannot know about.
//   2. A character map fallback for anything not in the dictionary, with
//      heuristic vowel handling.
//
// Collisions between two doctors' letters are FINE and expected (سامي and سمى
// both suggest "sam"): the sequence number differentiates them, and `code` has
// a unique constraint as the real backstop.

/** Ambiguity-free alphabet, same convention as TRACKING_ID_ALPHABET. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 4;
const LETTERS_LENGTH = 3;

/**
 * Conventional romanisations for the given names we actually expect. Keyed by
 * the bare Arabic first name. Extend this rather than fighting the char map.
 */
const NAME_DICTIONARY: Record<string, string> = {
  معتصم: "mutasim",
  عامر: "amer",
  هالة: "hala",
  أمين: "amin",
  امين: "amin",
  فريد: "farid",
  خالد: "khalid",
  احمد: "ahmad",
  أحمد: "ahmad",
  سجى: "saja",
  ثائر: "thaer",
  داوود: "dawood",
  داود: "dawood",
  منال: "manal",
  عميد: "ameed",
  سمى: "sama",
  سما: "sama",
  محمود: "mahmoud",
  عمر: "omar",
  محسن: "mohsen",
  حسين: "hussein",
  سامي: "sami",
  محمد: "mohammad",
  رنى: "rana",
  رنا: "rana",
  نيرمين: "nirmeen",
  وليد: "waleed",
  رند: "rand",
  عالية: "alia",
  مصعب: "musab",
  لارا: "lara",
};

/** Character fallback. Deliberately lossy — it only needs to be plausible. */
const CHAR_MAP: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ى: "a", ة: "a", ء: "",
  ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh",
  ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh",
  ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n",
  ه: "h", و: "o", ي: "i", ئ: "", ؤ: "",
};

/** Honorifics stripped before looking at the given name. */
const HONORIFICS = [/^dr\.?\s+/i, /^د\.?\s+/, /^الدكتور\s+/, /^دكتور\s+/];

/** The name as stored, always carrying the "Dr. " prefix. */
export function withDoctorPrefix(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return name;
  for (const h of HONORIFICS) {
    if (h.test(name)) return `Dr. ${name.replace(h, "").trim()}`;
  }
  return `Dr. ${name}`;
}

/** The given (first) name, with any honorific removed. */
export function givenName(raw: string): string {
  let name = raw.trim().replace(/\s+/g, " ");
  for (const h of HONORIFICS) name = name.replace(h, "");
  return name.trim().split(" ")[0] ?? "";
}

/** Full romanisation of a given name — dictionary first, then char map. */
export function romanize(raw: string): string {
  const first = givenName(raw);
  if (!first) return "";
  const dict = NAME_DICTIONARY[first];
  if (dict) return dict;
  // Latin input passes through unchanged (one-off English-named doctors).
  if (/^[\x20-\x7E]+$/.test(first)) {
    return first.toLowerCase().replace(/[^a-z]/g, "");
  }
  return [...first]
    .map((ch) => CHAR_MAP[ch] ?? "")
    .join("")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export interface LetterSuggestion {
  letters: string;
  romanized: string;
  /** True when the result is a guess the admin should look at. */
  needsReview: boolean;
  reason?: string;
}

/**
 * Suggest the 3-letter code fragment. ALWAYS a suggestion — the caller is
 * expected to let a human confirm or override it.
 */
export function suggestLetters(rawName: string): LetterSuggestion {
  const first = givenName(rawName);
  const romanized = romanize(rawName);
  const letters = romanized.slice(0, LETTERS_LENGTH);

  if (!letters) {
    return { letters: "", romanized, needsReview: true, reason: "no letters produced" };
  }
  if (letters.length < LETTERS_LENGTH) {
    return {
      letters,
      romanized,
      needsReview: true,
      reason: `only ${letters.length} letter(s) available`,
    };
  }
  if (!NAME_DICTIONARY[first] && !/^[\x20-\x7E]+$/.test(first)) {
    return {
      letters,
      romanized,
      needsReview: true,
      reason: "char-map fallback (no dictionary entry) — vowels are guessed",
    };
  }
  return { letters, romanized, needsReview: false };
}

/** Cryptographically random suffix, rejection-sampled to avoid modulo bias. */
export function randomSuffix(bytes: Uint8Array): string {
  const out: string[] = [];
  const limit = 256 - (256 % CODE_ALPHABET.length);
  for (const b of bytes) {
    if (b >= limit) continue;
    out.push(CODE_ALPHABET.charAt(b % CODE_ALPHABET.length));
    if (out.length === RANDOM_LENGTH) break;
  }
  return out.join("");
}

/** ag-mut001-K7P2 */
export function buildCode(letters: string, sequence: number, suffix: string): string {
  return `ag-${letters.toLowerCase()}${String(sequence).padStart(3, "0")}-${suffix}`;
}

export const DOCTOR_CODE_CONSTANTS = {
  CODE_ALPHABET,
  RANDOM_LENGTH,
  LETTERS_LENGTH,
} as const;
