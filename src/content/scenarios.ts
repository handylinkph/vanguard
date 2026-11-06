// Feature 8 — Educational drills and decision-based simulations.
// For practice only. Not a certification or assessment of real-world competence.

export interface Choice { id: string; text: string; points: number; feedback: string }
export interface Step { id: string; situation: string; prompt: string; choices: Choice[] }
export interface Scenario {
  key: string; hazard: string; title: string; summary: string; minutes: number;
  steps: Step[];
  drillChecklist: string[];
}

export const scenarios: Scenario[] = [
  {
    key: "quake-home-night", hazard: "earthquake", title: "Earthquake at night", minutes: 5,
    summary: "A strong earthquake shakes your home at 2 a.m. Practise the first minutes.",
    steps: [
      { id: "s1", situation: "You wake up to strong shaking. Objects are falling from shelves.", prompt: "What do you do first?",
        choices: [
          { id: "a", text: "Run outside immediately", points: 0, feedback: "Running during shaking exposes you to falling objects and debris. Most injuries happen this way." },
          { id: "b", text: "Stay in bed, cover your head with a pillow, and hold on", points: 3, feedback: "Correct for when you are in bed and can't safely move: protect your head and neck and stay put until shaking stops." },
          { id: "c", text: "Stand in the doorway", points: 1, feedback: "Modern doorways are not stronger than other parts of the house, and swinging doors can injure you." },
        ] },
      { id: "s2", situation: "The shaking stops. It's dark and you hear glass on the floor.", prompt: "What next?",
        choices: [
          { id: "a", text: "Put on the shoes and use the flashlight you keep by the bed", points: 3, feedback: "Good. Shoes protect you from broken glass, and a flashlight is safer than candles." },
          { id: "b", text: "Light a candle to see", points: 0, feedback: "Open flames are dangerous after an earthquake because of possible gas leaks." },
          { id: "c", text: "Walk barefoot to check on family", points: 1, feedback: "Checking on family matters, but protect your feet first — cuts are a common injury." },
        ] },
      { id: "s3", situation: "You smell gas in the kitchen.", prompt: "What do you do?",
        choices: [
          { id: "a", text: "Turn on the lights to find the leak", points: 0, feedback: "Electrical switches can spark and ignite gas." },
          { id: "b", text: "Open windows, shut off the gas valve if safe, and leave the house", points: 3, feedback: "Correct. Ventilate, shut off if you know how, and get everyone out." },
          { id: "c", text: "Ignore it and go back to sleep", points: 0, feedback: "A gas leak is a serious fire and health hazard." },
        ] },
      { id: "s4", situation: "Everyone is outside and safe. Phone lines seem busy.", prompt: "How do you let relatives know you're okay?",
        choices: [
          { id: "a", text: "Send a short text to your out-of-area contact", points: 3, feedback: "Texts often get through when calls don't, and one contact can relay to others." },
          { id: "b", text: "Call everyone repeatedly", points: 1, feedback: "Repeated calls congest networks needed for emergencies." },
          { id: "c", text: "Go back inside to charge your phone", points: 0, feedback: "Don't re-enter until the building is checked — aftershocks are likely." },
        ] },
    ],
    drillChecklist: ["Everyone dropped, covered and held on within 5 seconds", "Each person identified the safe spot in their room", "Shoes and flashlights were found quickly", "Household gathered at the meeting point", "Someone sent a check-in text to the out-of-area contact"],
  },
  {
    key: "typhoon-approach", hazard: "typhoon", title: "Typhoon approaching", minutes: 6,
    summary: "PAGASA has raised wind signals for your province and your LGU is preparing for evacuation.",
    steps: [
      { id: "s1", situation: "Official bulletins say a typhoon may reach your area in 36 hours.", prompt: "What's your best first step?",
        choices: [
          { id: "a", text: "Wait until it starts raining to prepare", points: 0, feedback: "Preparing early avoids crowded stores and dangerous last-minute travel." },
          { id: "b", text: "Review your plan, check your kit and charge devices now", points: 3, feedback: "Right — use the lead time to get ready calmly." },
          { id: "c", text: "Share every forwarded message you receive", points: 0, feedback: "Unverified messages spread misinformation. Rely on PAGASA and your LGU." },
        ] },
      { id: "s2", situation: "Your barangay announces pre-emptive evacuation for your low-lying street.", prompt: "What do you do?",
        choices: [
          { id: "a", text: "Evacuate now with your go-bags", points: 3, feedback: "Correct. Pre-emptive evacuation keeps you safe before conditions worsen." },
          { id: "b", text: "Stay to guard the house", points: 0, feedback: "Lives come first. Many casualties happen to people who stay in danger zones." },
          { id: "c", text: "Send the children ahead and stay behind", points: 1, feedback: "Families separating increases risk; evacuate together if you can." },
        ] },
      { id: "s3", situation: "On the way, the road ahead has knee-deep moving water.", prompt: "What do you do?",
        choices: [
          { id: "a", text: "Wade through quickly", points: 0, feedback: "Moving water can knock you down and hide open manholes and debris." },
          { id: "b", text: "Turn back and use an alternate route or ask officials", points: 3, feedback: "Correct. Never cross moving floodwater." },
          { id: "c", text: "Drive through it", points: 0, feedback: "Vehicles can be swept away in shallow moving water." },
        ] },
    ],
    drillChecklist: ["Go-bags were retrieved in under 5 minutes", "Everyone knew the evacuation destination", "Documents were in waterproof storage", "Pets were secured for transport", "Main power switch location was confirmed"],
  },
  {
    key: "house-fire", hazard: "fire", title: "Fire in the house", minutes: 4,
    summary: "Smoke is coming from the kitchen and spreading.",
    steps: [
      { id: "s1", situation: "A pan of oil catches fire on the stove.", prompt: "What do you do?",
        choices: [
          { id: "a", text: "Pour water on it", points: 0, feedback: "Water on an oil fire can cause a violent flare-up." },
          { id: "b", text: "Turn off the heat and cover the pan with a lid if it is safe to do so", points: 3, feedback: "Correct. Smothering cuts off oxygen. If it spreads, get out." },
          { id: "c", text: "Carry the pan outside", points: 0, feedback: "You could spill burning oil on yourself." },
        ] },
      { id: "s2", situation: "The fire has spread and the hallway is filling with smoke.", prompt: "How do you escape?",
        choices: [
          { id: "a", text: "Stay low and use your second exit", points: 3, feedback: "Correct. Cleaner air is near the floor, and a second exit is why you plan two ways out." },
          { id: "b", text: "Go back for valuables", points: 0, feedback: "Never go back. Seconds matter in a fire." },
          { id: "c", text: "Hide in a closet", points: 0, feedback: "Hiding makes rescue harder. Get out or signal from a window." },
        ] },
      { id: "s3", situation: "You're outside. A family member is missing.", prompt: "What next?",
        choices: [
          { id: "a", text: "Call 911 and tell responders where the person may be", points: 3, feedback: "Correct. Give firefighters precise information rather than re-entering." },
          { id: "b", text: "Run back in to search", points: 0, feedback: "Re-entering a burning building is extremely dangerous." },
        ] },
    ],
    drillChecklist: ["Smoke detector was tested", "Everyone exited within 2 minutes", "Second exits were identified for each room", "Household gathered at the outside meeting point"],
  },
  {
    key: "tsunami-coast", hazard: "tsunami", title: "Strong shaking at the coast", minutes: 3,
    summary: "You're at a coastal barangay when a long, strong earthquake hits.",
    steps: [
      { id: "s1", situation: "The shaking lasted almost a minute and made it hard to stand.", prompt: "Once it stops, what do you do?",
        choices: [
          { id: "a", text: "Wait for an official tsunami warning before moving", points: 1, feedback: "Near the source, waves can arrive before warnings. Strong shaking is itself a warning." },
          { id: "b", text: "Walk quickly to high ground or inland immediately", points: 3, feedback: "Correct. Move now, on foot if possible." },
          { id: "c", text: "Go to the beach to look at the sea", points: 0, feedback: "Never go to the shore to watch for waves." },
        ] },
      { id: "s2", situation: "On high ground, the first wave has passed and the water recedes.", prompt: "Can you go back now?",
        choices: [
          { id: "a", text: "Yes, the danger is over", points: 0, feedback: "Tsunamis are a series of waves; later waves can be larger." },
          { id: "b", text: "No, wait for official all-clear", points: 3, feedback: "Correct. Stay until authorities say it is safe." },
        ] },
    ],
    drillChecklist: ["Household reached high ground on foot", "Route time was measured", "Everyone can name the natural warning signs"],
  },
  {
    key: "flood-rising", hazard: "flood", title: "Rising floodwater", minutes: 4,
    summary: "Heavy rain for hours and water is starting to enter the street.",
    steps: [
      { id: "s1", situation: "Water is entering the ground floor.", prompt: "What do you do about electricity?",
        choices: [
          { id: "a", text: "Turn off the main switch if you are dry and can reach it safely", points: 3, feedback: "Correct — never touch electrical equipment while standing in water." },
          { id: "b", text: "Unplug appliances while standing in water", points: 0, feedback: "This risks electrocution." },
        ] },
      { id: "s2", situation: "Your LGU announces evacuation.", prompt: "What do you bring?",
        choices: [
          { id: "a", text: "Go-bags, medicines, documents and pets", points: 3, feedback: "Correct. Your go-bag covers essentials." },
          { id: "b", text: "As much furniture as possible", points: 0, feedback: "Bulky items slow evacuation. Lives first." },
        ] },
    ],
    drillChecklist: ["Valuables were moved to a higher level", "Main switch location confirmed", "Go-bags were ready", "Evacuation route to higher ground walked"],
  },
];

export const getScenario = (k: string) => scenarios.find((s) => s.key === k);
export const maxScore = (s: Scenario) => s.steps.reduce((a, st) => a + Math.max(...st.choices.map((c) => c.points)), 0);

export function scoreRun(s: Scenario, picks: Record<string, string>) {
  let score = 0;
  const decisions = s.steps.map((st) => {
    const c = st.choices.find((x) => x.id === picks[st.id]);
    const best = Math.max(...st.choices.map((x) => x.points));
    score += c?.points ?? 0;
    return { step: st.id, choice: c?.id ?? null, points: c?.points ?? 0, best };
  });
  const max = maxScore(s);
  const pct = max ? Math.round((score / max) * 100) : 0;
  const suggestions = decisions.filter((d) => d.points < d.best).map((d) => {
    const st = s.steps.find((x) => x.id === d.step)!;
    const bestChoice = st.choices.reduce((a, b) => (b.points > a.points ? b : a));
    return `${st.prompt} — better choice: ${bestChoice.text}.`;
  });
  return { score, max, pct, decisions, suggestions };
}
