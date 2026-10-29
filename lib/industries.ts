import { DEALER_PROMPT } from "./dealer-prompt";

export type Field = { key: string; label: string; value: string; hint?: string; check?: boolean };
export type Scenario = { id: string; label: string; goal: string; opener: string; asks: string[] };
export type Rubric = { greeting: [string, string]; accuracy: [string, string]; booking: [string, string] };
export type Coaching = { greeting: string; offer: string; slot: string };
export type Industry = {
  id: string; label: string; kind: string; biz: string; staff: string;
  fields: Field[]; scenarios: Scenario[]; rubric: Rubric; coaching: Coaching;
  bookingRe: RegExp; persona?: string;
  assistant?: { model?: string; temperature?: number; voiceId?: string; maxDurationSeconds?: number; endCallPhrases?: string[] };
};

const f = (key: string, label: string, value: string, hint?: string, check = true): Field => ({ key, label, value, hint, check });

export const INDUSTRIES: Industry[] = [
  {
    id: "dealership", label: "Car dealership", kind: "car dealership", biz: "Lakeshore Motors", staff: "Dana",
    persona: DEALER_PROMPT,
    assistant: { model: "gpt-4o", temperature: 0.8, voiceId: "Elliot", maxDurationSeconds: 420, endCallPhrases: ["have a good one, bye", "alright, bye"] },
    fields: [
      f("hours", "Service hours", "Mon–Sat 7:30am to 6pm"),
      f("oil", "Oil-change price", "$89.95"),
      f("tradein", "Trade-in process", "free 15-minute appraisal"),
      f("financing", "Financing offers", "from 6.49% on certified used"),
      f("promo", "Current promo", "free brake inspection with any service", "optional"),
    ],
    scenarios: [
      { id: "service", label: "Book a service appointment", goal: "Book a service appointment for the brake noise; ask about availability this week or Saturday and what a brake inspection or an oil change costs.", opener: "Hi, um, I'm calling to get my car looked at. When does service have availability?", asks: ["Hi, I'd like to get my car in for service. When are you open?", "What does an oil change run? And there's a squeal when I brake.", "Okay. Can you get me in?"] },
      { id: "tradein", label: "Ask about trade-in value", goal: "Ask how trade-ins work and for a ballpark on a 2017 Civic with 112,000 km.", opener: "Hi, I'm thinking about trading in my Civic. How does that work with you guys?", asks: ["Hi, how does a trade-in work there?", "Roughly what would a 2017 Civic with 112k get?", "Okay, I'll think about it."] },
      { id: "financing", label: "Ask about financing", goal: "Ask about financing a used SUV, current rates, and what payments around $400 a month look like.", opener: "Hi, I'm looking at a used SUV and wanted to ask about financing.", asks: ["Hi, what kind of financing do you have on used SUVs?", "I'd want to stay around 400 a month. Is that doable?", "Okay, good to know."] },
    ],
    rubric: {
      greeting: ["Greeting", "Says the dealership name and department, gives a name, offers help."],
      accuracy: ["Service & pricing info", "Service hours, oil-change price, trade-in process, financing and promo match the facts."],
      booking: ["Set appointment / test drive", "Offers a specific service slot, appraisal or test-drive time and takes a name."],
    },
    coaching: {
      greeting: "Thanks for calling Lakeshore Motors service, this is Dana, how can I help?",
      offer: "Right now any service comes with a free brake inspection.",
      slot: "I can get you in Thursday at 8:00 or Saturday at 10:30. Which works?",
    },
    bookingRe: /appointment|book|schedule|test drive|appraisal|get you in|come in/i,
  },
  {
    id: "barber", label: "Barbershop / salon", kind: "barbershop", biz: "Maple & Main Barbers", staff: "Sam",
    fields: [f("hours", "Saturday hours", "9am to 5pm"), f("price", "Key price", "$35 for a haircut"), f("special", "Saturday special", "$5 off fades before noon", "optional")],
    scenarios: [
      { id: "hours", label: "Ask about Saturday hours and prices", goal: "Ask their Saturday hours, the price of a regular haircut, and any Saturday specials.", opener: "Hi there, I was wondering what your hours are this Saturday?", asks: ["Hi, are you open Saturday? What are the hours?", "And what's a regular haircut?", "Any Saturday specials?"] },
      { id: "book", label: "Book an appointment", goal: "Book a haircut for this Saturday late morning and ask what it costs.", opener: "Hi, I'd like to book a haircut for Saturday.", asks: ["Hi, can I book a cut for Saturday?", "How much is it?", "Late morning would be best."] },
    ],
    rubric: {
      greeting: ["Greeting", "Says the shop name, gives a name, offers help."],
      accuracy: ["Info accuracy", "Hours, prices and the Saturday special match the facts."],
      booking: ["Booking / upsell", "Offers a specific chair time rather than asking if they want to book."],
    },
    coaching: {
      greeting: "Thanks for calling Maple & Main, this is Sam, how can I help?",
      offer: "This Saturday it's $5 off fades before noon.",
      slot: "I've got 11:30 or 2:15 Saturday, want one?",
    },
    bookingRe: /book|appointment|schedule|got \d|want one|grab you/i,
  },
  {
    id: "restaurant", label: "Restaurant", kind: "restaurant", biz: "Harbour Street Kitchen", staff: "Mia",
    fields: [f("hours", "Hours", "5pm to 10pm"), f("price", "Popular item and price", "$24 for the brick-oven pizza"), f("special", "Current special", "half-price wine on Tuesdays", "optional"), f("private", "Group / private dining", "parties up to 20", "optional")],
    scenarios: [
      { id: "reserve", label: "Make a reservation", goal: "Ask for a table for four this Friday around 7 and ask about specials.", opener: "Hi, I'm hoping to get a table for four on Friday.", asks: ["Hi, can I get a table for four Friday?", "What are you known for, and roughly how much?", "Any specials?"] },
      { id: "group", label: "Ask about a group booking", goal: "Ask whether they can host a group of 15 and what that involves.", opener: "Hi, do you take bookings for bigger groups?", asks: ["Hi, can you take a group of 15?", "What would that cost roughly?", "Okay, thanks."] },
    ],
    rubric: {
      greeting: ["Greeting", "Restaurant name, a name, a warm offer to help."],
      accuracy: ["Menu & hours info", "Hours, prices, specials and group options match the facts."],
      booking: ["Reservation", "Offers a specific table time and takes a name."],
    },
    coaching: { greeting: "Good evening, Harbour Street Kitchen, this is Mia, how can I help?", offer: "Tuesdays the wine is half price.", slot: "I have 6:45 or 7:30 on Friday for four. Shall I put you down?" },
    bookingRe: /reserv|book|table at|put you down|\d:\d\d/i,
  },
  {
    id: "clinic", label: "Dental / medical clinic", kind: "dental clinic", biz: "Riverside Dental", staff: "Priya",
    fields: [f("hours", "Hours", "Mon–Sat 8am to 4pm"), f("price", "New-patient exam price", "$129 exam and cleaning"), f("insurance", "Insurance / direct billing", "direct billing for most plans"), f("special", "New-patient offer", "free whitening kit", "optional")],
    scenarios: [
      { id: "newpatient", label: "Book as a new patient", goal: "Ask if they take new patients, whether they direct-bill insurance, and book a cleaning.", opener: "Hi, are you taking new patients?", asks: ["Hi, are you taking new patients?", "Do you bill insurance directly? What's the cost?", "When could I come in?"] },
      { id: "urgent", label: "Ask about an urgent visit", goal: "Say you have a toothache and ask how soon they can see you.", opener: "Hi, I've got a pretty bad toothache. How soon could someone see me?", asks: ["Hi, I have a toothache. Can you see me soon?", "What would it cost?", "Okay."] },
    ],
    rubric: {
      greeting: ["Greeting", "Clinic name, a name, calm offer to help."],
      accuracy: ["Policy & pricing info", "Hours, fees, insurance and offers match the facts."],
      booking: ["Book the visit", "Offers a specific appointment time and takes contact details."],
    },
    coaching: { greeting: "Thank you for calling Riverside Dental, this is Priya, how can I help?", offer: "New patients get a free whitening kit with their first cleaning.", slot: "I can see you Wednesday at 9:00 or Thursday at 2:30. Which suits you?" },
    bookingRe: /appointment|book|schedule|see you|come in/i,
  },
  {
    id: "home", label: "Home services", kind: "plumbing and HVAC company", biz: "Brightline Plumbing", staff: "Chris",
    fields: [f("hours", "Hours", "7am to 7pm, 7 days"), f("price", "Service-call fee", "$99 service call"), f("area", "Service area", "the whole city and suburbs"), f("special", "Current promo", "$50 off furnace tune-ups", "optional")],
    scenarios: [
      { id: "quote", label: "Ask for a quote", goal: "Say your water heater is leaking and ask what a visit costs and when they can come.", opener: "Hi, my water heater's leaking a bit. Do you guys do that?", asks: ["Hi, my water heater's leaking. Can you help?", "What's it cost to have someone come out?", "When could you come?"] },
      { id: "visit", label: "Book a visit", goal: "Book a furnace tune-up this week.", opener: "Hi, I'd like to get my furnace looked at before winter.", asks: ["Hi, I'd like a furnace tune-up.", "How much is that?", "When's your next opening?"] },
    ],
    rubric: {
      greeting: ["Greeting", "Company name, a name, an offer to help."],
      accuracy: ["Pricing & coverage info", "Hours, fees, service area and promo match the facts."],
      booking: ["Book the job", "Offers a specific arrival window and takes an address."],
    },
    coaching: { greeting: "Brightline Plumbing, this is Chris, how can I help?", offer: "Right now furnace tune-ups are $50 off.", slot: "I can have a tech there tomorrow 8 to 10 or 1 to 3. Which works?" },
    bookingRe: /book|schedule|appointment|window|send (a|someone)|come out/i,
  },
  {
    id: "custom", label: "Custom", kind: "", biz: "Your business", staff: "Alex",
    fields: [f("hours", "Hours", "9am to 5pm"), f("price", "Key price", "$50 consultation"), f("special", "Current offer", "", "optional")],
    scenarios: [{ id: "custom", label: "Custom questions", goal: "", opener: "Hi, I had a couple of quick questions.", asks: [] }],
    rubric: {
      greeting: ["Greeting", "Business name, a name, an offer to help."],
      accuracy: ["Info accuracy", "Answers match the facts the owner entered."],
      booking: ["Booking / next step", "Offers a specific next step or time."],
    },
    coaching: { greeting: "Thanks for calling, this is Alex, how can I help?", offer: "This week we're offering ...", slot: "I've got Tuesday at 10 or Thursday at 3. Want one?" },
    bookingRe: /book|appointment|schedule|got \d|want one/i,
  },
];

export const getIndustry = (id?: string) => INDUSTRIES.find(i => i.id === id) || INDUSTRIES[0];
export const DEFAULT_INDUSTRY = "dealership";

export type Setup = { industry: string; biz: string; phone: string; values: Record<string, string>; scenario: string; bizType?: string; questions?: string };

export const scenarioOf = (s: Setup) => {
  const ind = getIndustry(s.industry);
  const sc = ind.scenarios.find(x => x.id === s.scenario) || ind.scenarios[0];
  if (ind.id !== "custom") return sc;
  const qs = (s.questions || "").split(/\n|\?/).map(q => q.trim()).filter(Boolean).map(q => q + "?");
  return { ...sc, goal: `Ask these questions: ${qs.join(" ")}`, asks: qs.length ? qs : ["Hi, I had a quick question about your services."] };
};
export const kindOf = (s: Setup) => getIndustry(s.industry).id === "custom" ? (s.bizType || "local business") : getIndustry(s.industry).kind;

/** System prompt for the Vapi caller, driven by the industry config. */
export function callerPrompt(s: Setup) {
  const ind = getIndustry(s.industry); const sc = scenarioOf(s);
  const base = ind.persona || `You are a regular customer phoning ${s.biz}, a ${kindOf(s)}. Sound natural, friendly and brief, like a real person on the phone. Never say you are an AI, a test, or a mystery shopper, and never mention scoring. If asked for a name use "Sam". Do not give out real personal details.`;
  return `${base}

Focus for this call (${sc.label}): ${sc.goal}
Rules: Let the staff member answer and greet you first; say nothing until they do. After their greeting, open with something like: "${sc.opener}" Ask one thing at a time. Don't volunteer what you expect the answers to be. If they offer a specific time, you may accept it. When your questions are answered, thank them and say goodbye.`;
}

/** Shared Vapi assistant body (used for a transient outbound assistant or PATCH /assistant/{id}). */
export function assistantBody(s: Setup) {
  const ind = getIndustry(s.industry); const a = ind.assistant || {};
  const voiceId = process.env.VAPI_VOICE_ID || a.voiceId;
  return {
    name: `CallCheck Shopper - ${ind.label}`.slice(0, 40).slice(0, 40),
    firstMessageMode: "assistant-waits-for-user",
    firstMessage: "",
    maxDurationSeconds: a.maxDurationSeconds || 240,
    endCallPhrases: a.endCallPhrases || ["goodbye", "bye now", "have a good day"],
    model: { provider: "openai", model: process.env.VAPI_MODEL || a.model || "gpt-4o-mini", temperature: a.temperature ?? 0.6, messages: [{ role: "system", content: callerPrompt(s) }] },
    ...(voiceId ? { voice: { provider: "vapi", voiceId } } : {}),
    artifactPlan: { recordingEnabled: true, transcriptPlan: { enabled: true } },
    metadata: { app: "callcheck", industry: ind.id, scenario: scenarioOf(s).label },
  };
}

/** Facts list (label: value) for scoring prompts and rule checks. */
export const factList = (s: Setup) => getIndustry(s.industry).fields.map(fl => ({ ...fl, value: (s.values[fl.key] ?? "").trim() }));
