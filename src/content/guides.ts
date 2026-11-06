// Feature 3 — Disaster information and preparedness guidance.
// EDUCATIONAL CONTENT ONLY. Written in plain language by the Vanguard team as general
// preparedness guidance. It is not an alert, warning, or official instruction.
// Every guide links to the official agency that publishes authoritative information.
// Status: draft content — requires review by a qualified DRRM professional before public launch.

export type HazardKey = "typhoon" | "earthquake" | "flood" | "volcano" | "landslide" | "fire" | "tsunami" | "general";

export interface OfficialSource { name: string; url: string; role: string }

export interface Guide {
  key: HazardKey;
  title: string;
  tagline: string;
  summary: string;
  season?: string;
  before: string[];
  during: string[];
  after: string[];
  checklist: { key: string; label: string }[];
  understanding: { heading: string; body: string }[];
  sources: OfficialSource[];
  reviewedOn: string;
}

export const GUIDE_REVIEWED_ON = "2026-11-07";

const PAGASA: OfficialSource = { name: "PAGASA (DOST)", url: "https://www.pagasa.dost.gov.ph", role: "Official weather, tropical cyclone and rainfall information" };
const PHIVOLCS: OfficialSource = { name: "PHIVOLCS (DOST)", url: "https://www.phivolcs.dost.gov.ph", role: "Official earthquake, tsunami and volcano information" };
const NDRRMC: OfficialSource = { name: "NDRRMC / Office of Civil Defense", url: "https://ndrrmc.gov.ph", role: "National disaster risk reduction and management" };
const BFP: OfficialSource = { name: "Bureau of Fire Protection", url: "https://bfp.gov.ph", role: "Fire prevention and fire safety" };
const PRC: OfficialSource = { name: "Philippine Red Cross", url: "https://redcross.org.ph", role: "First aid, safety and humanitarian services" };

export const guides: Guide[] = [
  {
    key: "typhoon",
    title: "Typhoons",
    tagline: "Strong winds, heavy rain and storm surge",
    summary: "Tropical cyclones bring damaging winds, intense rainfall, flooding, landslides and, in coastal areas, storm surge. Most of the preparation can be done days ahead, while the storm is still being tracked.",
    season: "Most frequent from June to December, but tropical cyclones can occur in any month.",
    understanding: [
      { heading: "Wind signals", body: "PAGASA issues Tropical Cyclone Wind Signals (TCWS) from No. 1 to No. 5 for affected areas. A higher number means stronger expected winds. Signals and their meaning are published by PAGASA — always check the latest bulletin for your area." },
      { heading: "Storm surge", body: "Storm surge is an abnormal rise of sea water pushed ashore by a storm. It can flood coastal communities quickly and is one of the most dangerous parts of a typhoon. Follow local evacuation instructions in coastal and low-lying areas." },
      { heading: "Rain matters too", body: "A weak storm can still cause severe flooding and landslides if it brings a lot of rain. Do not judge risk by wind strength alone." },
    ],
    before: [
      "Know whether your home is in a flood-prone, coastal or landslide-prone area, and where your barangay's designated evacuation area is.",
      "Prepare a go-bag for each person and a home supply kit for at least three days.",
      "Secure or bring inside loose objects that strong winds can turn into projectiles.",
      "Trim tree branches near the house and check the roof, windows and drainage.",
      "Charge phones and power banks; prepare flashlights and a battery-powered radio.",
      "Store important documents in waterproof bags and keep a digital copy.",
      "Agree with your household on a meeting place and an out-of-area contact person.",
      "Follow official PAGASA bulletins and your LGU's announcements as the storm approaches.",
    ],
    during: [
      "Stay indoors, away from windows and glass doors.",
      "Evacuate immediately when local authorities instruct you to — do not wait until roads flood.",
      "Turn off main electricity if flooding begins inside your home, only if it is safe to do so.",
      "Do not walk or drive through floodwater; currents can be stronger than they look.",
      "Listen to a battery-powered radio or check official channels for updates.",
      "Beware of the calm 'eye' of the storm — winds return, often from the opposite direction.",
    ],
    after: [
      "Return home only when authorities say it is safe.",
      "Watch for fallen power lines, damaged structures and debris.",
      "Avoid floodwater, which may be contaminated; watch for signs of leptospirosis and seek medical advice after exposure.",
      "Document damage with photos for insurance or assistance applications.",
      "Check on neighbours, especially older adults and people with disabilities.",
      "Replenish your kit and review what worked in your plan.",
    ],
    checklist: [
      { key: "evac-area", label: "I know my barangay's evacuation area and route" },
      { key: "go-bag", label: "Go-bags are packed for every household member" },
      { key: "secure-items", label: "Outdoor objects are secured or brought inside" },
      { key: "power", label: "Phones and power banks are fully charged" },
      { key: "documents", label: "Important documents are in waterproof storage" },
      { key: "radio", label: "Battery-powered radio and spare batteries are ready" },
      { key: "meeting", label: "Household has agreed on a meeting place" },
    ],
    sources: [PAGASA, NDRRMC, PRC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "earthquake",
    title: "Earthquakes",
    tagline: "Sudden ground shaking without warning",
    summary: "The Philippines sits on active fault lines and earthquakes can strike at any time without warning. Preparing your home and practising Drop, Cover and Hold On are the most effective things you can do.",
    understanding: [
      { heading: "No reliable prediction", body: "Earthquakes cannot be predicted to a specific day or time. Be wary of messages that claim to predict one. PHIVOLCS publishes official earthquake information." },
      { heading: "Aftershocks", body: "Smaller earthquakes often follow a large one and can damage already-weakened structures. Stay alert after the main shaking stops." },
      { heading: "Coastal areas", body: "Strong or long shaking near the coast can be a natural warning sign of a tsunami. Move to high ground immediately — see the tsunami guide." },
    ],
    before: [
      "Secure heavy furniture, shelves and appliances to walls; store heavy items on low shelves.",
      "Identify safe spots in each room: under sturdy tables, away from windows and things that can fall.",
      "Learn how to turn off gas, water and electricity.",
      "Practise Drop, Cover and Hold On with your household.",
      "Keep shoes and a flashlight near your bed.",
      "If you are concerned about your building's structural safety, consult a licensed engineer.",
    ],
    during: [
      "DROP to your hands and knees.",
      "COVER your head and neck under a sturdy table or against an interior wall.",
      "HOLD ON until the shaking stops.",
      "If outdoors, move away from buildings, trees, posts and power lines.",
      "If driving, stop in a clear area away from bridges and overpasses and stay inside.",
      "Do not run outside during shaking — falling debris is a major cause of injury.",
    ],
    after: [
      "Expect aftershocks; Drop, Cover and Hold On again if shaking returns.",
      "Check yourself and others for injuries; give first aid if trained.",
      "Leave damaged buildings carefully and do not re-enter until declared safe.",
      "If you smell gas, open windows, leave, and do not use switches or open flames.",
      "Near the coast? Move to high ground immediately if shaking was strong or long.",
      "Use text messages instead of calls to keep lines free.",
    ],
    checklist: [
      { key: "anchor", label: "Heavy furniture and shelves are anchored" },
      { key: "safe-spots", label: "Safe spots are identified in each room" },
      { key: "utilities", label: "Adults know how to shut off gas, water and power" },
      { key: "practice", label: "Household practised Drop, Cover and Hold On this year" },
      { key: "bedside", label: "Shoes and flashlight are kept near beds" },
    ],
    sources: [PHIVOLCS, NDRRMC, PRC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "flood",
    title: "Floods",
    tagline: "Rising water from rain, rivers or the sea",
    summary: "Floods can develop over hours or within minutes (flash floods). Knowing your area's flood history and moving early are key.",
    understanding: [
      { heading: "Rainfall warnings", body: "PAGASA issues rainfall advisories and warnings for heavy rain. Your LGU may issue local flood announcements and evacuation orders." },
      { heading: "Flash floods", body: "Areas near rivers, creeks and below steep slopes can flood suddenly with little warning. If you live in these areas, act early." },
      { heading: "Health risks", body: "Floodwater can carry sewage, chemicals and the bacteria that cause leptospirosis. Avoid wading, and seek medical advice if you were exposed." },
    ],
    before: [
      "Find out if your home is in a flood-prone area and know the route to higher ground.",
      "Raise electrical outlets, appliances and valuables above expected flood levels where possible.",
      "Keep drainage around your home clear of garbage.",
      "Prepare waterproof bags for documents and electronics.",
      "Plan where to move vehicles and livestock if water rises.",
    ],
    during: [
      "Move to higher ground or evacuate when advised — earlier is safer.",
      "Turn off electricity at the main switch if water is entering, only if you are dry and it is safe.",
      "Never walk, swim or drive through floodwater; 15 cm of fast-moving water can knock a person down.",
      "Stay away from rivers, drainage channels and electrical wires.",
    ],
    after: [
      "Return only when authorities declare it safe.",
      "Have electrical systems checked before switching power back on.",
      "Clean and disinfect everything that got wet; discard food that touched floodwater.",
      "Boil or treat drinking water until the supply is confirmed safe.",
      "Watch for fever and muscle pain after flood exposure and seek medical care.",
    ],
    checklist: [
      { key: "high-ground", label: "I know the route to higher ground" },
      { key: "raise", label: "Valuables and appliances are raised" },
      { key: "drainage", label: "Drainage around the home is clear" },
      { key: "waterproof", label: "Waterproof bags are ready for documents" },
    ],
    sources: [PAGASA, NDRRMC, PRC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "volcano",
    title: "Volcanic eruptions",
    tagline: "Ashfall, lava, lahar and volcanic gases",
    summary: "The Philippines has several active volcanoes. PHIVOLCS monitors them and publishes alert levels. Residents near volcanoes should know their hazard zone and evacuation plan.",
    understanding: [
      { heading: "Alert levels", body: "PHIVOLCS uses volcano alert levels from 0 (normal) to 5 (hazardous eruption in progress). Each level has published meanings and recommended actions — check PHIVOLCS for the current level of a specific volcano." },
      { heading: "Permanent danger zones", body: "Some volcanoes have permanent danger zones where entry is prohibited. Respect these restrictions at all times." },
      { heading: "Lahar", body: "Lahar is a fast-moving flow of volcanic debris and water, often triggered by heavy rain, and can occur long after an eruption." },
    ],
    before: [
      "Know if you live, work or study within a volcano hazard zone.",
      "Prepare N95 masks or well-fitting masks, goggles and long-sleeved clothing for ashfall.",
      "Plan evacuation routes and a place to stay outside the hazard zone.",
      "Prepare to protect water storage from ash contamination.",
    ],
    during: [
      "Follow evacuation orders immediately.",
      "Stay indoors during ashfall; close windows and doors.",
      "Wear a mask and eye protection if you must go outside.",
      "Avoid river channels and low-lying areas where lahar may flow.",
      "Avoid driving in heavy ashfall; ash reduces visibility and makes roads slippery.",
    ],
    after: [
      "Clear ash from roofs carefully — ash is heavy, especially when wet. Use protective gear.",
      "Keep children and people with respiratory conditions indoors until the air clears.",
      "Do not return to evacuated areas until authorities allow it.",
    ],
    checklist: [
      { key: "zone", label: "I know if I'm in a volcano hazard zone" },
      { key: "masks", label: "Masks and goggles are ready for everyone" },
      { key: "evac-plan", label: "Evacuation destination outside the zone is planned" },
    ],
    sources: [PHIVOLCS, NDRRMC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "landslide",
    title: "Landslides",
    tagline: "Moving earth on slopes, often after heavy rain",
    summary: "Landslides happen when soil and rock move down slopes, commonly during prolonged or intense rain and after earthquakes. Homes on or below slopes are most exposed.",
    understanding: [
      { heading: "Warning signs", body: "New cracks in the ground or walls, tilting trees or posts, sudden muddy water in streams, and unusual rumbling sounds can signal ground movement." },
      { heading: "Rain-triggered", body: "Prolonged heavy rain saturates soil. If your area has had days of rain, stay alert even after the rain stops." },
    ],
    before: [
      "Find out if your home is in a landslide-susceptible area (ask your barangay or MDRRMO).",
      "Watch for cracks, bulges or leaning structures around your property.",
      "Plan an evacuation route away from the slope's path.",
      "Keep drainage on slopes clear and avoid cutting into slopes without engineering advice.",
    ],
    during: [
      "Evacuate immediately if you notice warning signs or when instructed.",
      "Move away from the path of the slide, toward stable ground.",
      "Avoid river valleys and low areas below slopes during heavy rain.",
    ],
    after: [
      "Stay away from the slide area; further slides may occur.",
      "Report damaged roads, utilities and structures to local authorities.",
      "Have a professional assess your property before returning.",
    ],
    checklist: [
      { key: "susceptible", label: "I've checked if my area is landslide-susceptible" },
      { key: "signs", label: "Household knows the warning signs" },
      { key: "route", label: "Evacuation route away from slopes is planned" },
    ],
    sources: [PHIVOLCS, NDRRMC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "fire",
    title: "Fires",
    tagline: "Home and community fires spread fast",
    summary: "Residential fires can spread through a home in minutes, especially in dense neighbourhoods. Prevention, early detection and a practised escape plan save lives.",
    understanding: [
      { heading: "Common causes", body: "Faulty or overloaded electrical wiring, unattended cooking, candles and cigarettes are frequent causes of home fires." },
      { heading: "Smoke is the main danger", body: "Smoke can disable you before flames reach you. Stay low where the air is clearer when escaping." },
    ],
    before: [
      "Install smoke detectors and test them monthly.",
      "Keep a fire extinguisher accessible and learn how to use it (PASS: Pull, Aim, Squeeze, Sweep).",
      "Avoid overloading outlets; have old wiring checked by a licensed electrician.",
      "Plan two ways out of every room and practise a home fire escape drill.",
      "Keep matches, lighters and flammable liquids away from children.",
    ],
    during: [
      "Alert everyone and get out — do not stop to collect belongings.",
      "Stay low under smoke; cover your nose and mouth with a cloth.",
      "Feel doors with the back of your hand before opening; if hot, use another exit.",
      "If clothes catch fire: Stop, Drop and Roll.",
      "Once out, stay out and call 911 for emergency assistance.",
    ],
    after: [
      "Do not re-enter until the fire service says it is safe.",
      "Seek medical care for burns or smoke inhalation.",
      "Document damage for insurance and assistance claims.",
    ],
    checklist: [
      { key: "smoke-alarm", label: "Smoke detectors installed and tested this month" },
      { key: "extinguisher", label: "Fire extinguisher is accessible and in date" },
      { key: "two-ways", label: "Two ways out of each room are identified" },
      { key: "drill", label: "Household practised a fire escape drill" },
    ],
    sources: [BFP, PRC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "tsunami",
    title: "Tsunamis",
    tagline: "Powerful waves after undersea earthquakes",
    summary: "A tsunami is a series of waves usually caused by a large undersea earthquake. Near the source, waves can arrive within minutes — before any official warning. Natural warning signs are your cue to move.",
    understanding: [
      { heading: "Natural warning signs", body: "Strong ground shaking that makes it hard to stand, a sudden drop or rise in sea level, or a loud roaring sound from the sea are natural tsunami warnings. Move to high ground immediately — do not wait for an official announcement." },
      { heading: "Multiple waves", body: "A tsunami is a series of waves that can continue for hours. The first wave is not always the largest." },
    ],
    before: [
      "Know whether your home, school or workplace is in a coastal hazard zone.",
      "Identify high ground or a tall, sturdy building you can reach on foot within minutes.",
      "Practise walking your evacuation route with your household.",
    ],
    during: [
      "If you feel strong shaking near the coast, protect yourself, then move to high ground immediately.",
      "Go on foot if possible; roads may be blocked.",
      "Move inland or to higher ground; if trapped, go to an upper floor of a strong concrete building.",
      "Never go to the shore to watch the waves.",
    ],
    after: [
      "Stay on high ground until official sources confirm it is safe — waves can continue for hours.",
      "Avoid damaged buildings and debris in the water.",
    ],
    checklist: [
      { key: "zone", label: "I know if I'm in a coastal hazard zone" },
      { key: "high-ground", label: "I know high ground reachable on foot" },
      { key: "signs", label: "Household knows the natural warning signs" },
    ],
    sources: [PHIVOLCS, NDRRMC],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
  {
    key: "general",
    title: "General emergency safety",
    tagline: "Foundations that apply to every hazard",
    summary: "Many preparedness actions help in every type of emergency: a household plan, emergency contacts, supplies, first aid knowledge and reliable sources of information.",
    understanding: [
      { heading: "Emergency hotline", body: "911 is the Philippine national emergency hotline. Save it and your local emergency numbers, and confirm local numbers with your LGU since they can change." },
      { heading: "Trusted information", body: "During emergencies, misinformation spreads quickly. Rely on official government agencies and your LGU for warnings and instructions." },
      { heading: "Vanguard is not an alert service", body: "Vanguard provides preparedness education and planning tools. It does not issue warnings or contact emergency services for you." },
    ],
    before: [
      "Make a household emergency plan and share it with everyone.",
      "Save emergency numbers on every phone and on paper.",
      "Prepare go-bags and a home supply kit.",
      "Learn basic first aid and CPR from a recognised provider.",
      "Keep some emergency cash in small bills — ATMs and e-wallets may not work during outages.",
      "Know how to receive official warnings (radio, LGU channels, official agency pages).",
    ],
    during: [
      "Stay calm and follow official instructions.",
      "Check on household members and people who need assistance.",
      "Use phones for urgent communication only; text when possible.",
    ],
    after: [
      "Check for injuries and hazards before moving around.",
      "Let your contacts know you are safe.",
      "Record what happened and review your plan.",
    ],
    checklist: [
      { key: "plan", label: "Household emergency plan is written and shared" },
      { key: "numbers", label: "Emergency numbers saved on phones and on paper" },
      { key: "first-aid", label: "At least one adult has first aid training" },
      { key: "cash", label: "Emergency cash in small bills is set aside" },
    ],
    sources: [NDRRMC, PRC, PAGASA, PHIVOLCS],
    reviewedOn: GUIDE_REVIEWED_ON,
  },
];

export const hazardKeys = guides.map((g) => g.key);
export function getGuide(key: string) {
  return guides.find((g) => g.key === key);
}
export const HAZARD_LABEL: Record<string, string> = Object.fromEntries(guides.map((g) => [g.key, g.title]));
HAZARD_LABEL.all = "All hazards";

export function searchGuides(query: string, hazard?: string) {
  const q = query.trim().toLowerCase();
  return guides.filter((g) => {
    if (hazard && hazard !== "all" && g.key !== hazard) return false;
    if (!q) return true;
    const hay = [g.title, g.tagline, g.summary, ...g.before, ...g.during, ...g.after, ...g.understanding.map((u) => u.heading + " " + u.body)]
      .join(" ").toLowerCase();
    return q.split(/\s+/).every((t) => hay.includes(t));
  });
}
