import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchTerm } from "@/lib/search";

/**
 * Read model. Every function uses the caller's RLS-bound client, so a non-admin calling one of
 * the admin queries simply gets their own rows (or none) — never someone else's.
 * Relations are fetched with PostgREST embedding (one request per list, no N+1).
 */

export const MEMBERS_PAGE_SIZE = 20;

function fail(context: string, error: { message: string }): never {
  throw new Error(`${context}: ${error.message}`);
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const [members, roles, period] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("roles").select("id", { count: "exact", head: true }),
    supabase.from("periods").select("id, label").eq("is_active", true).maybeSingle(),
  ]);
  if (members.error) fail("members count", members.error);
  if (roles.error) fail("roles count", roles.error);
  if (period.error) fail("active period", period.error);
  return { totalMembers: members.count ?? 0, availableRoles: roles.count ?? 0, activePeriod: period.data };
}

export async function getActivePeriod() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("periods").select("id, label").eq("is_active", true).maybeSingle();
  if (error) fail("active period", error);
  return data;
}

export async function listPeriods() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("periods")
    .select("id, label, starts_on, ends_on, is_active")
    .order("label", { ascending: false });
  if (error) fail("periods", error);
  return data;
}

export async function getPeriod(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("periods").select("id, label, starts_on, ends_on, is_active").eq("id", id).maybeSingle();
  if (error) fail("period", error);
  return data;
}

export async function listRoleOverview() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_overview")
    .select("id, name, description, active_member_count, assignment_count")
    .order("sort_order")
    .order("name");
  if (error) fail("roles", error);
  return data;
}

export async function getRoleDetail(id: string) {
  const supabase = await createClient();
  const activePeriod = await getActivePeriod();
  const [role, positions, assignments] = await Promise.all([
    supabase.from("role_overview").select("id, name, description, active_member_count, assignment_count").eq("id", id).maybeSingle(),
    supabase.from("positions").select("id, name, assignments(count)").eq("role_id", id).order("name"),
    activePeriod
      ? supabase
          .from("assignments")
          .select("id, members!inner(id, full_name, is_active), positions(name)")
          .eq("role_id", id)
          .eq("period_id", activePeriod.id)
          .eq("members.is_active", true)
          .order("full_name", { referencedTable: "members" })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (role.error) fail("role", role.error);
  if (positions.error) fail("positions", positions.error);
  if (assignments.error) fail("role assignments", assignments.error);
  if (!role.data) return null;
  return {
    role: role.data,
    activePeriod,
    positions: positions.data.map((p) => ({ id: p.id, name: p.name, usage: p.assignments[0]?.count ?? 0 })),
    members: (assignments.data ?? [])
      .map((a) => ({ assignmentId: a.id, memberId: a.members.id, fullName: a.members.full_name, position: a.positions?.name ?? "—" }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
  };
}

export async function listRolesWithPositions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, positions(id, name)")
    .order("sort_order")
    .order("name")
    .order("name", { referencedTable: "positions" });
  if (error) fail("roles", error);
  return data;
}

export type MemberListFilters = { q?: string; roleId?: string; periodId?: string; status?: "active" | "inactive"; page?: number };

export async function listMembers(filters: MemberListFilters) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * MEMBERS_PAGE_SIZE;
  const filtered = Boolean(filters.roleId || filters.periodId);

  // `!inner` turns the embedded filters into "has an assignment matching role AND period".
  let query = filtered
    ? supabase
        .from("members")
        .select(
          "id, full_name, email, access_level, is_active, assignments!inner(id, role_id, period_id, roles(name), positions(name), periods(label, is_active))",
          { count: "exact" },
        )
    : supabase
        .from("members")
        .select(
          "id, full_name, email, access_level, is_active, assignments(id, role_id, period_id, roles(name), positions(name), periods(label, is_active))",
          { count: "exact" },
        );

  query = query.eq("is_active", filters.status !== "inactive");
  if (filters.roleId) query = query.eq("assignments.role_id", filters.roleId);
  if (filters.periodId) query = query.eq("assignments.period_id", filters.periodId);
  const q = sanitizeSearchTerm(filters.q);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

  const { data, error, count } = await query.order("full_name").range(from, from + MEMBERS_PAGE_SIZE - 1);
  if (error) fail("members", error);

  return {
    page,
    total: count ?? 0,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / MEMBERS_PAGE_SIZE)),
    rows: data.map((m) => {
      // Prefer an assignment in the active period, then the most recent one.
      const sorted = [...m.assignments].sort((a, b) => {
        if (a.periods?.is_active !== b.periods?.is_active) return a.periods?.is_active ? -1 : 1;
        return (b.periods?.label ?? "").localeCompare(a.periods?.label ?? "");
      });
      const primary = sorted[0];
      return {
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        accessLevel: m.access_level,
        isActive: m.is_active,
        role: primary?.roles?.name ?? null,
        period: primary?.periods?.label ?? null,
        extraAssignments: Math.max(0, sorted.length - 1),
      };
    }),
  };
}

export async function getMember(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, user_id, full_name, email, nim, phone, access_level, is_active, must_change_password, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("member", error);
  return data;
}

export async function listAssignmentsForMember(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("id, roles(name), positions(name), periods(label, is_active)")
    .eq("member_id", memberId);
  if (error) fail("member assignments", error);
  return data
    .map((a) => ({ id: a.id, role: a.roles.name, position: a.positions?.name ?? "—", period: a.periods.label, activePeriod: a.periods.is_active }))
    .sort((a, b) => b.period.localeCompare(a.period) || a.role.localeCompare(b.role));
}

export async function listAssignments(periodId: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("assignments")
    .select("id, member_id, role_id, position_id, period_id, members(full_name, is_active), roles(name, sort_order), positions(name), periods(label)");
  if (periodId) query = query.eq("period_id", periodId);
  const { data, error } = await query;
  if (error) fail("assignments", error);
  return data
    .map((a) => ({
      id: a.id,
      memberName: a.members.full_name,
      memberActive: a.members.is_active,
      role: a.roles.name,
      roleOrder: a.roles.sort_order,
      position: a.positions?.name ?? "—",
      period: a.periods.label,
    }))
    .sort((a, b) => a.roleOrder - b.roleOrder || a.role.localeCompare(b.role) || a.memberName.localeCompare(b.memberName));
}

export async function getAssignment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("id, member_id, role_id, position_id, period_id")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("assignment", error);
  return data;
}

export async function listActiveMembersForPicker() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select("id, full_name, email").eq("is_active", true).order("full_name");
  if (error) fail("member picker", error);
  return data;
}

export async function getOrgSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("org_settings").select("org_name, updated_at").maybeSingle();
  if (error) fail("settings", error);
  return data;
}
