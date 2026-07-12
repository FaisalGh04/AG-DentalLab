// Shared translation helpers. Used by both the public LanguageProvider and the
// admin-scoped AdminI18nProvider so the resolve + {var} substitution logic lives
// in exactly one place.

/** Walk a dot-path (e.g. "nav.dashboard") into a nested dictionary. */
export function resolve(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

export interface Translator {
  /** Translate a dot-path key to a string, with optional {var} substitution. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translate a dot-path key that points at an array (strings or objects). */
  tList: <T = string>(key: string) => T[];
}

/**
 * Build `t` / `tList` bound to a primary dictionary with a fallback dictionary
 * (typically the default-locale dict). Missing keys fall back, then return the
 * raw key so untranslated strings are visible rather than blank.
 */
export function createTranslator(dict: unknown, fallback: unknown): Translator {
  const t = (key: string, vars?: Record<string, string | number>) => {
    let node = resolve(dict, key);
    if (typeof node !== "string") node = resolve(fallback, key);
    if (typeof node !== "string") return key;
    let out = node;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.split(`{${k}}`).join(String(v));
      }
    }
    return out;
  };

  const tList = <T,>(key: string): T[] => {
    let node = resolve(dict, key);
    if (!Array.isArray(node)) node = resolve(fallback, key);
    return Array.isArray(node) ? (node as T[]) : [];
  };

  return { t, tList };
}
