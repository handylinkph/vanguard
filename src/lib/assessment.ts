// Feature 4 — Household preparedness assessment.
// IMPORTANT: this measures PREPAREDNESS ACTIONS a household has taken. It is not a
// scientifically validated geographic disaster-risk rating and does not predict exposure.

export const METHODOLOGY_VERSION = "v1";

export type AnswerValue = "yes" | "partly" | "no" | "na";

export interface Question {
  id: string;
  category: "plan" | "supplies" | "communication" | "home" | "skills" | "finance" | "hazard";
  text: string;
  help?: string;
  hazards?: string[]; // only shown when one of these hazards is selected
  weight: number;
  recommendation: { text: string; link: string; action: string };
}

export const CATEGORY_LABEL: Record<Question["category"], string> = {
  plan: "Planning", supplies: "Supplies", communication: "Communication", home: "Home safety",
  skills: "Skills & practice", finance: "Financial readiness", hazard: "Hazard-specific",
};

export const QUESTIONS: Question[] = [
  { id: "plan_written", category: "plan", weight: 3, text: "Does your household have a written emergency plan?", recommendation: { text: "Create a household emergency plan with meeting places and responsibilities.", link: "/plans/new", action: "Create a plan" } },
  { id: "plan_meeting", category: "plan", weight: 2, text: "Has everyone agreed on a meeting place if you are separated?", recommendation: { text: "Agree on a nearby and an out-of-neighbourhood meeting place.", link: "/plans", action: "Add meeting places" } },
  { id: "plan_evac", category: "plan", weight: 3, text: "Do you know your barangay's evacuation area and how to get there?", help: "Ask your barangay hall or MDRRMO if you are unsure.", recommendation: { text: "Find out your designated evacuation area and record it in your plan.", link: "/plans", action: "Record evacuation destination" } },
  { id: "plan_dependents", category: "plan", weight: 2, text: "Does your plan cover children, older adults, people with disabilities and pets in your care?", recommendation: { text: "Assign a responsible person for each dependent and pet.", link: "/household", action: "Update household" } },
  { id: "supplies_kit", category: "supplies", weight: 3, text: "Do you have at least 3 days of water and food for everyone at home?", recommendation: { text: "Build a 3-day home kit sized to your household.", link: "/kits/new?type=three_day", action: "Build a 3-day kit" } },
  { id: "supplies_gobag", category: "supplies", weight: 3, text: "Is a go-bag packed and ready for each person?", recommendation: { text: "Pack a go-bag you can grab in minutes.", link: "/kits/new?type=go_bag", action: "Build a go-bag" } },
  { id: "supplies_firstaid", category: "supplies", weight: 2, text: "Do you have a stocked first aid kit and needed maintenance medicines?", recommendation: { text: "Add a first aid kit and medicine supply to your kit inventory.", link: "/kits", action: "Review kits" } },
  { id: "supplies_rotation", category: "supplies", weight: 1, text: "Do you check expiry dates of stored supplies at least twice a year?", recommendation: { text: "Record expiry dates so Vanguard can remind you.", link: "/kits", action: "Track expiry dates" } },
  { id: "comm_contacts", category: "communication", weight: 3, text: "Are emergency contacts saved on every phone and written on paper?", recommendation: { text: "Save your emergency contacts and print a contact card.", link: "/contacts", action: "Add contacts" } },
  { id: "comm_outofarea", category: "communication", weight: 1, text: "Do you have an out-of-area contact everyone can check in with?", recommendation: { text: "Choose a relative in another city as a check-in contact.", link: "/contacts", action: "Add out-of-area contact" } },
  { id: "comm_info", category: "communication", weight: 2, text: "Do you know where to get official warnings (PAGASA, PHIVOLCS, your LGU)?", recommendation: { text: "Read the guide on trusted information sources.", link: "/guides/general", action: "Read the guide" } },
  { id: "comm_power", category: "communication", weight: 1, text: "Do you have a power bank or radio for when electricity is out?", recommendation: { text: "Add power banks and a radio to your kit.", link: "/kits", action: "Update kit" } },
  { id: "home_secured", category: "home", weight: 2, text: "Are heavy furniture and appliances secured against falling?", recommendation: { text: "Anchor shelves and heavy items; see the earthquake guide.", link: "/guides/earthquake", action: "Read the guide" } },
  { id: "home_utilities", category: "home", weight: 2, text: "Do adults know how to shut off electricity, water and gas?", recommendation: { text: "Locate and label your main switches and valves.", link: "/plans", action: "Add to plan checklist" } },
  { id: "home_fire", category: "home", weight: 2, text: "Do you have a working smoke detector or fire extinguisher?", recommendation: { text: "Install a smoke detector and keep an extinguisher accessible.", link: "/guides/fire", action: "Read fire guide" } },
  { id: "skills_firstaid", category: "skills", weight: 2, text: "Has at least one adult had first aid or CPR training?", help: "Recognised providers include the Philippine Red Cross.", recommendation: { text: "Look for first aid training from a recognised provider.", link: "/library", action: "Browse resources" } },
  { id: "skills_drill", category: "skills", weight: 2, text: "Has your household practised a drill in the last 12 months?", recommendation: { text: "Run a household drill and record what you learn.", link: "/drills", action: "Start a drill" } },
  { id: "finance_savings", category: "finance", weight: 2, text: "Do you have emergency savings or cash set aside?", recommendation: { text: "Set an emergency savings goal in pesos.", link: "/finance", action: "Set a goal" } },
  { id: "finance_docs", category: "finance", weight: 1, text: "Are copies of IDs, titles and insurance documents stored safely?", recommendation: { text: "Store document copies in a waterproof pouch and a secure digital location.", link: "/finance", action: "Financial checklist" } },
  { id: "hz_typhoon", category: "hazard", hazards: ["typhoon", "flood"], weight: 2, text: "Can you secure your home and valuables against wind and rising water?", recommendation: { text: "Follow the typhoon preparation checklist.", link: "/guides/typhoon", action: "Typhoon guide" } },
  { id: "hz_quake", category: "hazard", hazards: ["earthquake", "tsunami"], weight: 2, text: "Has everyone practised Drop, Cover and Hold On?", recommendation: { text: "Practise with the earthquake simulation.", link: "/drills", action: "Practise now" } },
  { id: "hz_tsunami", category: "hazard", hazards: ["tsunami"], weight: 2, text: "Do you know high ground you can reach on foot within minutes?", recommendation: { text: "Identify high ground and walk the route with your household.", link: "/guides/tsunami", action: "Tsunami guide" } },
  { id: "hz_volcano", category: "hazard", hazards: ["volcano"], weight: 2, text: "Do you have masks and goggles for ashfall?", recommendation: { text: "Add masks and goggles to your kit.", link: "/guides/volcano", action: "Volcano guide" } },
  { id: "hz_landslide", category: "hazard", hazards: ["landslide"], weight: 2, text: "Does your household know landslide warning signs?", recommendation: { text: "Review the landslide warning signs.", link: "/guides/landslide", action: "Landslide guide" } },
];

export interface VulnerabilityInput {
  infants: number; children: number; seniors: number; needsAssistance: number; pets: number;
  nearCoast?: boolean | null; nearRiver?: boolean | null; nearSlope?: boolean | null;
}

export function questionsFor(hazards: string[]) {
  return QUESTIONS.filter((q) => !q.hazards || q.hazards.some((h) => hazards.includes(h)));
}

const VALUE: Record<AnswerValue, number | null> = { yes: 1, partly: 0.5, no: 0, na: null };

export interface AssessmentResult {
  score: number;
  categoryScores: Record<string, number>;
  vulnerabilityFactors: string[];
  recommendations: { id: string; text: string; link: string; action: string; priority: "high" | "medium" | "low" }[];
  band: "getting-started" | "building" | "well-prepared";
}

export function vulnerabilityFactors(v: VulnerabilityInput): string[] {
  const f: string[] = [];
  if (v.infants > 0) f.push("Household includes infants");
  if (v.children > 0) f.push("Household includes children");
  if (v.seniors > 0) f.push("Household includes older adults");
  if (v.needsAssistance > 0) f.push("Members may need assistance to evacuate");
  if (v.pets > 0) f.push("Pets need to be included in plans");
  if (v.nearCoast) f.push("Home is near the coast (self-reported)");
  if (v.nearRiver) f.push("Home is near a river or waterway (self-reported)");
  if (v.nearSlope) f.push("Home is on or below a slope (self-reported)");
  return f;
}

export function scoreAssessment(answers: Record<string, AnswerValue>, hazards: string[], v: VulnerabilityInput): AssessmentResult {
  const qs = questionsFor(hazards);
  let total = 0, max = 0;
  const cat: Record<string, { s: number; m: number }> = {};
  const recs: AssessmentResult["recommendations"] = [];
  const factors = vulnerabilityFactors(v);
  const dependentHeavy = v.infants + v.children + v.seniors + v.needsAssistance > 0;

  for (const q of qs) {
    const val = VALUE[answers[q.id] ?? "no"];
    if (val === null) continue;
    // Dependents raise the importance of planning and supplies questions.
    const w = q.weight + (dependentHeavy && (q.category === "plan" || q.category === "supplies") ? 1 : 0);
    total += val * w; max += w;
    cat[q.category] ??= { s: 0, m: 0 };
    cat[q.category].s += val * w; cat[q.category].m += w;
    if (val < 1) {
      recs.push({ id: q.id, ...q.recommendation, priority: val === 0 && w >= 3 ? "high" : val === 0 ? "medium" : "low" });
    }
  }
  const score = max === 0 ? 0 : Math.round((total / max) * 100);
  const categoryScores = Object.fromEntries(Object.entries(cat).map(([k, x]) => [k, Math.round((x.s / x.m) * 100)]));
  const order = { high: 0, medium: 1, low: 2 } as const;
  recs.sort((a, b) => order[a.priority] - order[b.priority]);
  return { score, categoryScores, vulnerabilityFactors: factors, recommendations: recs, band: score >= 75 ? "well-prepared" : score >= 40 ? "building" : "getting-started" };
}

export const BAND_LABEL: Record<AssessmentResult["band"], string> = {
  "getting-started": "Getting started", building: "Building readiness", "well-prepared": "Well prepared",
};
