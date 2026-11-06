"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseForm, type ActionResult } from "@/lib/actions";
import { SITE_URL } from "@/lib/env";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : SITE_URL;
}

const password = z.string().min(10, "Use at least 10 characters").max(72)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include letters and numbers");

const SignUp = z.object({
  full_name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
  consent: z.literal("on", { message: "Please accept the privacy notice to continue" }),
});

export async function signUp(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(SignUp, fd); if (p.error) return p.error;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: p.data.email, password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };
  return { ok: true, message: "Check your email to verify your account. The link will bring you back to finish setup." };
}

const SignIn = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email"), password: z.string().min(1, "Enter your password"), next: z.string().optional() });

export async function signIn(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(SignIn, fd); if (p.error) return p.error;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: p.data.email, password: p.data.password });
  if (error) return { error: error.message === "Email not confirmed" ? "Please verify your email first — check your inbox." : "Incorrect email or password." };
  const next = p.data.next && p.data.next.startsWith("/") && !p.data.next.startsWith("//") ? p.data.next : "/dashboard";
  redirect(next);
}

export async function requestReset(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") }), fd); if (p.error) return p.error;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(p.data.email, { redirectTo: `${await origin()}/auth/callback?next=/reset-password` });
  // Same response whether or not the account exists (prevents account enumeration).
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ password, confirm: z.string() }).refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] }), fd);
  if (p.error) return p.error;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: p.data.password });
  if (error) return { error: error.message };
  return { ok: true, message: "Your password has been updated." };
}
