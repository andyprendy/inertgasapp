import type { Assessment } from "./assessment";
import { CHECKLIST, OUTCOME_LABEL, findIssues, o2Status } from "./assessment";

export async function buildPdf(a: Assessment): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 15, CW = W - 2 * M;
  let y = 0;
  const ensure = (h: number) => {
    if (y + h > 282) { doc.addPage(); y = M; }
  };
  const heading = (t: string) => {
    ensure(14); y += 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(43, 51, 64);
    doc.text(t.toUpperCase(), M, y); y += 2;
    doc.setDrawColor(245, 170, 30); doc.setLineWidth(0.8); doc.line(M, y, M + CW, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
  };
  const para = (t: string) => {
    const lines = doc.splitTextToSize(t || "—", CW);
    for (const l of lines) { ensure(5); doc.text(l, M, y); y += 5; }
  };
  const row = (k: string, v: string) => {
    const lines = doc.splitTextToSize(v || "—", CW - 45);
    ensure(lines.length * 5);
    doc.setFont("helvetica", "bold"); doc.text(k, M, y);
    doc.setFont("helvetica", "normal"); doc.text(lines, M + 45, y);
    y += lines.length * 5 + 1;
  };

  doc.setFillColor(43, 51, 64); doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(245, 170, 30); doc.rect(0, 28, W, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Inert Gas Safety Assessment", M, 15);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(new Date(a.createdAt).toLocaleString("en-GB"), M, 22);
  y = 38; doc.setTextColor(30, 30, 30); doc.setFontSize(10);

  heading("Details");
  row("Assessor", a.assessor); row("Site", a.site); row("Area / location", a.area);
  row("Gas type", a.gasType); row("Activity", a.activity);

  const outcome = a.outcome ? OUTCOME_LABEL[a.outcome] : "Not recorded";
  heading("Outcome");
  ensure(10);
  const col: [number, number, number] = a.outcome === "safe" ? [46, 140, 80] : a.outcome === "stop" ? [200, 50, 40] : [245, 170, 30];
  doc.setFillColor(...col); doc.roundedRect(M, y - 5, CW, 9, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.text(outcome, M + 3, y + 1);
  doc.setTextColor(30, 30, 30); doc.setFont("helvetica", "normal"); y += 9;
  const issues = findIssues(a);
  if (issues.length) {
    doc.setTextColor(200, 50, 40); doc.setFont("helvetica", "bold"); para(`Flagged issues (${issues.length}):`);
    doc.setFont("helvetica", "normal"); issues.forEach((i) => para("• " + i));
    doc.setTextColor(30, 30, 30);
  }

  heading("Atmosphere readings (safe O2: 19.5–23.5%)");
  doc.setFont("helvetica", "bold");
  const cols = [M, M + 20, M + 95, M + 125];
  ["Time", "Location", "O2 %", `${a.gasType} / other`].forEach((h, i) => doc.text(h, cols[i], y));
  y += 6; doc.setFont("helvetica", "normal");
  for (const r of a.readings) {
    ensure(6);
    const s = o2Status(r.o2);
    doc.text(r.time || "—", cols[0], y);
    doc.text(doc.splitTextToSize(r.location || "—", 72)[0], cols[1], y);
    if (s === "low" || s === "high") doc.setTextColor(200, 50, 40);
    doc.text(r.o2 ? `${r.o2}${s === "low" ? " LOW" : s === "high" ? " HIGH" : ""}` : "—", cols[2], y);
    doc.setTextColor(30, 30, 30);
    doc.text(r.gasPpm || "—", cols[3], y);
    y += 6;
  }

  heading("Hazard checklist");
  for (const c of CHECKLIST) {
    const v = a.checklist[c.id];
    ensure(6);
    doc.text(c.label.replace("O₂", "O2"), M, y);
    const label = v === "yes" ? "YES" : v === "no" ? "NO" : v === "na" ? "N/A" : "—";
    if (v === "no") doc.setTextColor(200, 50, 40);
    doc.setFont("helvetica", "bold"); doc.text(label, M + CW, y, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(30, 30, 30);
    y += 6;
  }

  heading("Controls & notes");
  para(a.controls);

  if (a.photos.length) {
    heading("Photos");
    for (const p of a.photos) {
      const props = doc.getImageProperties(p.dataUrl);
      const w = 90, h = (props.height / props.width) * w;
      ensure(h + 8);
      doc.addImage(p.dataUrl, "JPEG", M, y, w, h);
      y += h + 2;
      if (p.caption) para(p.caption);
      y += 3;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    doc.text(`Ref ${a.id.slice(0, 8).toUpperCase()}  ·  Page ${i} of ${pages}`, M, 292);
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url; el.download = filename;
  document.body.appendChild(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (e) { if ((e as DOMException).name === "AbortError") return; }
  }
  downloadBlob(blob, filename);
}

export function pdfName(a: Assessment) {
  const d = a.createdAt.slice(0, 10);
  const site = (a.site || "assessment").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `inert-gas-${site}-${d}.pdf`;
}
