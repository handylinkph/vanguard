import Link from "next/link";
import { Trash2, CheckSquare, Square, PiggyBank } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Field, Input, Select, Alert, Progress, Stat } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton, FieldError } from "@/components/ui/form";
import { FINANCIAL_CHECKLIST } from "@/content/templates";
import { toggleChecklistItem } from "@/app/saved/actions";
import * as A from "./actions";
import { fmtDate, php, todayISO } from "@/lib/utils";

export const metadata = { title: "Financial preparedness" };
const TABS = ["overview", "savings", "budgets", "expenses", "checklist"] as const;

export default async function Finance({ searchParams }: { searchParams: Promise<{ tab?: string; incident?: string }> }) {
  const sp = await searchParams; const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "overview";
  const { supabase } = await requireUser();
  const [goals, contribs, budgets, lines, expenses, kits, incidents, progress] = await Promise.all([
    supabase.from("savings_goals").select("*").order("created_at"),
    supabase.from("savings_contributions").select("*").order("contributed_on", { ascending: false }),
    supabase.from("budgets").select("*").order("created_at"),
    supabase.from("budget_lines").select("*"),
    supabase.from("expenses").select("*").order("spent_on", { ascending: false }),
    supabase.from("kits").select("id, name").eq("archived", false),
    supabase.from("incident_records").select("id, title").order("occurred_on", { ascending: false }),
    supabase.from("checklist_progress").select("item_key").eq("checklist_key", "finance"),
  ]);
  const saved = (gid: string) => (contribs.data ?? []).filter((c) => c.goal_id === gid).reduce((a, c) => a + Number(c.amount_php), 0);
  const totalTarget = (goals.data ?? []).reduce((a, g) => a + Number(g.target_php), 0);
  const totalSaved = (goals.data ?? []).reduce((a, g) => a + saved(g.id), 0);
  const prepSpent = (expenses.data ?? []).filter((e) => e.kind === "preparedness").reduce((a, e) => a + Number(e.amount_php), 0);
  const recSpent = (expenses.data ?? []).filter((e) => e.kind === "recovery").reduce((a, e) => a + Number(e.amount_php), 0);
  const done = new Set((progress.data ?? []).map((p) => p.item_key));
  const del = (table: string, id: string) => <InlineAction action={A.deleteFinanceRow} hidden={{ table, id }} confirm="Delete?"><Button variant="ghost" size="icon" aria-label="Delete"><Trash2 /></Button></InlineAction>;

  return (
    <>
      <PageHeader title="Financial preparedness" description="Emergency savings goals, preparedness budgets and expense records in Philippine pesos. Your data stays private and under your control." />
      <Alert tone="education" className="mb-4">Vanguard doesn&apos;t connect to banks or e-wallets and doesn&apos;t process payments — you record amounts yourself. This is general guidance, not financial advice.</Alert>
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Finance sections">{TABS.map((t) => <Link key={t} href={`/finance?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-navy text-white" : "border border-line bg-white"}`}>{t}</Link>)}</nav>

      {tab === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Emergency savings" value={php(totalSaved)} sub={totalTarget ? `of ${php(totalTarget)} target` : "No goal yet"} />
            <Stat label="Preparedness spending" value={php(prepSpent)} /><Stat label="Recovery expenses" value={php(recSpent)} />
            <Stat label="Financial checklist" value={`${done.size}/${FINANCIAL_CHECKLIST.length}`} />
          </div>
          {totalTarget > 0 && <Card><CardContent className="pt-5"><p className="text-sm font-medium">Overall savings progress</p><Progress value={(totalSaved / totalTarget) * 100} className="mt-2" /><p className="mt-1 text-xs text-muted">{Math.round((totalSaved / totalTarget) * 100)}%</p></CardContent></Card>}
          {(goals.data ?? []).length === 0 && <Alert tone="info">Start with an emergency fund goal — even small regular amounts help. <Link className="underline" href="/finance?tab=savings">Set a goal</Link>.</Alert>}
        </div>
      )}

      {tab === "savings" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {(goals.data ?? []).length === 0 && <Card><CardContent className="flex items-center gap-3 pt-5 text-sm text-muted"><PiggyBank className="size-6" />No savings goals yet.</CardContent></Card>}
            {(goals.data ?? []).map((g) => {
              const s = saved(g.id); const pct = (s / Number(g.target_php)) * 100;
              return (
                <Card key={g.id}><CardHeader><div className="flex justify-between"><CardTitle>{g.name}</CardTitle>{del("savings_goals", g.id)}</div>
                  <p className="text-sm text-muted">{php(s)} of {php(g.target_php)}{g.target_date ? ` · by ${fmtDate(g.target_date)}` : ""}</p></CardHeader>
                  <CardContent><Progress value={pct} label={`${g.name} progress`} />
                    <ActionForm action={A.addContribution} resetOnSuccess className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="goal_id" value={g.id} />
                      <Field label="Amount (₱, negative for withdrawal)" htmlFor={`a-${g.id}`}><Input id={`a-${g.id}`} name="amount_php" type="number" step="0.01" required className="w-44" /></Field>
                      <Field label="Date" htmlFor={`d-${g.id}`}><Input id={`d-${g.id}`} name="contributed_on" type="date" defaultValue={todayISO()} /></Field>
                      <Field label="Note" htmlFor={`n-${g.id}`}><Input id={`n-${g.id}`} name="note" maxLength={200} /></Field>
                      <SubmitButton size="sm" variant="outline">Record</SubmitButton></ActionForm>
                    <ul className="mt-3 text-xs text-muted">{(contribs.data ?? []).filter((c) => c.goal_id === g.id).slice(0, 5).map((c) => <li key={c.id}>{fmtDate(c.contributed_on)} · {php(c.amount_php)}{c.note ? ` · ${c.note}` : ""}</li>)}</ul>
                  </CardContent></Card>);
            })}
          </div>
          <Card className="self-start"><CardHeader><CardTitle>New savings goal</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.createGoal} resetOnSuccess className="flex flex-col gap-3">
              <Field label="Goal name" htmlFor="gn"><Input id="gn" name="name" required maxLength={120} defaultValue="Emergency fund" /></Field>
              <Field label="Target (₱)" htmlFor="gt"><Input id="gt" name="target_php" type="number" min={1} step="0.01" required /><FieldError name="target_php" /></Field>
              <Field label="Target date" htmlFor="gd"><Input id="gd" name="target_date" type="date" /></Field>
              <SubmitButton size="sm">Create goal</SubmitButton></ActionForm>
            <p className="mt-3 text-xs text-muted">A common guideline is 3–6 months of essential expenses, built over time.</p>
          </CardContent></Card>
        </div>
      )}

      {tab === "budgets" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">{(budgets.data ?? []).map((b) => {
            const bl = (lines.data ?? []).filter((l) => l.budget_id === b.id);
            const planned = bl.reduce((a, l) => a + Number(l.planned_php), 0);
            const spent = (expenses.data ?? []).filter((e) => e.budget_id === b.id).reduce((a, e) => a + Number(e.amount_php), 0);
            return (
              <Card key={b.id}><CardHeader><div className="flex justify-between"><CardTitle>{b.name} <Badge tone="blue">{b.kind}</Badge></CardTitle>{del("budgets", b.id)}</div>
                <p className="text-sm text-muted">Planned {php(planned)} · spent {php(spent)} · {planned ? `${Math.round((spent / planned) * 100)}% used` : ""}</p></CardHeader>
                <CardContent>{planned > 0 && <Progress value={(spent / planned) * 100} className="mb-3" label="Budget used" />}
                  <table className="w-full text-sm"><tbody>{bl.map((l) => <tr key={l.id} className="border-b border-line/60"><td className="py-1.5">{l.label} <span className="text-xs text-muted">{l.category}</span></td><td className="text-right">{php(l.planned_php)}</td><td className="w-10">{del("budget_lines", l.id)}</td></tr>)}</tbody></table>
                  <ActionForm action={A.addBudgetLine} resetOnSuccess className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="budget_id" value={b.id} />
                    <Field label="Item" htmlFor={`l-${b.id}`}><Input id={`l-${b.id}`} name="label" required maxLength={160} /></Field>
                    <Field label="Category" htmlFor={`c-${b.id}`}><Input id={`c-${b.id}`} name="category" required maxLength={60} defaultValue="Supplies" className="w-32" /></Field>
                    <Field label="₱" htmlFor={`p-${b.id}`}><Input id={`p-${b.id}`} name="planned_php" type="number" min={0} step="0.01" required className="w-28" /></Field>
                    <SubmitButton size="sm" variant="outline">Add</SubmitButton></ActionForm>
                </CardContent></Card>);
          })}{(budgets.data ?? []).length === 0 && <p className="text-sm text-muted">No budgets yet.</p>}</div>
          <Card className="self-start"><CardHeader><CardTitle>New budget</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.createBudget} resetOnSuccess className="flex flex-col gap-3">
              <Field label="Name" htmlFor="bn"><Input id="bn" name="name" required maxLength={120} defaultValue="Emergency supplies" /></Field>
              <Field label="Type" htmlFor="bk"><Select id="bk" name="kind"><option value="supplies">Emergency supplies</option><option value="preparedness">General preparedness</option><option value="recovery">Disaster recovery</option></Select></Field>
              <Field label="Start from a kit's shopping list (optional)" htmlFor="bf"><Select id="bf" name="from_kit"><option value="">—</option>{(kits.data ?? []).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</Select></Field>
              <SubmitButton size="sm">Create budget</SubmitButton></ActionForm></CardContent></Card>
        </div>
      )}

      {tab === "expenses" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Expense records</CardTitle></CardHeader><CardContent>
            {(expenses.data ?? []).length === 0 ? <p className="text-sm text-muted">No expenses recorded.</p> : (
              <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Date</th><th>Description</th><th>Type</th><th className="text-right">Amount</th><th /></tr></thead>
                <tbody>{expenses.data!.map((e) => <tr key={e.id} className="border-b border-line/60"><td className="py-1.5 text-xs">{fmtDate(e.spent_on)}</td><td>{e.description} <span className="text-xs text-muted">{e.category}</span></td>
                  <td><Badge tone={e.kind === "recovery" ? "amber" : "blue"}>{e.kind}</Badge></td><td className="text-right">{php(e.amount_php)}</td><td>{del("expenses", e.id)}</td></tr>)}</tbody></table>)}
          </CardContent></Card>
          <Card className="self-start"><CardHeader><CardTitle>Record an expense</CardTitle></CardHeader><CardContent>
            <ActionForm action={A.addExpense} resetOnSuccess className="flex flex-col gap-3">
              <Field label="Type" htmlFor="ek"><Select id="ek" name="kind" defaultValue={sp.incident ? "recovery" : "preparedness"}><option value="preparedness">Preparedness</option><option value="recovery">Disaster recovery</option></Select></Field>
              <Field label="Description" htmlFor="ed"><Input id="ed" name="description" required maxLength={200} /><FieldError name="description" /></Field>
              <div className="grid grid-cols-2 gap-2"><Field label="Amount (₱)" htmlFor="ea"><Input id="ea" name="amount_php" type="number" min={0} step="0.01" required /></Field><Field label="Date" htmlFor="es"><Input id="es" name="spent_on" type="date" defaultValue={todayISO()} required /></Field></div>
              <Field label="Category" htmlFor="ec"><Input id="ec" name="category" required maxLength={60} defaultValue={sp.incident ? "Repairs" : "Supplies"} /></Field>
              <Field label="Budget" htmlFor="eb"><Select id="eb" name="budget_id"><option value="">—</option>{(budgets.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
              <Field label="Related kit" htmlFor="eki"><Select id="eki" name="kit_id"><option value="">—</option>{(kits.data ?? []).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</Select></Field>
              <Field label="Related incident record" htmlFor="ei"><Select id="ei" name="incident_id" defaultValue={sp.incident ?? ""}><option value="">—</option>{(incidents.data ?? []).map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}</Select></Field>
              <SubmitButton size="sm">Record expense</SubmitButton></ActionForm></CardContent></Card>
        </div>
      )}

      {tab === "checklist" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Financial preparedness checklist</CardTitle></CardHeader><CardContent>
            <ul className="flex flex-col gap-2">{FINANCIAL_CHECKLIST.map((c) => {
              const isDone = done.has(c.key);
              return <li key={c.key}><form action={toggleChecklistItem}><input type="hidden" name="checklist_key" value="finance" /><input type="hidden" name="item_key" value={c.key} /><input type="hidden" name="done" value={String(isDone)} /><input type="hidden" name="path" value="/finance" />
                <button className="flex items-start gap-2 text-left text-sm" aria-pressed={isDone}>{isDone ? <CheckSquare className="size-5 shrink-0 text-accent" /> : <Square className="size-5 shrink-0 text-muted" />}<span className={isDone ? "text-muted line-through" : ""}>{c.label}</span></button></form></li>;
            })}</ul></CardContent></Card>
          <Card className="self-start"><CardHeader><CardTitle>Planning resources</CardTitle></CardHeader><CardContent className="text-sm">
            <p>See finance guides in the <Link className="text-brand-700 underline" href="/library?category=finance">resource library</Link>.</p>
            <p className="mt-2 text-xs text-muted">For benefit eligibility (SSS, GSIS, PhilHealth, Pag-IBIG calamity programs), check directly with each agency.</p>
          </CardContent></Card>
        </div>
      )}
    </>
  );
}
