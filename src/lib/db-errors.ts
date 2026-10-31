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
      if (error.hint === "last_admin") return "PI-CORE needs at least one active admin.";
      if (error.hint === "member_inactive") return "Deactivated members cannot receive assignments.";
      return error.message ?? "The change was rejected.";
    case "PGRST116":
      return "Record not found.";
    default:
      return "Something went wrong while saving. Please try again.";
  }
}
