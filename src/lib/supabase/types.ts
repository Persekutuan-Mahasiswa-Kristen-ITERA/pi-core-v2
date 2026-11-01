import type { Database } from "./database.types";

export type { Database };
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
/** Stored on the member row and set by a super admin. */
export type AccessLevel = Database["public"]["Enums"]["access_level"];
export type OrgUnitType = Database["public"]["Enums"]["org_unit_type"];
/** student = mahasiswa (NIM, can hold positions); lecturer = dosen (NIP/NIDN, e.g. the pembina; no positions). */
export type MemberType = Database["public"]["Enums"]["member_type"];
/**
 * What the caller may actually do: the stored level, raised to "admin" while the member holds a
 * position that carries an admin-granting role in the active period. Computed by the database
 * (`public.current_access()`), the same rule RLS uses.
 */
export type EffectiveAccess = "super_admin" | "admin" | "member";

type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];
/** The columns a client writes. unit_type / is_unique_per_unit are copied from the position by a trigger. */
export type AssignmentWrite = Pick<AssignmentInsert, "member_id" | "org_unit_id" | "position_id" | "period_id">;
/**
 * The generated Insert type marks the trigger-filled columns as required (they have no default), and
 * clients have no privilege to send them. This is the one place that bridges the two.
 */
export const assignmentRow = (row: AssignmentWrite) => row as AssignmentInsert;
