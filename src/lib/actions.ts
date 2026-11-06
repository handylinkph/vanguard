import { z } from "zod";

export type ActionResult = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | null;

export function formToObject(fd: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      if (Array.isArray(obj[key])) (obj[key] as unknown[]).push(v);
      else obj[key] = [v];
    } else obj[k] = v;
  }
  return obj;
}

export function parseForm<T extends z.ZodType>(schema: T, fd: FormData):
  { data: z.infer<T>; error?: undefined } | { data?: undefined; error: NonNullable<ActionResult> } {
  const res = schema.safeParse(formToObject(fd));
  if (res.success) return { data: res.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of res.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { error: { error: "Please check the highlighted fields.", fieldErrors } };
}

// Common field helpers
export const optText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));
export const reqText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required`).max(max);
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const optDate = z.string().optional().transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date");
export const intIn = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
export const optMoney = z.string().optional().transform((v) => (v === undefined || v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 1e12), "Enter a valid amount");
export const uuid = z.string().uuid();

export function dbError(e: { message: string } | null | undefined): ActionResult {
  if (!e) return { error: "Something went wrong." };
  // Do not leak internals; map common RLS errors to friendly text.
  if (/row-level security|permission denied/i.test(e.message)) return { error: "You don't have permission to do that." };
  return { error: e.message.length < 160 ? e.message : "The request could not be completed." };
}
