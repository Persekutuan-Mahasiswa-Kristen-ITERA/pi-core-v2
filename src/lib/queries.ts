import "server-only";
import { createClient } from "@/lib/supabase/server";
import { sanitizeSearchTerm } from "@/lib/search";
import { flattenUnitTree, unitLabel, type FlatUnit } from "@/lib/org-structure";

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
  const { data, error } = await supabase
    .from("periods")
    .select("id, label, starts_on, ends_on, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("period", error);
  return data;
}

const ROLE_OVERVIEW_COLUMNS =
  "id, key, name, description, is_system, grants_admin, active_member_count, position_count" as const;

export async function listRoleOverview() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_overview")
    .select(ROLE_OVERVIEW_COLUMNS)
    .order("sort_order")
    .order("name");
  if (error) fail("roles", error);
  return data;
}

/** Every unit, flattened in tree order. Small (tens of rows), so callers fetch it whole. */
export async function listOrgUnits(): Promise<FlatUnit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("org_units").select("id, parent_id, type, name, sort_order, is_active");
  if (error) fail("org units", error);
  return flattenUnitTree(data);
}

export async function getOrgUnit(id: string) {
  const supabase = await createClient();
  const [unit, children, assignments] = await Promise.all([
    supabase.from("org_units").select("id, parent_id, type, name, sort_order, is_active").eq("id", id).maybeSingle(),
    supabase.from("org_units").select("id", { count: "exact", head: true }).eq("parent_id", id),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("org_unit_id", id),
  ]);
  if (unit.error) fail("org unit", unit.error);
  if (children.error) fail("org unit children", children.error);
  if (assignments.error) fail("org unit assignments", assignments.error);
  if (!unit.data) return null;
  return { unit: unit.data, childCount: children.count ?? 0, assignmentCount: assignments.count ?? 0 };
}

export async function listPositions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select(
      "id, name, unit_type, rank, is_unique_per_unit, position_roles(role_id), assignments!assignments_position_type_fk(count)",
    )
    .order("rank")
    .order("name");
  if (error) fail("positions", error);
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    unitType: p.unit_type,
    rank: p.rank,
    isUniquePerUnit: p.is_unique_per_unit,
    roleIds: p.position_roles.map((pr) => pr.role_id),
    usage: p.assignments[0]?.count ?? 0,
  }));
}

export async function getPosition(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("positions")
    .select(
      "id, name, unit_type, rank, is_unique_per_unit, position_roles(role_id), assignments!assignments_position_type_fk(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("position", error);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    unitType: data.unit_type,
    rank: data.rank,
    isUniquePerUnit: data.is_unique_per_unit,
    roleIds: data.position_roles.map((pr) => pr.role_id),
    usage: data.assignments[0]?.count ?? 0,
  };
}

export async function getRoleDetail(id: string) {
  const supabase = await createClient();
  const [role, mapped, activePeriod, units] = await Promise.all([
    supabase.from("role_overview").select(ROLE_OVERVIEW_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("position_roles").select("positions(id, name, unit_type, rank)").eq("role_id", id),
    getActivePeriod(),
    listOrgUnits(),
  ]);
  if (role.error) fail("role", role.error);
  if (mapped.error) fail("role positions", mapped.error);
  if (!role.data) return null;
  const positions = mapped.data.map((m) => m.positions).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

  let members: {
    assignmentId: string;
    memberId: string;
    fullName: string;
    position: string;
    unit: string;
    rank: number;
    unitOrder: number;
  }[] = [];
  if (activePeriod && positions.length) {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        "id, org_unit_id, members!inner(id, full_name, is_active), positions!assignments_position_type_fk(name, rank)",
      )
      .in(
        "position_id",
        positions.map((p) => p.id),
      )
      .eq("period_id", activePeriod.id)
      .eq("members.is_active", true);
    if (error) fail("role assignments", error);
    const unitById = new Map(units.map((u) => [u.id, u]));
    members = data
      .map((a) => {
        const unit = unitById.get(a.org_unit_id);
        return {
          assignmentId: a.id,
          memberId: a.members.id,
          fullName: a.members.full_name,
          position: a.positions.name,
          unit: unit ? unitLabel(unit) : "—",
          rank: a.positions.rank,
          unitOrder: unit?.order ?? 0,
        };
      })
      .sort((a, b) => a.rank - b.rank || a.unitOrder - b.unitOrder || a.fullName.localeCompare(b.fullName));
  }
  return { role: role.data, activePeriod, positions, members };
}

export async function listRolesForPicker() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, grants_admin")
    .order("sort_order")
    .order("name");
  if (error) fail("roles", error);
  return data;
}

export type MemberListFilters = {
  q?: string;
  roleId?: string;
  periodId?: string;
  status?: "active" | "inactive";
  page?: number;
};

type PositionWithRoles = { name: string; position_roles: { roles: { grants_admin: boolean } | null }[] };
const carriesAdmin = (p: PositionWithRoles | null) => Boolean(p?.position_roles.some((pr) => pr.roles?.grants_admin));

export async function listMembers(filters: MemberListFilters) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * MEMBERS_PAGE_SIZE;

  // A role is carried by positions; filter on those positions.
  let rolePositionIds: string[] | null = null;
  if (filters.roleId) {
    const { data, error } = await supabase.from("position_roles").select("position_id").eq("role_id", filters.roleId);
    if (error) fail("role positions", error);
    rolePositionIds = data.map((r) => r.position_id);
    if (!rolePositionIds.length) return { page, total: 0, pageCount: 1, rows: [] };
  }
  const filtered = Boolean(rolePositionIds || filters.periodId);

  // `!inner` turns the embedded filters into "has an assignment matching role AND period".
  let query = filtered
    ? supabase
        .from("members")
        .select(
          "id, full_name, email, member_type, access_level, is_active, assignments!inner(id, org_unit_id, position_id, period_id, positions!assignments_position_type_fk(name, position_roles(roles(grants_admin))), org_units(name), periods(label, is_active))",
          { count: "exact" },
        )
    : supabase
        .from("members")
        .select(
          "id, full_name, email, member_type, access_level, is_active, assignments(id, org_unit_id, position_id, period_id, positions!assignments_position_type_fk(name, position_roles(roles(grants_admin))), org_units(name), periods(label, is_active))",
          { count: "exact" },
        );

  query = query.eq("is_active", filters.status !== "inactive");
  if (rolePositionIds) query = query.in("assignments.position_id", rolePositionIds);
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
      const positionAdmin = m.assignments.some((a) => a.periods?.is_active && carriesAdmin(a.positions));
      return {
        id: m.id,
        fullName: m.full_name,
        email: m.email,
        accessLevel: m.access_level,
        // Mirrors private.is_admin() for display. Only exact when the list is not filtered, since a
        // filter narrows the embedded assignments; the badge is informational, RLS decides.
        isAdmin: m.access_level !== "member" || positionAdmin,
        isActive: m.is_active,
        isLecturer: m.member_type === "lecturer",
        assignment: primary ? `${primary.positions?.name ?? "—"} · ${primary.org_units?.name ?? "—"}` : null,
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
    .select(
      "id, user_id, member_type, full_name, email, nim, nip, phone, access_level, is_active, must_change_password, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) fail("member", error);
  return data;
}

export async function listAssignmentsForMember(memberId: string) {
  const supabase = await createClient();
  const [result, units] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, org_unit_id, positions!assignments_position_type_fk(name, rank), periods(label, is_active)")
      .eq("member_id", memberId),
    listOrgUnits(),
  ]);
  if (result.error) fail("member assignments", result.error);
  const unitById = new Map(units.map((u) => [u.id, u]));
  return result.data
    .map((a) => {
      const unit = unitById.get(a.org_unit_id);
      return {
        id: a.id,
        position: a.positions.name,
        rank: a.positions.rank,
        unit: unit ? unitLabel(unit) : "—",
        period: a.periods.label,
        activePeriod: a.periods.is_active,
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period) || a.rank - b.rank || a.unit.localeCompare(b.unit));
}

export async function listAssignments(periodId: string | null) {
  const supabase = await createClient();
  let query = supabase
    .from("assignments")
    .select(
      "id, org_unit_id, members(full_name, is_active), positions!assignments_position_type_fk(name, rank), periods(label)",
    );
  if (periodId) query = query.eq("period_id", periodId);
  const [result, units] = await Promise.all([query, listOrgUnits()]);
  if (result.error) fail("assignments", result.error);
  const unitById = new Map(units.map((u) => [u.id, u]));
  return result.data
    .map((a) => {
      const unit = unitById.get(a.org_unit_id);
      return {
        id: a.id,
        memberName: a.members.full_name,
        memberActive: a.members.is_active,
        position: a.positions.name,
        rank: a.positions.rank,
        unit: unit ? unitLabel(unit) : "—",
        unitOrder: unit?.order ?? Number.MAX_SAFE_INTEGER,
        period: a.periods.label,
      };
    })
    .sort(
      (a, b) =>
        b.period.localeCompare(a.period) ||
        a.unitOrder - b.unitOrder ||
        a.rank - b.rank ||
        a.memberName.localeCompare(b.memberName),
    );
}

export async function getAssignment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("id, member_id, org_unit_id, position_id, period_id")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("assignment", error);
  return data;
}

export async function listActiveMembersForPicker() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, full_name, email")
    .eq("is_active", true)
    .eq("member_type", "student") // dosen hold no positions
    .order("full_name");
  if (error) fail("member picker", error);
  return data;
}

export async function getOrgSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("org_settings").select("org_name, updated_at").maybeSingle();
  if (error) fail("settings", error);
  return data;
}
