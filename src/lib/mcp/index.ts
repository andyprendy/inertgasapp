import { defineMcp } from "@lovable.dev/mcp-js";
import listRiskCategories from "./tools/list-risk-categories";
import estimateOxygen from "./tools/estimate-oxygen";

export default defineMcp({
  name: "inert-gas-app",
  title: "Inert Gas App",
  version: "0.1.0",
  instructions: "Inert gas oxygen-deficiency screening reference and calculators. Saved assessments stay on users' devices and are not available here.",
  tools: [listRiskCategories, estimateOxygen],
});
