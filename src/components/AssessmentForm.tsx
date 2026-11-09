import { useNavigate } from "@tanstack/react-router";
import { Camera, Trash2, Lightbulb, Check } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "@/components/AppShell";
import { Summary } from "@/components/Summary";
import { cn } from "@/lib/utils";
import {
  CRYOGEN_TYPES, GAS_TYPES, SCENARIOS, UNIT_LABEL, roomVolume, scenario, suggestScenario, uid,
  type Assessment,
} from "@/lib/assessment";
import { compressImage, saveAssessment, setLastAssessor } from "@/lib/store";

const STEPS = ["Space", "Normal ops", "Container", "SPOF", "Review", "Screening", "Controls"];

export function AssessmentForm({ initial }: { initial: Assessment }) {
  const [a, setA] = useState<Assessment>(initial);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const set = <K extends keyof Assessment>(k: K, v: Assessment[K]) => setA((p) => ({ ...p, [k]: v }));
  const u = UNIT_LABEL[a.units];
  const vol = roomVolume(a);
  const suggested = suggestScenario(a);
  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0 }); };

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const added: Assessment["photos"] = [];
    for (const f of Array.from(files)) {
      try { added.push({ id: uid(), dataUrl: await compressImage(f), caption: "" }); }
      catch { toast.error(`Couldn't read ${f.name}`); }
    }
    setA((p) => ({ ...p, photos: [...p.photos, ...added] }));
  }

  function next() {
    if (step === 0) {
      if (!a.assessor.trim()) { toast.error("Add the assessor's name"); return; }
      if (!a.building.trim() && !a.room.trim()) { toast.error("Add the building or room"); return; }
    }
    if (step === 5 && !a.scenario) { toast.error("Choose the condition that applies"); return; }
    go(step + 1);
  }

  async function save() {
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

  const sc = scenario(a.scenario);

  return (
    <>
      <ol className="mb-4 flex gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => i < step && go(i)} className={cn("h-1.5 w-full rounded-full", i <= step ? "bg-primary" : "bg-muted")} aria-label={s} />
          </li>
        ))}
      </ol>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>

      {step === 0 && (
        <>
          <Section title="1 · Space details">
            <div className="grid gap-3">
              <Field label="Assessor"><Input value={a.assessor} onChange={(e) => set("assessor", e.target.value)} placeholder="Your name" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><Input type="date" value={a.date} onChange={(e) => set("date", e.target.value)} /></Field>
                <Field label="Building / floor"><Input value={a.building} onChange={(e) => set("building", e.target.value)} placeholder="e.g. B2, Level 1" /></Field>
              </div>
              <Field label="Room / area"><Input value={a.room} onChange={(e) => set("room", e.target.value)} placeholder="e.g. Cryo lab 104" /></Field>
              <Field label="Units">
                <Segmented value={a.units} onChange={(v) => set("units", v)} options={[["metric", "Metric (m, LPM)"], ["imperial", "Imperial (ft, CFM)"]]} />
              </Field>
            </div>
          </Section>
          <Section title="Dimensions & volume">
            <div className="grid gap-3">
              <Toggle label="Enter total room volume directly" value={a.volumeDirect} onChange={(v) => set("volumeDirect", v)} />
              {a.volumeDirect ? (
                <Field label={`Total room volume (${u.vol})`}><Num value={a.volume} onChange={(v) => set("volume", v)} /></Field>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Field label={`Length (${u.len})`}><Num value={a.length} onChange={(v) => set("length", v)} /></Field>
                  <Field label={`Width (${u.len})`}><Num value={a.width} onChange={(v) => set("width", v)} /></Field>
                  <Field label={`Height (${u.len})`}><Num value={a.height} onChange={(v) => set("height", v)} /></Field>
                </div>
              )}
              <div className="rounded-md bg-accent px-3 py-2 text-sm">Room volume: <strong>{vol !== null ? `${round(vol)} ${u.vol}` : "—"}</strong></div>
            </div>
          </Section>
          <Section title="Physical layout">
            <div className="grid gap-3">
              <Toggle label="Barriers within the room (curtains, shielding)" value={a.barriers} onChange={(v) => set("barriers", v)} />
              <Field label="Room openness (%)"><Num value={a.openness} onChange={(v) => set("openness", v)} /></Field>
            </div>
          </Section>
          <Section title="HVAC & ventilation">
            <div className="grid gap-3">
              <Toggle label="HVAC in operation" value={a.hvac} onChange={(v) => set("hvac", v)} />
              {a.hvac && (
                <>
                  <Field label={`Sector AHU flow rate (${u.air})`}><Num value={a.ahuFlow} onChange={(v) => set("ahuFlow", v)} /></Field>
                  <Field label="Outside air (%)"><Num value={a.outsideAirPct} onChange={(v) => set("outsideAirPct", v)} /></Field>
                  <Field label={`Room HVAC flow rate (${u.air})`}><Num value={a.roomFlow} onChange={(v) => set("roomFlow", v)} /></Field>
                  <Field label="K-factor (mixing efficiency, 1 = best)">
                    <select value={a.kFactor} onChange={(e) => set("kFactor", Number(e.target.value))} className="h-10 rounded-md border bg-card px-3 text-sm">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </Field>
                </>
              )}
            </div>
          </Section>
        </>
      )}

      {step === 1 && (
        <Section title="2 · Normal operations release" hint="Planned, continuous or cyclic releases during standard processes.">
          <div className="grid gap-3">
            <Toggle label="Normal operations release?" value={a.normal.enabled} onChange={(v) => set("normal", { ...a.normal, enabled: v })} />
            {a.normal.enabled && (
              <>
                <Field label="Gas type"><Choice options={GAS_TYPES} value={a.normal.gas} onChange={(v) => set("normal", { ...a.normal, gas: v })} /></Field>
                <Field label={`Max flow rate (${u.gas})`}><Num value={a.normal.flow} onChange={(v) => set("normal", { ...a.normal, flow: v })} /></Field>
              </>
            )}
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title="3 · Finite single source container" hint="Dewars, cryogens, cylinders.">
          <div className="grid gap-3">
            <Toggle label="Finite single source container?" value={a.container.enabled} onChange={(v) => set("container", { ...a.container, enabled: v })} />
            {a.container.enabled && (
              <>
                <Field label="Cryogen type"><Choice options={CRYOGEN_TYPES} value={a.container.cryogen} onChange={(v) => set("container", { ...a.container, cryogen: v })} /></Field>
                <Field label="Volume (litres)"><Num value={a.container.litres} onChange={(v) => set("container", { ...a.container, litres: v })} /></Field>
              </>
            )}
          </div>
        </Section>
      )}

      {step === 3 && (
        <Section title="4 · Probable single point of failure" hint="Accidental release from pressurised lines or hardware failure.">
          <div className="grid gap-3">
            <Toggle label="Probable single point of failure?" value={a.spof.enabled} onChange={(v) => set("spof", { ...a.spof, enabled: v })} />
            {a.spof.enabled && (
              <>
                <Field label="Gas type"><Choice options={GAS_TYPES} value={a.spof.gas} onChange={(v) => set("spof", { ...a.spof, gas: v })} /></Field>
                <Field label={`Flow rate (${u.gas})`}><Num value={a.spof.flow} onChange={(v) => set("spof", { ...a.spof, flow: v })} /></Field>
                <Toggle label="All threaded fittings?" value={a.spof.threaded} onChange={(v) => set("spof", { ...a.spof, threaded: v })} />
                <Toggle label="Ventilation in space?" value={a.spof.ventilation} onChange={(v) => set("spof", { ...a.spof, ventilation: v })} />
                <Toggle label="Sound level < 85 dBA?" value={a.spof.quiet} onChange={(v) => set("spof", { ...a.spof, quiet: v })} />
              </>
            )}
          </div>
        </Section>
      )}

      {step === 4 && (
        <>
          <h2 className="mb-3 font-display text-2xl font-bold uppercase">Data summary review</h2>
          <Summary a={a} />
        </>
      )}

      {step === 5 && (
        <Section title="Qualitative screening" hint="Choose the condition that best describes this space.">
          {suggested && (
            <p className="mb-3 flex items-start gap-2 rounded-md bg-accent p-3 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /><span>Based on your inputs, the indicative estimate points to <strong>{scenario(suggested)!.title}</strong>. Confirm or choose another.</span></p>
          )}
          <div className="grid gap-2">
            {SCENARIOS.map((s) => (
              <button key={s.id} type="button" onClick={() => set("scenario", s.id)}
                className={cn("rounded-md border-2 p-3 text-left transition", a.scenario === s.id ? "border-primary bg-primary/10" : "bg-card hover:bg-muted")}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{s.title}</span>
                  <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">Cat {s.category}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                <p className="mt-1 text-xs font-semibold">ODA required: {s.odaNote}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      {step === 6 && sc && (
        <>
          <Section title={sc.controlsTitle}>
            <p className={cn("mb-3 rounded-md p-3 font-semibold", sc.oda ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground")}>
              Quantitative ODA required: {sc.odaNote}
            </p>
            <ul className="grid gap-2">{sc.controls.map((c) => <li key={c} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{c}</li>)}</ul>
          </Section>
          <Section title="Notes" hint="Optional">
            <Textarea value={a.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Comments, actions required…" />
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
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          {step === 4 ? (
            <>
              <Button size="lg" variant="outline" className="h-12 flex-1" onClick={() => go(0)}>Edit details</Button>
              <Button size="lg" className="h-12 flex-1 font-semibold" onClick={next}>Proceed</Button>
            </>
          ) : (
            <>
              {step > 0 && <Button size="lg" variant="outline" className="h-12" onClick={() => go(step - 1)}>Back</Button>}
              {step < 6
                ? <Button size="lg" className="h-12 flex-1 font-semibold" onClick={next}>{step === 5 ? "Submit evaluation" : "Next"}</Button>
                : <Button size="lg" className="h-12 flex-1 font-semibold" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & register space"}</Button>}
            </>
          )}
        </div>
      </div>
    </>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
function Num({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />;
}
function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={cn("rounded-md border py-2 text-sm font-semibold", value === v ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted")}>{l}</button>
      ))}
    </div>
  );
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px]">{label}</span>
      <div className="grid w-32 shrink-0 grid-cols-2 gap-1.5">
        <button type="button" aria-pressed={value} onClick={() => onChange(true)} className={cn("rounded-md border py-2 text-sm font-semibold", value ? "border-success bg-success text-success-foreground" : "bg-card")}>Yes</button>
        <button type="button" aria-pressed={!value} onClick={() => onChange(false)} className={cn("rounded-md border py-2 text-sm font-semibold", !value ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card")}>No</button>
      </div>
    </div>
  );
}
function Choice({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const custom = !options.includes(value);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {[...options, "Other"].map((g) => {
          const on = g === "Other" ? custom : value === g;
          return <button key={g} type="button" onClick={() => onChange(g === "Other" ? "" : g)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", on ? "border-secondary bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted")}>{g}</button>;
        })}
      </div>
      {custom && <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type gas name" autoFocus />}
    </div>
  );
}
