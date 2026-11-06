import { describe, it, expect } from "vitest";
import { buildKitItems, kitReadiness, shoppingList, isExpired, expiresWithin } from "@/lib/kits";

const fam = { adults: 2, children: 1, infants: 1, seniors: 1, pets: 1 };

describe("kit builder", () => {
  it("sizes water to household and duration", () => {
    const three = buildKitItems("three_day", fam, 3).find((i) => i.template_key === "water")!;
    const seven = buildKitItems("seven_day", fam, 7).find((i) => i.template_key === "water")!;
    expect(three.qty_needed).toBe(5 * 4 * 3);
    expect(seven.qty_needed).toBe(5 * 4 * 7);
  });
  it("adds infant, child, older adult and pet items only when relevant", () => {
    const keys = buildKitItems("three_day", fam, 3).map((i) => i.template_key);
    expect(keys).toEqual(expect.arrayContaining(["diapers", "infant-formula", "child-id", "senior-aids", "pet-food"]));
    const solo = buildKitItems("three_day", { adults: 1, children: 0, infants: 0, seniors: 0, pets: 0 }, 3).map((i) => i.template_key);
    expect(solo).not.toContain("diapers"); expect(solo).not.toContain("pet-food");
  });
  it("includes accessibility & medication items when requested", () => {
    const keys = buildKitItems("home", { adults: 1, children: 0, infants: 0, seniors: 0, pets: 0 }, 3, ["accessibility", "medications"]).map((i) => i.template_key);
    expect(keys).toEqual(expect.arrayContaining(["assistive", "care-info", "meds"]));
  });
  it("go-bags use portable water and a smaller custom kit is minimal", () => {
    const go = buildKitItems("go_bag", fam, 3).map((i) => i.template_key);
    expect(go).toContain("water-portable"); expect(go).not.toContain("water");
    expect(buildKitItems("custom", fam, 3).length).toBeLessThan(10);
  });
});

describe("readiness & expiry", () => {
  const today = new Date("2026-11-07T08:00:00");
  it("averages essential coverage and caps each item at 100%", () => {
    expect(kitReadiness([
      { qty_needed: 10, qty_have: 20, essential: true, packed: true, expires_on: null },
      { qty_needed: 10, qty_have: 0, essential: true, packed: false, expires_on: null },
      { qty_needed: 5, qty_have: 0, essential: false, packed: false, expires_on: null },
    ], today)).toBe(50);
  });
  it("treats expired stock as missing", () => {
    const items = [{ qty_needed: 4, qty_have: 4, essential: true, packed: true, expires_on: "2026-11-01" }];
    expect(isExpired(items[0], today)).toBe(true);
    expect(kitReadiness(items, today)).toBe(0);
  });
  it("detects items expiring within a window", () => {
    expect(expiresWithin({ expires_on: "2026-11-20" }, 30, today)).toBe(true);
    expect(expiresWithin({ expires_on: "2027-03-01" }, 30, today)).toBe(false);
  });
  it("builds a shopping list with missing quantities and costs, essentials first", () => {
    const list = shoppingList([
      { name: "Rope", unit: "pcs", category: "Tools", qty_needed: 1, qty_have: 0, essential: false, packed: false, expires_on: null, est_unit_cost_php: 150 },
      { name: "Water", unit: "L", category: "Water", qty_needed: 12, qty_have: 4, essential: true, packed: false, expires_on: null, est_unit_cost_php: 20 },
      { name: "Flashlight", unit: "pcs", category: "Light", qty_needed: 1, qty_have: 1, essential: true, packed: true, expires_on: null, est_unit_cost_php: 250 },
    ], today);
    expect(list.map((i) => i.name)).toEqual(["Water", "Rope"]);
    expect(list[0]).toMatchObject({ missing: 8, estCost: 160 });
  });
});
