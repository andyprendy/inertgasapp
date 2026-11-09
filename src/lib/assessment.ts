export type YesNo = boolean;
export type Units = "metric" | "imperial";

export interface Photo { id: string; dataUrl: string; caption: string }

export interface Assessment {
  id: string;
  createdAt: string;
  assessor: string;
  // Section 1 – space details
  date: string; // YYYY-MM-DD
  building: string;
  room: string;
  units: Units;
  length: string; width: string; height: string;
  volumeDirect: boolean;
  volume: string;
  barriers: boolean;
  openness: string;
  hvac: boolean;
  ahuFlow: string;
  outsideAirPct: string;
  roomFlow: string;
  kFactor: number; // 1–8
  // Section 2
  normal: { enabled: boolean; gas: string; flow: string };
  // Section 3
  container: { enabled: boolean; cryogen: string; litres: string };
  // Section 4
  spof: { enabled: boolean; gas: string; flow: string; threaded: boolean; ventilation: boolean; quiet: boolean };
  // Screening
  scenario: ScenarioId | null;
  notes: string;
  photos: Photo[];
}

export const GAS_TYPES = ["Nitrogen", "Argon", "Helium", "Carbon dioxide"];
export const CRYOGEN_TYPES = ["Liquid nitrogen", "Liquid argon", "Liquid helium", "Liquid CO₂"];
/** Litres of gas produced per litre of liquid at ~20 °C, 1 atm. */
export const EXPANSION: Record<string, number> = {
  "Liquid nitrogen": 694, "Liquid argon": 842, "Liquid helium": 754, "Liquid CO₂": 845,
};

export const UNIT_LABEL = {
  metric: { len: "m", vol: "m³", air: "m³/hr", gas: "LPM" },
  imperial: { len: "ft", vol: "ft³", air: "cfm", gas: "CFM" },
} as const;

const FT3_M3 = 0.0283168;
const num = (v: string) => { const n = Number(v); return v.trim() !== "" && Number.isFinite(n) ? n : null; };

/** Room volume in the selected units (length×width×height, or direct entry). */
export function roomVolume(a: Assessment): number | null {
  if (a.volumeDirect) return num(a.volume);
  const l = num(a.length), w = num(a.width), h = num(a.height);
  return l !== null && w !== null && h !== null ? l * w * h : null;
}
export function volumeM3(a: Assessment): number | null {
  const v = roomVolume(a);
  return v === null ? null : a.units === "metric" ? v : v * FT3_M3;
}
/** HVAC (m³/hr or cfm) → m³/min */
export function airToM3min(v: number, u: Units) { return u === "metric" ? v / 60 : v * FT3_M3; }
/** Gas flow (LPM or CFM) → m³/min */
export function gasToM3min(v: number, u: Units) { return u === "metric" ? v / 1000 : v * FT3_M3; }

/** Effective room ventilation in m³/min: room HVAC flow divided by the K-factor. */
export function effectiveVent(a: Assessment): number | null {
  if (!a.hvac) return null;
  const q = num(a.roomFlow);
  return q === null ? null : airToM3min(q, a.units) / a.kFactor;
}

export const O2_AIR = 20.9;

/** Indicative O2% after full release of the container into the room (no ventilation). */
export function containerO2(a: Assessment): number | null {
  const V = volumeM3(a), L = num(a.container.litres), x = EXPANSION[a.container.cryogen];
  if (!a.container.enabled || V === null || L === null || !x) return null;
  const gas = (L * x) / 1000;
  return (O2_AIR * V) / (V + gas);
}
/** Indicative steady-state O2% for a continuous release with ventilation. */
export function steadyO2(a: Assessment, flow: string): number | null {
  const Q = effectiveVent(a), f = num(flow);
  if (Q === null || f === null) return null;
  const g = gasToM3min(f, a.units);
  return (O2_AIR * Q) / (Q + g);
}
/** Dilution ratio of effective ventilation to gas flow. */
export function dilutionRatio(a: Assessment): number | null {
  const Q = effectiveVent(a), f = num(a.normal.flow);
  if (!a.normal.enabled || Q === null || f === null || f === 0) return null;
  return Q / gasToM3min(f, a.units);
}

export type Category = "A" | "B" | "C" | "D";
export type ScenarioId = "confined" | "enclosed" | "normalDeficit" | "accidentalDeficit" | "lowNormal" | "lowAccidental" | "outdoor";

export interface Scenario { id: ScenarioId; title: string; detail: string; category: Category; oda: boolean; odaNote: string; controlsTitle: string; controls: string[] }

export const SCENARIOS: Scenario[] = [
  { id: "confined", title: "Confined space / entering tanks or vaults", detail: "Meets the confined space definition with O₂ deficiency potential.", category: "A", oda: false, odaNote: "No – Confined Space Standard governs",
    controlsTitle: "Category A – Confined space", controls: ["Attendants present", "Atmospheric testing prior to entry (O₂ > 19.5%)", "Formal entry permits"] },
  { id: "enclosed", title: "Enclosed space (entry possible, not a confined space)", detail: "E.g. WIPP storage, large N₂ cabinets.", category: "A", oda: false, odaNote: "No – forced air & prior monitoring governs",
    controlsTitle: "Category A – Enclosed space", controls: ["Inert supplies locked out / tagged out", "Forced air ventilation", "Warning signs", "Prior atmospheric testing"] },
  { id: "normalDeficit", title: "Normal operations potential deficit", detail: "Normal release could drop O₂ below 19.5% (e.g. dewars, line purging).", category: "B", oda: true, odaNote: "Yes",
    controlsTitle: "Category B-1 – Normal release", controls: ["Quantitative ODA", "Mechanical ventilation", "Engineered flow restrictions or continuous O₂ monitors to maintain O₂ > 19.5%"] },
  { id: "accidentalDeficit", title: "Accidental release deficit", detail: "Accidental release could drop O₂ below 16% with low warning properties (noise > 85 dBA or inaudible leak).", category: "B", oda: true, odaNote: "Yes",
    controlsTitle: "Category B-2 – Accidental release", controls: ["Quantitative ODA for the single point of failure", "Secondary containment / controls", "Continuous O₂ monitoring where O₂ can fall ≤ 16%"] },
  { id: "lowNormal", title: "Low potential – normal release", detail: "Continuous purge with high dilution ventilation (ratio > 23:1, or > 15:1 in fabs) and no gas pockets.", category: "C", oda: false, odaNote: "No – provided automatic evacuation on HVAC failure exists",
    controlsTitle: "Category C – Low potential (cleanrooms)", controls: ["Maintain ventilation ratios", "Automatic evacuation tied to HVAC system failure", "Awareness labelling"] },
  { id: "lowAccidental", title: "Low potential – accidental release", detail: "Lines in well-ventilated spaces, outdoor venting, or closed cylinder valves where accidental release keeps O₂ ≥ 16%.", category: "C", oda: false, odaNote: "No",
    controlsTitle: "Category C – Low potential (tubing / cylinders)", controls: ["Gas delivery compliance check", "Tubing failures restricted to max inaudible leak of 0.235 scfm (controlled by general ventilation)", "Exhaust inspection"] },
  { id: "outdoor", title: "Outdoor areas", detail: "Large-volume bulk gas or cryogen use/storage fully open to outside air.", category: "D", oda: false, odaNote: "No",
    controlsTitle: "Category D – Outdoor", controls: ["Access restrictions", "Tank labelling", "Warning signs", "Training on written transfer procedures"] },
];

export function scenario(id: ScenarioId | null) { return SCENARIOS.find((s) => s.id === id) ?? null; }

/** Suggests a screening scenario from the inputs; the assessor makes the final choice. */
export function suggestScenario(a: Assessment): ScenarioId | null {
  const normalO2 = a.normal.enabled ? steadyO2(a, a.normal.flow) : null;
  const cont = containerO2(a);
  if ((normalO2 !== null && normalO2 < 19.5) || (cont !== null && cont < 19.5)) return "normalDeficit";
  const spofO2 = a.spof.enabled ? steadyO2(a, a.spof.flow) : null;
  if (spofO2 !== null && spofO2 < 16 && (!a.spof.quiet || a.spof.threaded)) return "accidentalDeficit";
  const dr = dilutionRatio(a);
  if (dr !== null && dr > 23) return "lowNormal";
  if (spofO2 !== null && spofO2 >= 16) return "lowAccidental";
  return null;
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

export function newAssessment(assessor = ""): Assessment {
  const now = new Date();
  return {
    id: uid(), createdAt: now.toISOString(), assessor,
    date: now.toISOString().slice(0, 10), building: "", room: "", units: "metric",
    length: "", width: "", height: "", volumeDirect: false, volume: "",
    barriers: false, openness: "", hvac: true, ahuFlow: "", outsideAirPct: "", roomFlow: "", kFactor: 3,
    normal: { enabled: false, gas: "Nitrogen", flow: "" },
    container: { enabled: false, cryogen: "Liquid nitrogen", litres: "" },
    spof: { enabled: false, gas: "Nitrogen", flow: "", threaded: false, ventilation: true, quiet: true },
    scenario: null, notes: "", photos: [],
  };
}

/** Fill in missing fields on records saved by older versions. */
export function normalize(x: Partial<Assessment>): Assessment {
  const d = newAssessment();
  return { ...d, ...x, normal: { ...d.normal, ...x.normal }, container: { ...d.container, ...x.container }, spof: { ...d.spof, ...x.spof }, photos: x.photos ?? [] };
}
