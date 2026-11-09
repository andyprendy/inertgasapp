import { Section } from "@/components/AppShell";
import { UNIT_LABEL, containerO2, dilutionRatio, formatDate, roomVolume, steadyO2, type Assessment } from "@/lib/assessment";

export function summaryRows(a: Assessment): [string, [string, string][]][] {
  const u = UNIT_LABEL[a.units];
  const v = roomVolume(a);
  const f = (x: number | null, unit = "") => (x === null ? "—" : `${Math.round(x * 100) / 100}${unit}`);
  const yn = (b: boolean) => (b ? "Yes" : "No");
  const val = (s: string, unit: string) => (s ? `${s} ${unit}` : "—");
  return [
    ["Date & location", [["Date", formatDate(a.date)], ["Assessor", a.assessor || "—"], ["Building / floor", a.building || "—"], ["Room / area", a.room || "—"]]],
    ["Volume & layout", [
      ["Units", a.units === "metric" ? "Metric" : "Imperial"],
      ["Dimensions", a.volumeDirect ? "Entered directly" : `${a.length || "?"} × ${a.width || "?"} × ${a.height || "?"} ${u.len}`],
      ["Room volume", f(v, ` ${u.vol}`)], ["Barriers", yn(a.barriers)], ["Openness", a.openness ? `${a.openness}%` : "—"],
    ]],
    ["HVAC", a.hvac ? [
      ["HVAC", "Yes"], ["Sector AHU flow", val(a.ahuFlow, u.air)], ["Outside air", a.outsideAirPct ? `${a.outsideAirPct}%` : "—"],
      ["Room HVAC flow", val(a.roomFlow, u.air)], ["K-factor", String(a.kFactor)],
    ] : [["HVAC", "No"]]],
    ["Releases", [
      ["Normal operations", a.normal.enabled ? `Yes · ${a.normal.gas || "—"} · ${val(a.normal.flow, u.gas)}` : "No"],
      ["Finite container", a.container.enabled ? `Yes · ${a.container.cryogen || "—"} · ${val(a.container.litres, "L")}` : "No"],
      ["Single point of failure", a.spof.enabled ? `Yes · ${a.spof.gas || "—"} · ${val(a.spof.flow, u.gas)}` : "No"],
      ...(a.spof.enabled ? ([["Threaded fittings", yn(a.spof.threaded)], ["Ventilation in space", yn(a.spof.ventilation)], ["Sound < 85 dBA", yn(a.spof.quiet)]] as [string, string][]) : []),
    ]],
    ["Indicative estimates", [
      ["O₂ after container release", f(containerO2(a), "%")],
      ["Steady O₂ – normal release", a.normal.enabled ? f(steadyO2(a, a.normal.flow), "%") : "—"],
      ["Steady O₂ – SPOF release", a.spof.enabled ? f(steadyO2(a, a.spof.flow), "%") : "—"],
      ["Dilution ratio (normal)", (() => { const d = dilutionRatio(a); return d === null ? "—" : `${Math.round(d)}:1`; })()],
    ]],
  ];
}

export function Summary({ a }: { a: Assessment }) {
  return (
    <>
      {summaryRows(a).map(([title, rows]) => (
        <Section key={title} title={title}>
          <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5 text-[15px]">
            {rows.map(([k, v]) => <><dt key={k + "k"} className="text-muted-foreground">{k}</dt><dd key={k + "v"} className="font-medium">{v}</dd></>)}
          </dl>
        </Section>
      ))}
      <p className="mb-5 text-xs text-muted-foreground">Estimates assume perfect mixing adjusted by the K-factor; they support, not replace, a quantitative ODA.</p>
    </>
  );
}
