// Planning templates for Feature 1 (household/personal plans) and Feature 15 (organizations).

export interface PlanTemplate {
  key: string; title: string; hazard: string; description: string;
  checklist: { label: string; phase: "before" | "during" | "after" }[];
}

const common: PlanTemplate["checklist"] = [
  { label: "Write down a nearby meeting place and an out-of-neighbourhood meeting place", phase: "before" },
  { label: "Save emergency contacts on every phone and on paper", phase: "before" },
  { label: "Choose an out-of-area contact person", phase: "before" },
  { label: "Prepare go-bags for each household member", phase: "before" },
  { label: "Identify the barangay evacuation area and route", phase: "before" },
  { label: "Assign someone to assist each child, older adult, or person needing help", phase: "before" },
  { label: "Store copies of important documents in a waterproof pouch", phase: "before" },
  { label: "Follow official instructions from your LGU and national agencies", phase: "during" },
  { label: "Check in with your out-of-area contact", phase: "after" },
  { label: "Review the plan and replenish supplies", phase: "after" },
];

export const PLAN_TEMPLATES: PlanTemplate[] = [
  { key: "all", hazard: "all", title: "All-hazards household plan", description: "A general plan that covers the essentials for any emergency.", checklist: common },
  { key: "typhoon", hazard: "typhoon", title: "Typhoon & flood plan", description: "Actions for the days before, during and after a tropical cyclone.", checklist: [...common,
    { label: "Secure loose outdoor objects and check the roof", phase: "before" },
    { label: "Charge phones and power banks when a storm is forecast", phase: "before" },
    { label: "Move valuables and appliances to higher ground", phase: "before" },
    { label: "Evacuate early when your barangay advises", phase: "during" },
    { label: "Avoid floodwater; watch for leptospirosis symptoms", phase: "after" }] },
  { key: "earthquake", hazard: "earthquake", title: "Earthquake plan", description: "Drop, Cover and Hold On, plus what to do after shaking stops.", checklist: [...common,
    { label: "Anchor heavy furniture and shelves", phase: "before" },
    { label: "Identify safe spots in each room", phase: "before" },
    { label: "Keep shoes and a flashlight by each bed", phase: "before" },
    { label: "Drop, Cover and Hold On until shaking stops", phase: "during" },
    { label: "Check for gas leaks and structural damage before re-entering", phase: "after" }] },
  { key: "fire", hazard: "fire", title: "Home fire escape plan", description: "Two ways out of every room and a meeting place outside.", checklist: [...common.slice(0, 3),
    { label: "Draw a floor plan showing two exits from every room", phase: "before" },
    { label: "Test smoke detectors monthly", phase: "before" },
    { label: "Keep an extinguisher in the kitchen", phase: "before" },
    { label: "Get out, stay out, and call 911", phase: "during" }] },
  { key: "volcano", hazard: "volcano", title: "Volcano plan", description: "Ashfall protection and evacuation outside hazard zones.", checklist: [...common,
    { label: "Prepare masks and goggles for every person", phase: "before" },
    { label: "Plan where to stay outside the hazard zone", phase: "before" },
    { label: "Stay indoors during ashfall", phase: "during" }] },
  { key: "tsunami", hazard: "tsunami", title: "Coastal tsunami plan", description: "Recognise natural warning signs and move to high ground on foot.", checklist: [...common,
    { label: "Identify high ground reachable on foot within minutes", phase: "before" },
    { label: "Walk the route with the household and time it", phase: "before" },
    { label: "Move to high ground immediately after strong shaking", phase: "during" }] },
  { key: "landslide", hazard: "landslide", title: "Landslide plan", description: "Warning signs and evacuation away from slopes.", checklist: [...common,
    { label: "Learn warning signs: cracks, tilting trees, muddy streams", phase: "before" },
    { label: "Evacuate away from the slope's path when signs appear", phase: "during" }] },
  { key: "flood", hazard: "flood", title: "Flood plan", description: "Move early to higher ground.", checklist: [...common,
    { label: "Know the route to higher ground", phase: "before" },
    { label: "Turn off main power before water enters, if safe", phase: "during" }] },
];

export const getPlanTemplate = (k: string) => PLAN_TEMPLATES.find((t) => t.key === k) ?? PLAN_TEMPLATES[0];

export interface OrgTemplate { key: string; title: string; for: ("business" | "school")[]; sections: string[]; checklist: { list: "evacuation" | "continuity" | "supplies" | "communication"; label: string }[] }

export const ORG_TEMPLATES: OrgTemplate[] = [
  { key: "school-eop", title: "School emergency operations plan", for: ["school"],
    sections: ["Purpose and scope", "Roles (principal, DRRM coordinator, teachers, guards)", "Student accountability and release to guardians", "Evacuation and assembly areas", "Learners with disabilities", "Communication with parents", "Recovery and continuity of learning"],
    checklist: [
      { list: "evacuation", label: "Post evacuation maps in every classroom" },
      { list: "evacuation", label: "Designate assembly areas away from buildings and power lines" },
      { list: "evacuation", label: "Prepare class lists for headcount at assembly area" },
      { list: "evacuation", label: "Assign buddies for learners who need assistance" },
      { list: "communication", label: "Maintain updated parent/guardian contact lists" },
      { list: "communication", label: "Define the student release procedure to authorised guardians" },
      { list: "supplies", label: "Stock first aid kits in each building" },
      { list: "continuity", label: "Plan how learning continues if classrooms are unusable" },
    ] },
  { key: "business-continuity", title: "Business emergency & continuity plan", for: ["business"],
    sections: ["Purpose and scope", "Emergency response team", "Employee accountability", "Evacuation and shelter-in-place", "Critical functions and recovery time", "Data backup and IT recovery", "Supplier and customer communication"],
    checklist: [
      { list: "evacuation", label: "Mark exits and keep them unobstructed" },
      { list: "evacuation", label: "Appoint floor wardens for each floor" },
      { list: "evacuation", label: "Set an assembly point and headcount procedure" },
      { list: "communication", label: "Maintain an employee emergency contact list" },
      { list: "continuity", label: "List critical business functions and recovery priorities" },
      { list: "continuity", label: "Back up critical data off-site or to the cloud" },
      { list: "supplies", label: "Keep fire extinguishers inspected and in date" },
      { list: "supplies", label: "Store emergency supplies for staff who cannot go home" },
    ] },
  { key: "fire-evacuation", title: "Fire evacuation plan", for: ["business", "school"],
    sections: ["Alarm and notification", "Evacuation routes", "Wardens and responsibilities", "Assembly and headcount", "Persons needing assistance"],
    checklist: [
      { list: "evacuation", label: "Test alarms and record results" },
      { list: "evacuation", label: "Ensure two exit routes per floor" },
      { list: "supplies", label: "Check extinguisher pressure and inspection tags" },
    ] },
];

export const FINANCIAL_CHECKLIST = [
  { key: "emergency-fund", label: "Started an emergency fund (common guidance: 3–6 months of essential expenses over time)" },
  { key: "cash-small-bills", label: "Keep some cash in small bills at home for outages" },
  { key: "doc-copies", label: "Copies of IDs, land titles, and policies stored in a waterproof pouch and securely online" },
  { key: "insurance-review", label: "Reviewed home, health and life insurance coverage for disasters" },
  { key: "gov-benefits", label: "Know how to access SSS/GSIS, PhilHealth and Pag-IBIG calamity-related benefits (check eligibility with each agency)" },
  { key: "bills-list", label: "Listed recurring bills and how to pause or pay them during disruptions" },
  { key: "inventory", label: "Photographed household belongings for insurance claims" },
  { key: "budget-kit", label: "Budgeted for emergency kit supplies and replacements" },
];
