import { defineTool } from "@lovable.dev/mcp-js";
import { SCENARIOS } from "@/lib/assessment";

export default defineTool({
  name: "list_risk_categories",
  title: "List risk categories",
  description: "List the inert gas screening scenarios with their risk category (A–D), whether an ODA is required, and required controls.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const scenarios = SCENARIOS.map((s) => ({ id: s.id, title: s.title, detail: s.detail, category: s.category, odaRequired: s.oda, odaNote: s.odaNote, controlsTitle: s.controlsTitle, controls: [...s.controls] }));
    const text = scenarios.map((s) => `${s.id} — Category ${s.category}: ${s.title}\nODA: ${s.odaNote}\nControls: ${s.controls.join("; ")}`).join("\n\n");
    return { content: [{ type: "text", text }], structuredContent: { scenarios } };
  },
});
