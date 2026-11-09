import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CRYOGEN_TYPES, containerO2, newAssessment, scenario, steadyO2, suggestScenario, volumeM3 } from "@/lib/assessment";

export default defineTool({
  name: "estimate_oxygen",
  title: "Estimate oxygen levels",
  description: "Estimate room volume, oxygen % after a cryogen container release or a continuous gas release, and a suggested screening scenario. Indicative only; the assessor makes the final call.",
  inputSchema: {
    units: z.enum(["metric", "imperial"]).describe("metric: m, m³/hr, LPM. imperial: ft, cfm, CFM."),
    length: z.number().positive().describe("Room length."),
    width: z.number().positive().describe("Room width."),
    height: z.number().positive().describe("Room height."),
    roomFlow: z.number().nonnegative().optional().describe("Room HVAC supply flow (m³/hr or cfm). Omit if no HVAC."),
    kFactor: z.number().min(1).max(8).optional().describe("Mixing K-factor 1–8 (default 3)."),
    normalFlow: z.number().nonnegative().optional().describe("Normal-operation gas release flow (LPM or CFM)."),
    cryogen: z.enum(CRYOGEN_TYPES as [string, ...string[]]).optional().describe("Cryogen in the container."),
    containerLitres: z.number().positive().optional().describe("Liquid volume of the container in litres."),
    spofFlow: z.number().nonnegative().optional().describe("Single-point-of-failure release flow (LPM or CFM)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: (i) => {
    const a = newAssessment();
    a.units = i.units; a.length = String(i.length); a.width = String(i.width); a.height = String(i.height);
    a.hvac = i.roomFlow !== undefined; a.roomFlow = i.roomFlow !== undefined ? String(i.roomFlow) : "";
    a.kFactor = i.kFactor ?? 3;
    if (i.normalFlow !== undefined) a.normal = { ...a.normal, enabled: true, flow: String(i.normalFlow) };
    if (i.containerLitres !== undefined) a.container = { enabled: true, cryogen: i.cryogen ?? "Liquid nitrogen", litres: String(i.containerLitres) };
    if (i.spofFlow !== undefined) a.spof = { ...a.spof, enabled: true, flow: String(i.spofFlow) };
    const r = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
    const result = {
      volumeM3: r(volumeM3(a)),
      containerReleaseO2: r(containerO2(a)),
      normalSteadyO2: a.normal.enabled ? r(steadyO2(a, a.normal.flow)) : null,
      spofSteadyO2: a.spof.enabled ? r(steadyO2(a, a.spof.flow)) : null,
      suggestedScenario: suggestScenario(a),
      suggestedCategory: scenario(suggestScenario(a))?.category ?? null,
    };
    const text = Object.entries(result).map(([k, v]) => `${k}: ${v ?? "n/a"}`).join("\n") + "\nSafe O₂ range: 19.5–23.5%.";
    return { content: [{ type: "text", text }], structuredContent: result };
  },
});
