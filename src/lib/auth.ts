import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccessLevel } from "@/lib/supabase/types";

export type CurrentMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  nim: string | null;
  phone: string | null;
  accessLevel: AccessLevel;
  mustChangePassword: boolean;
};

type SessionState =
  | { status: "anonymous" }
  | { status: "no-member"; userId: string } // signed in, but no active member profile
  | { status: "member"; member: CurrentMember };

/**
 * Data-access-layer entry point. Validates the JWT (getClaims) and loads the caller's own member
 * row through RLS. Cached per request.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { status: "anonymous" };

  const { data: row } = await supabase
    .from("members")
    .select("id, user_id, full_name, email, nim, phone, access_level, is_active, must_change_password")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row || !row.is_active) return { status: "no-member", userId };

  return {
    status: "member",
    member: {
      id: row.id,
      userId,
      fullName: row.full_name,
      email: row.email,
      nim: row.nim,
      phone: row.phone,
      accessLevel: row.access_level,
      mustChangePassword: row.must_change_password,
    },
  };
});

/** For pages. Redirects instead of rendering when the caller may not be here. */
export async function requireMember(opts: { allowPendingPasswordChange?: boolean } = {}) {
  const state = await getSessionState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "no-member") redirect("/login?reason=inactive");
  if (state.member.mustChangePassword && !opts.allowPendingPasswordChange) redirect("/change-password");
  return state.member;
}

export async function isAdmin() {
  const state = await getSessionState();
  return state.status === "member" && state.member.accessLevel === "admin" && !state.member.mustChangePassword;
}

/** For admin pages. Non-admins get the forbidden screen, rendered by the caller. */
export async function requireAdminPage() {
  const member = await requireMember();
  return { member, allowed: member.accessLevel === "admin" };
}

export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** For Server Actions. Throws instead of redirecting; actions turn it into an error result. */
export async function requireAdminAction() {
  const state = await getSessionState();
  if (state.status !== "member") throw new AuthorizationError("Your session has ended. Log in again.");
  if (state.member.mustChangePassword) throw new AuthorizationError("Change your temporary password first.");
  if (state.member.accessLevel !== "admin") throw new AuthorizationError();
  return { member: state.member, supabase: await createClient() };
}
