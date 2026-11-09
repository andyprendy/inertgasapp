import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, FileDown, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Section } from "@/components/AppShell";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CHECKLIST, OUTCOME_LABEL, findIssues, o2Status, type Assessment } from "@/lib/assessment";
import { deleteAssessment, getAssessment } from "@/lib/store";
import { buildPdf, deliverFile, pdfName } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/a/$id")({
  head: () => ({
    meta: [
      { title: "Assessment — Inert Gas Safety" },
      { name: "description", content: "View and export an inert gas safety assessment." },
      { property: "og:title", content: "Inert gas assessment" },
      { property: "og:description", content: "View and export an inert gas safety assessment." },
    ],
  }),
  component: ViewPage,
});

function ViewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [a, setA] = useState<Assessment | null | undefined>(undefined);
  const [pdf, setPdf] = useState<Blob | null>(null);
  useEffect(() => {
    getAssessment(id).then((x) => {
      setA(x);
      if (x) buildPdf(x).then(setPdf).catch(() => toast.error("Couldn't prepare PDF"));
    });
  }, [id]);

  if (a === undefined) return <AppShell title="Assessment" back>{null}</AppShell>;
  if (a === null) return <AppShell title="Assessment" back><p className="text-muted-foreground">Assessment not found on this device.</p></AppShell>;
  const issues = findIssues(a);

  return (
    <AppShell title={a.site || "Assessment"} back
      action={<Link to="/edit/$id" params={{ id: a.id }} aria-label="Edit" className="rounded-md p-2 hover:bg-secondary-foreground/10"><Pencil className="h-5 w-5" /></Link>}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</p>
          <p className="font-semibold">{a.assessor}</p>
        </div>
        <OutcomeBadge outcome={a.outcome} className="px-3 py-1.5 text-sm" />
      </div>

      {issues.length > 0 && (
        <div className="mb-5 rounded-lg border border-destructive bg-destructive/5 p-4 text-sm">
          <p className="mb-1 flex items-center gap-1 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />{issues.length} issue{issues.length > 1 ? "s" : ""} flagged</p>
          <ul className="list-disc pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      )}

      <Section title="Details">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-[15px]">
          <dt className="text-muted-foreground">Area</dt><dd>{a.area || "—"}</dd>
          <dt className="text-muted-foreground">Gas type</dt><dd>{a.gasType}</dd>
          <dt className="text-muted-foreground">Activity</dt><dd className="whitespace-pre-wrap">{a.activity || "—"}</dd>
          <dt className="text-muted-foreground">Outcome</dt><dd className="font-semibold">{a.outcome ? OUTCOME_LABEL[a.outcome] : "—"}</dd>
        </dl>
      </Section>

      <Section title="Readings">
        <div className="grid gap-2">
          {a.readings.map((r) => {
            const bad = ["low", "high"].includes(o2Status(r.o2));
            return (
              <div key={r.id} className={cn("flex items-center justify-between rounded-md border p-3", bad && "border-destructive bg-destructive/5")}>
                <div><p className="font-medium">{r.location || "—"}</p><p className="text-xs text-muted-foreground">{r.time}{r.gasPpm && ` · ${r.gasPpm}`}</p></div>
                <p className={cn("font-display text-2xl font-bold", bad && "text-destructive")}>{r.o2 ? `${r.o2}%` : "—"}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Checklist">
        <ul className="divide-y text-[15px]">
          {CHECKLIST.map((c) => {
            const v = a.checklist[c.id];
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span>{c.label}</span>
                <span className={cn("shrink-0 text-sm font-bold uppercase", v === "yes" && "text-success", v === "no" && "text-destructive", !v && "text-muted-foreground")}>{v === "na" ? "N/A" : v ?? "—"}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Controls & notes"><p className="whitespace-pre-wrap">{a.controls || "—"}</p></Section>

      {a.photos.length > 0 && (
        <Section title="Photos">
          <div className="grid grid-cols-2 gap-3">
            {a.photos.map((p) => (
              <figure key={p.id}><img src={p.dataUrl} alt={p.caption || "Assessment photo"} loading="lazy" className="aspect-square w-full rounded-md object-cover" />{p.caption && <figcaption className="mt-1 text-sm text-muted-foreground">{p.caption}</figcaption>}</figure>
            ))}
          </div>
        </Section>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="w-full text-destructive hover:text-destructive"><Trash2 />Delete assessment</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this assessment?</AlertDialogTitle><AlertDialogDescription>This removes it from this device permanently.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await deleteAssessment(a.id); toast.success("Deleted"); navigate({ to: "/" }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button size="lg" className="h-12 w-full text-base font-semibold" disabled={!pdf} onClick={() => pdf && deliverFile(pdf, pdfName(a))}>
            <FileDown />{pdf ? "Export PDF" : "Preparing PDF…"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
