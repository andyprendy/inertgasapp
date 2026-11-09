import { useNavigate } from "@tanstack/react-router";
import { Camera, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import {
  CHECKLIST, GAS_TYPES, OUTCOME_LABEL, findIssues, newReading, o2Status, uid,
  type Answer, type Assessment, type Outcome, type Reading,
} from "@/lib/assessment";
import { compressImage, saveAssessment, setLastAssessor } from "@/lib/store";

export function AssessmentForm({ initial }: { initial: Assessment }) {
  const [a, setA] = useState<Assessment>(initial);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const set = <K extends keyof Assessment>(k: K, v: Assessment[K]) => setA((p) => ({ ...p, [k]: v }));
  const setReading = (id: string, patch: Partial<Reading>) =>
    set("readings", a.readings.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const issues = findIssues(a);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const added = [];
    for (const f of Array.from(files)) {
      try { added.push({ id: uid(), dataUrl: await compressImage(f), caption: "" }); }
      catch { toast.error(`Couldn't read ${f.name}`); }
    }
    setA((p) => ({ ...p, photos: [...p.photos, ...added] }));
  }

  async function save() {
    if (!a.site.trim()) return toast.error("Add the site name");
    if (!a.assessor.trim()) return toast.error("Add the assessor's name");
    if (!a.outcome) return toast.error("Choose an outcome");
    setSaving(true);
    try {
      await saveAssessment(a);
      setLastAssessor(a.assessor);
      toast.success("Assessment saved on this device");
      navigate({ to: "/a/$id", params: { id: a.id } });
    } catch {
      toast.error("Couldn't save — device storage may be full");
      setSaving(false);
    }
  }

  return (
    <>
      <Section title="Details">
        <div className="grid gap-3">
          <Field label="Assessor"><Input value={a.assessor} onChange={(e) => set("assessor", e.target.value)} placeholder="Your name" /></Field>
          <Field label="Site"><Input value={a.site} onChange={(e) => set("site", e.target.value)} placeholder="e.g. Dublin Plant 2" /></Field>
          <Field label="Area / location"><Input value={a.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Cryogenics lab, room 4" /></Field>
          <Field label="Gas type">
            <div className="flex flex-wrap gap-2">
              {GAS_TYPES.map((g) => (
                <button key={g} type="button" onClick={() => set("gasType", g)}
                  className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", a.gasType === g ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted")}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Activity / task"><Textarea value={a.activity} onChange={(e) => set("activity", e.target.value)} placeholder="What work is being assessed?" rows={2} /></Field>
        </div>
      </Section>

      <Section title="Atmosphere readings" hint="Safe O₂ range is 19.5% – 23.5%">
        <div className="grid gap-3">
          {a.readings.map((r, i) => {
            const s = o2Status(r.o2);
            return (
              <div key={r.id} className={cn("rounded-md border p-3", (s === "low" || s === "high") && "border-destructive bg-destructive/5")}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">Reading {i + 1}</span>
                  {a.readings.length > 1 && (
                    <button type="button" aria-label="Remove reading" onClick={() => set("readings", a.readings.filter((x) => x.id !== r.id))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Time"><Input type="time" value={r.time} onChange={(e) => setReading(r.id, { time: e.target.value })} /></Field>
                  <Field label="O₂ %"><Input inputMode="decimal" value={r.o2} onChange={(e) => setReading(r.id, { o2: e.target.value })} placeholder="20.9" className={cn((s === "low" || s === "high") && "border-destructive font-bold text-destructive")} /></Field>
                  <Field label="Location"><Input value={r.location} onChange={(e) => setReading(r.id, { location: e.target.value })} placeholder="e.g. Floor level" /></Field>
                  <Field label="Other reading"><Input value={r.gasPpm} onChange={(e) => setReading(r.id, { gasPpm: e.target.value })} placeholder="e.g. 400 ppm" /></Field>
                </div>
                {s === "low" && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />Oxygen deficient</p>}
                {s === "high" && <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />Oxygen enriched</p>}
              </div>
            );
          })}
          <Button type="button" variant="outline" onClick={() => set("readings", [...a.readings, newReading()])}><Plus />Add reading</Button>
        </div>
      </Section>

      <Section title="Hazard checklist">
        <ul className="divide-y">
          {CHECKLIST.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[15px]">{c.label}</span>
              <AnswerToggle value={a.checklist[c.id] ?? null} onChange={(v) => set("checklist", { ...a.checklist, [c.id]: v })} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Controls & notes">
        <Textarea value={a.controls} onChange={(e) => set("controls", e.target.value)} rows={4} placeholder="Control measures, actions required, comments…" />
      </Section>

      <Section title="Photos" hint="Optional">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
        <div className="grid grid-cols-2 gap-3">
          {a.photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-md border">
              <div className="relative">
                <img src={p.dataUrl} alt={p.caption || "Assessment photo"} className="aspect-square w-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => set("photos", a.photos.filter((x) => x.id !== p.id))} className="absolute right-1 top-1 rounded-full bg-secondary p-1.5 text-secondary-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
              <input value={p.caption} onChange={(e) => set("photos", a.photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))} placeholder="Caption" className="w-full border-t bg-card px-2 py-1.5 text-sm outline-none" />
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed text-muted-foreground hover:bg-muted">
            <Camera className="h-7 w-7" /><span className="text-sm font-medium">Add photo</span>
          </button>
        </div>
      </Section>

      <Section title="Outcome">
        {issues.length > 0 && (
          <div className="mb-3 rounded-md border border-destructive bg-destructive/5 p-3 text-sm">
            <p className="mb-1 flex items-center gap-1 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />{issues.length} issue{issues.length > 1 ? "s" : ""} flagged</p>
            <ul className="list-disc pl-5 text-foreground">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        )}
        <div className="grid gap-2">
          {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
            <button key={o} type="button" onClick={() => set("outcome", o)}
              className={cn("rounded-md border-2 px-4 py-3 text-left font-semibold transition",
                a.outcome === o
                  ? o === "safe" ? "border-success bg-success text-success-foreground" : o === "stop" ? "border-destructive bg-destructive text-destructive-foreground" : "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted")}>
              {OUTCOME_LABEL[o]}
            </button>
          ))}
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button size="lg" className="h-12 w-full text-base font-semibold" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save assessment"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function AnswerToggle({ value, onChange }: { value: Answer; onChange: (v: Answer) => void }) {
  const opts: { v: Exclude<Answer, null>; label: string; on: string }[] = [
    { v: "yes", label: "Yes", on: "bg-success text-success-foreground border-success" },
    { v: "no", label: "No", on: "bg-destructive text-destructive-foreground border-destructive" },
    { v: "na", label: "N/A", on: "bg-secondary text-secondary-foreground border-secondary" },
  ];
  return (
    <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:w-52">
      {opts.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(value === o.v ? null : o.v)}
          className={cn("rounded-md border py-2 text-sm font-semibold transition", value === o.v ? o.on : "bg-card hover:bg-muted")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
