import { describe, it, expect } from "vitest";
import { o2Status, findIssues, newAssessment } from "./assessment";

describe("O2 thresholds", () => {
  it("flags below 19.5% as low", () => expect(o2Status("19.4")).toBe("low"));
  it("accepts 19.5% and 23.5%", () => {
    expect(o2Status("19.5")).toBe("ok");
    expect(o2Status("23.5")).toBe("ok");
  });
  it("flags above 23.5% as high", () => expect(o2Status("23.6")).toBe("high"));
  it("lists failed checks and bad readings as issues", () => {
    const a = newAssessment();
    a.readings[0].o2 = "18";
    a.checklist.ventilation = "no";
    expect(findIssues(a)).toHaveLength(2);
  });
});
