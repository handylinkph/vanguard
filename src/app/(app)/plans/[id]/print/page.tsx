import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { planBodyHtml } from "@/lib/plan-export";
import { PrintButton } from "@/components/ui/copy-button";
import type { Plan, PlanItem, Contact } from "@/lib/types";

export const metadata = { title: "Print plan" };

export default async function PrintPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: plan } = await supabase.from("emergency_plans").select("*").eq("id", id).maybeSingle();
  if (!plan) notFound();
  const [{ data: items }, { data: contacts }] = await Promise.all([
    supabase.from("plan_checklist_items").select("*").eq("plan_id", id).order("sort"),
    supabase.from("emergency_contacts").select("*").order("priority"),
  ]);
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-line bg-white p-6 print:border-0 print:p-0">
      <div className="no-print mb-4 flex justify-end"><PrintButton label="Print this plan" /></div>
      {/* Content is escaped in planBodyHtml */}
      <article className="prose-v [&_.callout]:my-3 [&_.callout]:rounded-lg [&_.callout]:border [&_.callout]:border-red-200 [&_.callout]:bg-red-50 [&_.callout]:p-3 [&_.muted]:text-sm [&_.muted]:text-muted [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-navy"
        dangerouslySetInnerHTML={{ __html: planBodyHtml(plan as Plan, (items ?? []) as PlanItem[], (contacts ?? []) as Contact[]) }} />
    </div>
  );
}
