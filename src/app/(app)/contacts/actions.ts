"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseForm, optText, reqText, checkbox, dbError, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";

const Contact = z.object({
  id: z.string().uuid().optional(),
  name: reqText(120, "Name"),
  relationship: optText(60),
  phone: z.string().trim().min(3, "Enter a phone number").max(40).regex(/^[0-9+()\-\s]+$/, "Use digits, spaces, +, - or ()"),
  alt_phone: optText(40),
  email: z.string().trim().max(200).optional().transform((v) => v || null).refine((v) => !v || /.+@.+\..+/.test(v), "Enter a valid email"),
  is_out_of_area: checkbox,
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  notes: optText(500),
  household_id: z.string().optional().transform((v) => (v ? v : null)),
});

export async function saveContact(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(Contact, fd); if (p.error) return p.error;
  const { supabase, user } = await requireUser();
  const { id, ...row } = p.data;
  const { error } = id
    ? await supabase.from("emergency_contacts").update(row).eq("id", id)
    : await supabase.from("emergency_contacts").insert({ ...row, owner_id: user.id });
  if (error) return dbError(error);
  if (!id) await logActivity(supabase, user.id, "contact", `Added emergency contact ${row.name}`, "/contacts", row.household_id);
  revalidatePath("/contacts"); revalidatePath("/dashboard");
  return { ok: true, message: id ? "Contact updated." : "Contact added." };
}

export async function deleteContact(fd: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("emergency_contacts").delete().eq("id", String(fd.get("id")));
  revalidatePath("/contacts");
}
