/**
 * Makes free-text search safe to embed in a PostgREST `or=(...)` filter with ilike.
 * Removes the characters that carry meaning in that syntax or in LIKE patterns.
 */
export function sanitizeSearchTerm(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFKC")
    .replace(/[,()*%_\\:"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
}

/** Escapes LIKE wildcards for an exact, case-insensitive match. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
