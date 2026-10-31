/**
 * Returns `candidate` only if it is a same-origin, absolute path; otherwise "/".
 * Blocks open redirects such as "//evil.com", "/\\evil.com", "https://evil.com" and
 * control-character tricks.
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback = "/"): string {
  if (!candidate || typeof candidate !== "string") return fallback;
  if (candidate.length > 512) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  try {
    const url = new URL(candidate, "http://pi-core.invalid");
    if (url.origin !== "http://pi-core.invalid") return fallback;
    if (url.pathname === "/login") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
