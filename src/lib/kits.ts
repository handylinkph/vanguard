// Feature 5 — Emergency kit builder domain logic (pure functions, unit tested).
// Quantities are planning estimates for households, not medical or nutritional prescriptions.

export type KitType = "three_day" | "seven_day" | "home" | "go_bag" | "custom";
export type Need = "infants" | "children" | "seniors" | "pets" | "accessibility" | "medications";

export interface People { adults: number; children: number; infants: number; seniors: number; pets: number }

export interface TemplateItem {
  key: string;
  category: string;
  name: string;
  unit: string;
  essential: boolean;
  /** quantity calculator: (people, days) => qty */
  qty: (p: People, days: number, type: KitType) => number;
  /** only include when this condition holds */
  when?: (p: People, needs: Need[], type: KitType) => boolean;
  estUnitCostPhp?: number;
  perishable?: boolean;
  note?: string;
}

export const KIT_TYPES: Record<KitType, { label: string; days: number; description: string }> = {
  three_day: { label: "3-day kit", days: 3, description: "Supplies to sustain your household for three days at home or in an evacuation centre." },
  seven_day: { label: "7-day kit", days: 7, description: "Extended supplies for longer disruptions such as prolonged outages or isolation." },
  home: { label: "Home emergency kit", days: 3, description: "Supplies stored at home for sheltering in place." },
  go_bag: { label: "Go-bag", days: 3, description: "A portable bag per person you can grab when you must evacuate quickly." },
  custom: { label: "Custom kit", days: 3, description: "Start from a minimal list and add your own items." },
};

export const CATEGORIES = ["Water", "Food", "First aid & health", "Light & power", "Communication", "Hygiene & sanitation", "Documents & money", "Clothing & shelter", "Tools", "Infants", "Children", "Older adults", "Accessibility", "Pets"] as const;

export const totalPeople = (p: People) => p.adults + p.children + p.infants + p.seniors;
const persons = (p: People) => Math.max(1, totalPeople(p));
const portable = (t: KitType) => t === "go_bag";

export const TEMPLATE: TemplateItem[] = [
  { key: "water", category: "Water", name: "Drinking water (planning estimate: 4 L per person per day)", unit: "L", essential: true, qty: (p, d) => persons(p) * 4 * d, estUnitCostPhp: 20, when: (_p, _n, t) => !portable(t) },
  { key: "water-portable", category: "Water", name: "Bottled water (portable)", unit: "L", essential: true, qty: (p) => persons(p) * 3, estUnitCostPhp: 20, when: (_p, _n, t) => portable(t) },
  { key: "water-treatment", category: "Water", name: "Water purification tablets or filter", unit: "pack", essential: false, qty: () => 1, estUnitCostPhp: 250 },
  { key: "rte-food", category: "Food", name: "Ready-to-eat food (canned goods, crackers) — portions", unit: "meals", essential: true, qty: (p, d, t) => persons(p) * 3 * (portable(t) ? 3 : d), estUnitCostPhp: 45, perishable: true },
  { key: "can-opener", category: "Food", name: "Manual can opener", unit: "pcs", essential: true, qty: () => 1, estUnitCostPhp: 80 },
  { key: "utensils", category: "Food", name: "Reusable utensils, cups and plates", unit: "set", essential: false, qty: (p) => persons(p), estUnitCostPhp: 60 },
  { key: "first-aid", category: "First aid & health", name: "First aid kit", unit: "kit", essential: true, qty: () => 1, estUnitCostPhp: 600 },
  { key: "meds", category: "First aid & health", name: "Maintenance medicines (supply for kit duration)", unit: "supply", essential: true, qty: () => 1, when: (_p, n) => n.includes("medications") || n.includes("seniors"), perishable: true, note: "Consult your doctor or pharmacist about keeping an emergency supply." },
  { key: "masks", category: "First aid & health", name: "Face masks", unit: "pcs", essential: false, qty: (p, d) => persons(p) * Math.min(d, 7), estUnitCostPhp: 10 },
  { key: "flashlight", category: "Light & power", name: "Flashlight", unit: "pcs", essential: true, qty: (p) => Math.max(1, Math.ceil(persons(p) / 2)), estUnitCostPhp: 250 },
  { key: "batteries", category: "Light & power", name: "Spare batteries", unit: "pack", essential: true, qty: () => 2, estUnitCostPhp: 150, perishable: true },
  { key: "powerbank", category: "Light & power", name: "Charged power bank", unit: "pcs", essential: true, qty: (p) => Math.max(1, Math.ceil(persons(p) / 3)), estUnitCostPhp: 900 },
  { key: "radio", category: "Communication", name: "Battery or hand-crank radio", unit: "pcs", essential: true, qty: () => 1, estUnitCostPhp: 700 },
  { key: "whistle", category: "Communication", name: "Whistle", unit: "pcs", essential: true, qty: (p) => persons(p), estUnitCostPhp: 30 },
  { key: "contact-card", category: "Communication", name: "Printed emergency contact card", unit: "pcs", essential: true, qty: (p) => persons(p), estUnitCostPhp: 0 },
  { key: "hygiene", category: "Hygiene & sanitation", name: "Soap, toothbrush, toothpaste", unit: "set", essential: true, qty: (p) => persons(p), estUnitCostPhp: 120 },
  { key: "alcohol", category: "Hygiene & sanitation", name: "Alcohol or hand sanitizer", unit: "bottle", essential: true, qty: () => 1, estUnitCostPhp: 90 },
  { key: "garbage-bags", category: "Hygiene & sanitation", name: "Garbage bags", unit: "pcs", essential: false, qty: (_p, d) => d * 2, estUnitCostPhp: 8 },
  { key: "sanitary", category: "Hygiene & sanitation", name: "Sanitary pads / feminine hygiene", unit: "pack", essential: false, qty: () => 1, estUnitCostPhp: 60 },
  { key: "documents", category: "Documents & money", name: "Copies of IDs and important documents in waterproof pouch", unit: "set", essential: true, qty: () => 1, estUnitCostPhp: 50 },
  { key: "cash", category: "Documents & money", name: "Emergency cash in small bills", unit: "PHP", essential: true, qty: (p) => persons(p) * 1000, note: "Amount is a starting suggestion — adjust to your situation." },
  { key: "clothes", category: "Clothing & shelter", name: "Change of clothes", unit: "set", essential: true, qty: (p, d, t) => persons(p) * (portable(t) ? 2 : Math.min(d, 3)), estUnitCostPhp: 0 },
  { key: "raincoat", category: "Clothing & shelter", name: "Raincoat or poncho", unit: "pcs", essential: true, qty: (p) => persons(p), estUnitCostPhp: 120 },
  { key: "blanket", category: "Clothing & shelter", name: "Blanket or emergency thermal blanket", unit: "pcs", essential: true, qty: (p) => persons(p), estUnitCostPhp: 150 },
  { key: "multitool", category: "Tools", name: "Multi-tool or knife", unit: "pcs", essential: false, qty: () => 1, estUnitCostPhp: 350 },
  { key: "rope", category: "Tools", name: "Rope (10 m)", unit: "pcs", essential: false, qty: () => 1, estUnitCostPhp: 150 },
  { key: "tape", category: "Tools", name: "Duct tape", unit: "roll", essential: false, qty: () => 1, estUnitCostPhp: 120 },
  // Special needs
  { key: "infant-formula", category: "Infants", name: "Infant formula or milk supplies", unit: "day-supply", essential: true, qty: (p, d) => p.infants * d, when: (p, n) => p.infants > 0 || n.includes("infants"), perishable: true },
  { key: "diapers", category: "Infants", name: "Diapers", unit: "pcs", essential: true, qty: (p, d) => Math.max(1, p.infants) * 6 * d, when: (p, n) => p.infants > 0 || n.includes("infants"), estUnitCostPhp: 12 },
  { key: "baby-wipes", category: "Infants", name: "Baby wipes", unit: "pack", essential: true, qty: (p) => Math.max(1, p.infants), when: (p, n) => p.infants > 0 || n.includes("infants"), estUnitCostPhp: 80 },
  { key: "child-comfort", category: "Children", name: "Comfort item, games or books for children", unit: "pcs", essential: false, qty: (p) => Math.max(1, p.children), when: (p, n) => p.children > 0 || n.includes("children") },
  { key: "child-id", category: "Children", name: "Child ID card with guardian contacts", unit: "pcs", essential: true, qty: (p) => Math.max(1, p.children), when: (p, n) => p.children > 0 || n.includes("children") },
  { key: "senior-aids", category: "Older adults", name: "Spare eyeglasses, hearing aid batteries, mobility aids", unit: "set", essential: true, qty: (p) => Math.max(1, p.seniors), when: (p, n) => p.seniors > 0 || n.includes("seniors") },
  { key: "assistive", category: "Accessibility", name: "Assistive device backups and instructions", unit: "set", essential: true, qty: () => 1, when: (_p, n) => n.includes("accessibility") },
  { key: "care-info", category: "Accessibility", name: "Written care instructions and medical information card", unit: "pcs", essential: true, qty: () => 1, when: (_p, n) => n.includes("accessibility") },
  { key: "pet-food", category: "Pets", name: "Pet food and water", unit: "day-supply", essential: true, qty: (p, d) => Math.max(1, p.pets) * d, when: (p, n) => p.pets > 0 || n.includes("pets"), perishable: true },
  { key: "pet-carrier", category: "Pets", name: "Leash, carrier and pet records", unit: "set", essential: true, qty: (p) => Math.max(1, p.pets), when: (p, n) => p.pets > 0 || n.includes("pets") },
];

const CUSTOM_KEYS = new Set(["water", "rte-food", "first-aid", "flashlight", "documents", "whistle", "contact-card"]);

export interface GeneratedItem {
  template_key: string; category: string; name: string; unit: string; essential: boolean;
  qty_needed: number; est_unit_cost_php: number | null; notes: string | null;
}

export function buildKitItems(type: KitType, people: People, days: number, needs: Need[] = []): GeneratedItem[] {
  const d = Math.max(1, Math.min(30, Math.round(days)));
  return TEMPLATE
    .filter((t) => (type === "custom" ? CUSTOM_KEYS.has(t.key) : true))
    .filter((t) => (t.when ? t.when(people, needs, type) : true))
    .map((t) => ({
      template_key: t.key,
      category: t.category,
      name: t.name,
      unit: t.unit,
      essential: t.essential,
      qty_needed: Math.max(0, Math.round(t.qty(people, d, type) * 100) / 100),
      est_unit_cost_php: t.estUnitCostPhp ?? null,
      notes: t.note ?? (t.perishable ? "Track the expiry date and rotate stock." : null),
    }));
}

export interface ItemState { qty_needed: number; qty_have: number; essential: boolean; packed: boolean; expires_on: string | null }

export function isExpired(item: Pick<ItemState, "expires_on">, today = new Date()) {
  if (!item.expires_on) return false;
  return new Date(item.expires_on + "T23:59:59") < today;
}
export function expiresWithin(item: Pick<ItemState, "expires_on">, days: number, today = new Date()) {
  if (!item.expires_on) return false;
  const exp = new Date(item.expires_on + "T23:59:59").getTime();
  return exp >= today.getTime() && exp <= today.getTime() + days * 86400000;
}

/** Readiness = average coverage of essential items (capped at 100% each); expired stock counts as 0. */
export function kitReadiness(items: ItemState[], today = new Date()): number {
  const essentials = items.filter((i) => i.essential && i.qty_needed > 0);
  if (essentials.length === 0) return items.length ? 100 : 0;
  const sum = essentials.reduce((acc, i) => acc + (isExpired(i, today) ? 0 : Math.min(i.qty_have / i.qty_needed, 1)), 0);
  return Math.round((sum / essentials.length) * 100);
}

export function shoppingList(items: (ItemState & { name: string; unit: string; category: string; est_unit_cost_php: number | null })[], today = new Date()) {
  return items
    .map((i) => {
      const effectiveHave = isExpired(i, today) ? 0 : i.qty_have;
      const missing = Math.max(0, i.qty_needed - effectiveHave);
      return { ...i, missing, estCost: i.est_unit_cost_php != null ? Math.round(missing * i.est_unit_cost_php) : null };
    })
    .filter((i) => i.missing > 0)
    .sort((a, b) => Number(b.essential) - Number(a.essential) || a.category.localeCompare(b.category));
}
