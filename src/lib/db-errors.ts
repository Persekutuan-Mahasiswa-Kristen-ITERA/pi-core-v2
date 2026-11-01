/** Maps PostgREST / Postgres errors to messages that are safe and useful to show an admin. */
type PgLikeError = { code?: string; message?: string; details?: string | null; hint?: string | null };

export function describeDbError(error: PgLikeError, context: Record<string, string> = {}): string {
  switch (error.code) {
    case "23505": {
      const text = `${error.message ?? ""} ${error.details ?? ""}`;
      for (const [needle, message] of Object.entries(context)) {
        if (text.includes(needle)) return message;
      }
      return "That record already exists.";
    }
    case "23503":
      return context.foreign_key ?? "This record is still referenced by other data.";
    case "23514":
      return "Some values are not in the allowed format.";
    case "42501":
      return "You are not allowed to do that.";
    case "P0001":
      if (error.hint === "last_super_admin") return "PI-CORE needs at least one active super admin.";
      if (error.hint === "member_inactive") return "Deactivated members cannot receive assignments.";
      if (error.hint === "member_lecturer") return "Dosen do not hold organizational positions.";
      if (error.hint === "unit_type_mismatch") return "That position does not exist in this kind of unit.";
      if (error.hint === "unit_inactive") return "That unit is inactive. Reactivate it under Structure first.";
      if (error.hint === "org_unit_parent") return "That kind of unit cannot be placed there.";
      return error.message ?? "The change was rejected.";
    case "PGRST116":
      return "Record not found.";
    default:
      return "Something went wrong while saving. Please try again.";
  }
}
