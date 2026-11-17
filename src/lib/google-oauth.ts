import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Google OpenID Connect, done by PI-CORE itself (D-13, option B) so Google's consent screen shows
 * core.pmkitera.web.id instead of the Supabase project domain. After Google proves the email, the
 * callback turns it into a normal Supabase session for the matching member (see the route).
 *
 * Env (server only): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 * Local tests only: GOOGLE_OAUTH_DEV_ENDPOINTS='{"authorize":…,"token":…,"jwks":…,"issuer":…}'
 * points at a fake provider; it is ignored when NODE_ENV is "production" (Vercel, previews too).
 */

export const OAUTH_COOKIE = "pi_core_google_oauth";
export const OAUTH_COOKIE_PATH = "/auth/google";
export const OAUTH_COOKIE_MAX_AGE = 10 * 60;

interface Endpoints {
  authorize: string;
  token: string;
  jwks: string;
  issuers: string[];
}

const GOOGLE: Endpoints = {
  authorize: "https://accounts.google.com/o/oauth2/v2/auth",
  token: "https://oauth2.googleapis.com/token",
  jwks: "https://www.googleapis.com/oauth2/v3/certs",
  issuers: ["https://accounts.google.com", "accounts.google.com"],
};

function endpoints(): Endpoints {
  const dev = process.env.GOOGLE_OAUTH_DEV_ENDPOINTS;
  if (dev && process.env.NODE_ENV !== "production") {
    const e = JSON.parse(dev) as { authorize: string; token: string; jwks: string; issuer: string };
    return { authorize: e.authorize, token: e.token, jwks: e.jwks, issuers: [e.issuer] };
  }
  return GOOGLE;
}

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("Missing GOOGLE_CLIENT_ID (server-only). See .env.example.");
  return id;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

/** One-time values for a sign-in attempt; kept in an httpOnly cookie until the callback. */
export interface OAuthAttempt {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
  /** Set when another app asked for the sign-in (D-14): its id and its random handoff value. */
  app?: string;
  handoff?: string;
}

export function newAttempt(next: string, forApp?: { app: string; handoff: string }): OAuthAttempt {
  return {
    state: b64url(randomBytes(32)),
    verifier: b64url(randomBytes(48)),
    nonce: b64url(randomBytes(32)),
    next,
    ...forApp,
  };
}

export function encodeAttempt(a: OAuthAttempt): string {
  return Buffer.from(JSON.stringify(a)).toString("base64url");
}

export function decodeAttempt(raw: string | undefined): OAuthAttempt | null {
  if (!raw) return null;
  try {
    const a = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<OAuthAttempt>;
    if (![a.state, a.verifier, a.nonce, a.next].every((v) => typeof v === "string" && v.length > 0)) return null;
    if ((a.app === undefined) !== (a.handoff === undefined)) return null;
    if (a.app !== undefined && (typeof a.app !== "string" || typeof a.handoff !== "string")) return null;
    return a as OAuthAttempt;
  } catch {
    return null;
  }
}

/** Constant-time comparison of the state echoed by Google with the one in our cookie. */
export function stateMatches(expected: string, received: string | null): boolean {
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorizeUrl(attempt: OAuthAttempt, redirectUri: string): string {
  const url = new URL(endpoints().authorize);
  url.search = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: attempt.state,
    nonce: attempt.nonce,
    code_challenge: b64url(createHash("sha256").update(attempt.verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Exchanges the authorization code (with the PKCE verifier and our secret) for Google's ID token. */
export async function exchangeCode(code: string, verifier: string, redirectUri: string): Promise<string> {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("Missing GOOGLE_CLIENT_SECRET (server-only). See .env.example.");
  const res = await fetch(endpoints().token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: clientId(),
      client_secret: secret,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token endpoint: HTTP ${res.status}`);
  const body = (await res.json()) as { id_token?: unknown };
  if (typeof body.id_token !== "string") throw new Error("Google token endpoint: no id_token");
  return body.id_token;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUrl = "";

/**
 * Verifies the ID token's signature (Google's published keys), issuer, audience, expiry and nonce,
 * and returns the verified email. Throws on anything else, including an unverified email.
 */
export async function verifiedEmail(idToken: string, nonce: string): Promise<string> {
  const e = endpoints();
  if (!jwks || jwksUrl !== e.jwks) {
    jwks = createRemoteJWKSet(new URL(e.jwks));
    jwksUrl = e.jwks;
  }
  const { payload } = await jwtVerify(idToken, jwks, { issuer: e.issuers, audience: clientId() });
  return emailFromClaims(payload, nonce);
}

/** Claim checks after the signature is verified (pure, unit tested). */
export function emailFromClaims(payload: JWTPayload & Record<string, unknown>, nonce: string): string {
  if (typeof payload.nonce !== "string" || !stateMatches(nonce, payload.nonce)) throw new Error("nonce mismatch");
  // Google sends a boolean; very old tokens used the string "true".
  if (payload.email_verified !== true && payload.email_verified !== "true")
    throw new Error("email not verified by Google");
  if (typeof payload.email !== "string" || !payload.email.includes("@")) throw new Error("no email in token");
  return payload.email.trim().toLowerCase();
}
