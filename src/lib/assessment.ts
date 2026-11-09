export type Answer = "yes" | "no" | "na" | null;

export interface Reading {
  id: string;
  time: string;
  location: string;
  o2: string; // percent
  gasPpm: string; // optional inert gas / other reading
}

export interface Photo {
  id: string;
  dataUrl: string;
  caption: string;
}

export type Outcome = "safe" | "controls" | "stop";

export interface Assessment {
  id: string;
  createdAt: string;
  assessor: string;
  site: string;
  area: string;
  gasType: string;
  activity: string;
  readings: Reading[];
  checklist: Record<string, Answer>;
  controls: string;
  outcome: Outcome | null;
  photos: Photo[];
}

export const GAS_TYPES = ["Nitrogen", "Argon", "Carbon dioxide", "Helium", "Other"];

export const CHECKLIST: { id: string; label: string }[] = [
  { id: "ventilation", label: "Adequate ventilation in place" },
  { id: "fixedMonitor", label: "Fixed O₂ monitoring working & in date" },
  { id: "personalMonitor", label: "Personal O₂ monitor worn & bump tested" },
  { id: "permit", label: "Permit to work issued (where required)" },
  { id: "isolation", label: "Gas supply isolated / locked off" },
  { id: "leaks", label: "No leaks found on lines, cylinders or dewars" },
  { id: "storage", label: "Cylinders stored & secured correctly" },
  { id: "signage", label: "Warning signage displayed" },
  { id: "training", label: "Personnel trained in inert gas hazards" },
  { id: "rescue", label: "Emergency / rescue plan in place" },
  { id: "buddy", label: "Lone working avoided / buddy present" },
];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  safe: "Safe to proceed",
  controls: "Proceed with extra controls",
  stop: "Do not proceed",
};

/** O2 safe range: 19.5% – 23.5% inclusive. */
export const O2_MIN = 19.5;
export const O2_MAX = 23.5;

export type O2Status = "ok" | "low" | "high" | "unknown";

export function o2Status(value: string): O2Status {
  if (value.trim() === "") return "unknown";
  const n = Number(value);
  if (!Number.isFinite(n)) return "unknown";
  if (n < O2_MIN) return "low";
  if (n > O2_MAX) return "high";
  return "ok";
}

/** Issues that should be flagged on an assessment. */
export function findIssues(a: Assessment): string[] {
  const issues: string[] = [];
  for (const r of a.readings) {
    const s = o2Status(r.o2);
    const where = r.location || "unlabelled point";
    if (s === "low") issues.push(`Low O₂ (${r.o2}%) at ${where}`);
    if (s === "high") issues.push(`High O₂ (${r.o2}%) at ${where}`);
  }
  for (const c of CHECKLIST) {
    if (a.checklist[c.id] === "no") issues.push(c.label);
  }
  return issues;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function newReading(): Reading {
  return {
    id: uid(),
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    o2: "",
    gasPpm: "",
  };
}

export function newAssessment(assessor = ""): Assessment {
  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    assessor,
    site: "",
    area: "",
    gasType: "Nitrogen",
    activity: "",
    readings: [newReading()],
    checklist: {},
    controls: "",
    outcome: null,
    photos: [],
  };
}
