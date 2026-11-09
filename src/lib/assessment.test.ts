import { describe, it, expect } from "vitest";
import { newAssessment, roomVolume, volumeM3, containerO2, steadyO2, dilutionRatio, scenario, formatDate } from "./assessment";

const room = () => { const a = newAssessment(); a.length = "10"; a.width = "5"; a.height = "3"; return a; };

describe("space calculations", () => {
  it("calculates volume from dimensions", () => expect(roomVolume(room())).toBe(150));
  it("uses direct volume when bypassing dimensions", () => { const a = room(); a.volumeDirect = true; a.volume = "80"; expect(roomVolume(a)).toBe(80); });
  it("converts imperial volume to m³", () => { const a = room(); a.units = "imperial"; a.volumeDirect = true; a.volume = "1000"; expect(volumeM3(a)).toBeCloseTo(28.3168, 3); });
  it("formats date as DD/MM/YYYY", () => expect(formatDate("2026-11-09")).toBe("09/11/2026"));
});

describe("oxygen estimates", () => {
  it("50 L LN2 into 150 m³ gives ~16.4% O2", () => {
    const a = room(); a.container = { enabled: true, cryogen: "Liquid nitrogen", litres: "50" };
    expect(containerO2(a)!).toBeCloseTo(16.98, 1);
  });
  it("continuous release uses room flow ÷ K-factor", () => {
    const a = room(); a.roomFlow = "600"; a.kFactor = 1; // 10 m³/min
    expect(steadyO2(a, "1000")!).toBeCloseTo(20.9 * 10 / 11, 3);
  });
  it("dilution ratio is effective ventilation over gas flow", () => {
    const a = room(); a.roomFlow = "600"; a.kFactor = 2; a.normal = { enabled: true, gas: "Nitrogen", flow: "100" };
    expect(dilutionRatio(a)).toBeCloseTo(50, 5);
  });
});

describe("risk categories", () => {
  it("maps scenarios to category and ODA", () => {
    expect(scenario("confined")).toMatchObject({ category: "A", oda: false });
    expect(scenario("normalDeficit")).toMatchObject({ category: "B", oda: true });
    expect(scenario("accidentalDeficit")).toMatchObject({ category: "B", oda: true });
    expect(scenario("lowAccidental")).toMatchObject({ category: "C", oda: false });
    expect(scenario("outdoor")).toMatchObject({ category: "D", oda: false });
  });
});
