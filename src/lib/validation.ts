import { z } from "zod";
import type { FieldErrors } from "@/lib/action-result";

/**
 * Input schemas. Every Server Action parses its FormData with one of these; nothing submitted
 * by the client is trusted (ids, flags, access levels included). Shapes are whitelists, so extra
 * form fields are dropped (no mass assignment).
 */

const optionalText = (schema: z.ZodString) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(schema.nullable());

export const accessLevelSchema = z.enum(["super_admin", "admin", "member"]);

/** Checkbox: present ("on") = true, missing = false. */
const checkbox = z.string().transform((v) => v === "on" || v === "true");

export const memberSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the full name.").max(120, "Use at most 120 characters."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254)),
  nim: optionalText(z.string().regex(/^[0-9]{6,12}$/, "NIM must be 6–12 digits.")),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(/^\+?[0-9]{8,15}$/, "Enter 8–15 digits, optionally starting with +.")
        .nullable(),
    ),
  // Only super admins see this field; for everyone else it is absent and the action keeps the
  // current level (or "member" on create). The database enforces the same rule.
  accessLevel: z.union([z.literal(""), accessLevelSchema]).transform((v) => (v === "" ? null : v)),
});
export type MemberInput = z.infer<typeof memberSchema>;

export const idSchema = z.uuid("Invalid id.");

export const roleSchema = z.object({
  name: z.string().trim().min(2, "Enter a role name.").max(60, "Use at most 60 characters."),
  description: optionalText(z.string().max(280, "Use at most 280 characters.")),
  grantsAdmin: checkbox,
});
export type RoleInput = z.infer<typeof roleSchema>;

export const ORG_UNIT_TYPES = ["organization", "bph", "department", "bureau", "division"] as const;
/** Unit types a position can belong to (the root holds no positions). */
export const POSITION_UNIT_TYPES = ["bph", "department", "bureau", "division"] as const;

const sortOrder = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "100" : v))
  .pipe(z.coerce.number<string>().int("Use a whole number.").min(0, "Use 0 or more.").max(9999, "Use at most 9999."));

const unitName = z.string().trim().min(2, "Enter a name.").max(80, "Use at most 80 characters.");

export const orgUnitCreateSchema = z.object({
  parentId: idSchema,
  type: z.enum(["bph", "department", "bureau", "division"], "Choose a unit type."),
  name: unitName,
  sortOrder,
});
export type OrgUnitCreateInput = z.infer<typeof orgUnitCreateSchema>;

export const orgUnitUpdateSchema = z.object({ name: unitName, sortOrder });

export const positionSchema = z.object({
  name: z.string().trim().min(2, "Enter a position name.").max(80, "Use at most 80 characters."),
  rank: z
    .string()
    .trim()
    .pipe(
      z.coerce
        .number<string>("Enter a rank.")
        .int("Use a whole number.")
        .min(1, "Use 1 or more.")
        .max(999, "Use at most 999."),
    ),
  isUniquePerUnit: checkbox,
});
export const positionCreateSchema = positionSchema.extend({
  unitType: z.enum(POSITION_UNIT_TYPES, "Choose a unit type."),
});

/** Multi-value field (checkbox group) of ids. */
export function parseIdList(formData: FormData, name: string) {
  return z
    .array(idSchema)
    .max(50)
    .parse(formData.getAll(name).filter((v) => typeof v === "string" && v !== ""));
}

const isoDate = optionalText(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date."));

export const periodSchema = z
  .object({
    label: z
      .string()
      .trim()
      .regex(/^\d{4}\/\d{4}$/, "Use the format 2026/2027.")
      .refine((v) => {
        const [a, b] = v.split("/").map(Number);
        return b === a + 1;
      }, "The second year must follow the first (e.g. 2026/2027)."),
    startsOn: isoDate,
    endsOn: isoDate,
  })
  .refine((v) => !v.startsOn || !v.endsOn || v.endsOn > v.startsOn, {
    path: ["endsOn"],
    message: "End date must be after the start date.",
  });
export type PeriodInput = z.infer<typeof periodSchema>;

export const assignmentSchema = z.object({
  memberId: z.uuid("Choose a member."),
  orgUnitId: z.uuid("Choose a unit."),
  positionId: z.uuid("Choose a position."),
  periodId: z.uuid("Choose a period."),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one digit.");

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one.",
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const orgSettingsSchema = z.object({
  orgName: z.string().trim().min(2, "Enter the organization name.").max(120, "Use at most 120 characters."),
});

/** Parses FormData against a schema; returns field errors in the ActionResult shape. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  fields: readonly string[],
): { success: true; data: z.infer<S> } | { success: false; fieldErrors: FieldErrors } {
  const raw: Record<string, string> = {};
  for (const key of fields) {
    const value = formData.get(key);
    raw[key] = typeof value === "string" ? value : "";
  }
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: z.flattenError(result.error).fieldErrors as FieldErrors };
}
