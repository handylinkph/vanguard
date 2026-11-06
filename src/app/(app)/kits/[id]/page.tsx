import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ShoppingCart, List, Trash2, Archive } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, Badge, Button, Field, Input, Select, Alert } from "@/components/ui";
import { ActionForm, InlineAction, SubmitButton, FieldError } from "@/components/ui/form";
import { PrintButton } from "@/components/ui/copy-button";
import { KitInventory } from "@/components/kits/inventory";
import { KIT_TYPES, CATEGORIES, shoppingList, kitReadiness, isExpired, type KitType } from "@/lib/kits";
import { addKitItem, updateKitItem, deleteKitItem, updateKit, archiveKit, deleteKit } from "../actions";
import type { Kit, KitItem } from "@/lib/types";
import { fmtDate, php } from "@/lib/utils";

export default async function KitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params; const { view = "inventory" } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("kits").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const kit = data as Kit;
  const { data: itemRows } = await supabase.from("kit_items").select("*").eq("kit_id", id).order("category").order("name");
  const items = (itemRows ?? []).map((i) => ({ ...i, qty_needed: Number(i.qty_needed), qty_have: Number(i.qty_have), est_unit_cost_php: i.est_unit_cost_php == null ? null : Number(i.est_unit_cost_php) })) as KitItem[];
  const shop = shoppingList(items);
  const shopTotal = shop.reduce((a, i) => a + (i.estCost ?? 0), 0);
  const tab = (v: string, label: string, Icon: typeof List) => (
    <Link href={`/kits/${id}?view=${v}`} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${view === v ? "bg-navy text-white" : "border border-line bg-white"}`}><Icon className="size-4" />{label}</Link>
  );
  const p = kit.people;
  return (
    <>
      <PageHeader title={kit.name} eyebrow={KIT_TYPES[kit.kit_type as KitType].label}
        description={`${p.adults} adult(s), ${p.children} child(ren), ${p.infants} infant(s), ${p.seniors} older adult(s), ${p.pets} pet(s) · ${kit.days} days${kit.location_note ? ` · stored: ${kit.location_note}` : ""} · last checked ${fmtDate(kit.last_checked_on)}`}
        actions={<>{kit.archived && <Badge>Archived</Badge>}<PrintButton label="Print" /></>} />
      <div className="no-print mb-5 flex flex-wrap gap-2">{tab("inventory", "Inventory", List)}{tab("shopping", `Shopping list (${shop.length})`, ShoppingCart)}{tab("manage", "Manage", Printer)}</div>

      {view === "inventory" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <KitInventory items={items} />
          </div>
          <div className="no-print flex flex-col gap-4">
            <Card><CardHeader><CardTitle>Add an item</CardTitle></CardHeader><CardContent>
              <ActionForm action={addKitItem} resetOnSuccess className="flex flex-col gap-3">
                <input type="hidden" name="kit_id" value={kit.id} />
                <Field label="Item" htmlFor="i-name"><Input id="i-name" name="name" required maxLength={160} /><FieldError name="name" /></Field>
                <Field label="Category" htmlFor="i-cat"><Select id="i-cat" name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Need" htmlFor="i-need"><Input id="i-need" name="qty_needed" type="number" min={0} step="any" defaultValue={1} /></Field>
                  <Field label="Have" htmlFor="i-have"><Input id="i-have" name="qty_have" type="number" min={0} step="any" defaultValue={0} /></Field>
                  <Field label="Unit" htmlFor="i-unit"><Input id="i-unit" name="unit" defaultValue="pcs" maxLength={20} /></Field>
                </div>
                <Field label="Expiry date (optional)" htmlFor="i-exp"><Input id="i-exp" name="expires_on" type="date" /></Field>
                <Field label="Estimated unit cost (₱)" htmlFor="i-cost"><Input id="i-cost" name="est_unit_cost_php" type="number" min={0} step="0.01" /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="essential" defaultChecked />Essential</label>
                <SubmitButton size="sm">Add item</SubmitButton>
              </ActionForm>
            </CardContent></Card>
            <Alert tone="education">Quantities are planning estimates. Adjust for your household&apos;s needs; ask a doctor or pharmacist about medicine supplies.</Alert>
          </div>
        </div>
      )}

      {view === "shopping" && (
        <Card><CardHeader><CardTitle>Shopping checklist</CardTitle><p className="text-sm text-muted">Missing quantities, essentials first. Estimated total: <strong>{php(shopTotal)}</strong> (rough planning estimate; prices vary).</p></CardHeader>
          <CardContent>{shop.length === 0 ? <p className="text-sm text-muted">Nothing missing — your kit is fully stocked.</p> : (
            <table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Item</th><th>Missing</th><th className="text-right">Est. cost</th></tr></thead>
              <tbody>{shop.map((i) => (
                <tr key={i.name + i.category} className="border-b border-line/60"><td className="py-2"><span className="mr-2">☐</span>{i.name} {i.essential ? null : <Badge>Optional</Badge>}{isExpired(i) && <Badge tone="red" className="ml-1">Replace expired</Badge>}</td>
                  <td>{Math.round(i.missing * 100) / 100} {i.unit}</td><td className="text-right">{i.estCost != null ? php(i.estCost) : "—"}</td></tr>
              ))}</tbody></table>)}
            <p className="mt-3 text-xs text-muted">Vanguard does not sell products. Record purchases under <Link className="underline" href="/finance">Financial preparedness</Link>.</p>
          </CardContent></Card>
      )}

      {view === "manage" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Kit settings</CardTitle></CardHeader><CardContent>
            <ActionForm action={updateKit} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={kit.id} />
              <Field label="Name" htmlFor="k-name"><Input id="k-name" name="name" defaultValue={kit.name} required maxLength={120} /></Field>
              <Field label="Storage location" htmlFor="k-loc"><Input id="k-loc" name="location_note" defaultValue={kit.location_note ?? ""} maxLength={200} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="mark_checked" />I checked this kit today</label>
              <SubmitButton size="sm">Save</SubmitButton>
            </ActionForm>
            <div className="mt-4 flex flex-wrap gap-2">
              <InlineAction action={archiveKit} hidden={{ id: kit.id, archived: String(!kit.archived) }}><Button variant="outline" size="sm"><Archive />{kit.archived ? "Restore" : "Archive"}</Button></InlineAction>
              {kit.owner_id === user.id && <InlineAction action={deleteKit} hidden={{ id: kit.id }} confirm="Delete this kit and all its items?"><Button variant="ghost" size="sm" className="text-red-700"><Trash2 />Delete kit</Button></InlineAction>}
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Edit items, expiry dates & costs</CardTitle></CardHeader><CardContent className="max-h-[36rem] overflow-y-auto">
            <ul className="flex flex-col gap-2">{items.map((i) => (
              <li key={i.id}><details className="rounded-lg border border-line p-2"><summary className="cursor-pointer text-sm">{i.name} <span className="text-xs text-muted">({i.category})</span></summary>
                <ActionForm action={updateKitItem} className="mt-2 grid grid-cols-2 gap-2">
                  <input type="hidden" name="id" value={i.id} /><input type="hidden" name="kit_id" value={kit.id} />
                  <Field label="Name" htmlFor={`n-${i.id}`} className="col-span-2"><Input id={`n-${i.id}`} name="name" defaultValue={i.name} maxLength={160} /></Field>
                  <Field label="Needed" htmlFor={`q-${i.id}`}><Input id={`q-${i.id}`} name="qty_needed" type="number" min={0} step="any" defaultValue={i.qty_needed} /></Field>
                  <Field label="Unit" htmlFor={`u-${i.id}`}><Input id={`u-${i.id}`} name="unit" defaultValue={i.unit} maxLength={20} /></Field>
                  <Field label="Expires" htmlFor={`e-${i.id}`}><Input id={`e-${i.id}`} name="expires_on" type="date" defaultValue={i.expires_on ?? ""} /></Field>
                  <Field label="Unit cost ₱" htmlFor={`c-${i.id}`}><Input id={`c-${i.id}`} name="est_unit_cost_php" type="number" min={0} step="0.01" defaultValue={i.est_unit_cost_php ?? ""} /></Field>
                  <Field label="Notes" htmlFor={`no-${i.id}`} className="col-span-2"><Input id={`no-${i.id}`} name="notes" defaultValue={i.notes ?? ""} maxLength={300} /></Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="essential" defaultChecked={i.essential} />Essential</label>
                  <div className="flex justify-end gap-2"><SubmitButton size="sm">Save</SubmitButton></div>
                </ActionForm>
                <InlineAction action={deleteKitItem} hidden={{ id: i.id, kit_id: kit.id }} className="mt-1"><button className="text-xs text-red-700">Remove item</button></InlineAction>
              </details></li>))}</ul>
          </CardContent></Card>
        </div>
      )}

      <section className="hidden print:block">
        <h2 className="mt-4 text-lg font-semibold">Inventory — {kitReadiness(items)}% ready</h2>
        <table className="w-full text-xs"><thead><tr><th className="text-left">Item</th><th>Need</th><th>Have</th><th>Packed</th><th>Expires</th></tr></thead>
          <tbody>{items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.qty_needed} {i.unit}</td><td>{i.qty_have}</td><td>{i.packed ? "✓" : ""}</td><td>{i.expires_on ?? ""}</td></tr>)}</tbody></table>
      </section>
    </>
  );
}
