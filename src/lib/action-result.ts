export type FieldErrors = Partial<Record<string, string[]>>;

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export const initialActionState = { ok: false, message: "" } as ActionResult<never>;
