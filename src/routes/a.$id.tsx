import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, FileDown, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Section } from "@/components/AppShell";
import { CategoryBadge } from "@/components/OutcomeBadge";
import { Summary } from "@/components/Summary";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, scenario, type Assessment } from "@/lib/assessment";
import { deleteAssessment, getAssessment } from "@/lib/store";
import { buildPdf, deliverFile, pdfName } from "@/lib/pdf";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/a/$id")({
  head: () => ({
    meta: [
      { title: "Space assessment — Inert Gas Safety" },
      { name: "description", content: "View and save an inert gas hazard evaluation as PDF." },
      { property: "og:title", content: "Inert gas space assessment" },
      { property: "og:description", content: "View and save an inert gas hazard evaluation as PDF." },
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
  const sc = scenario(a.scenario);

  return (
    <AppShell title={a.room || a.building || "Assessment"} back
      action={<Link to="/edit/$id" params={{ id: a.id }} aria-label="Edit" className="rounded-md p-2 hover:bg-secondary-foreground/10"><Pencil className="h-5 w-5" /></Link>}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">{formatDate(a.date)}</p><p className="font-semibold">{a.assessor}</p></div>
        <CategoryBadge category={sc?.category ?? null} className="px-3 py-1.5 text-sm" />
      </div>

      {sc && (
        <Section title={sc.controlsTitle} hint={sc.title}>
          <p className={cn("mb-3 rounded-md p-3 font-semibold", sc.oda ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground")}>Quantitative ODA required: {sc.odaNote}</p>
          <ul className="grid gap-2">{sc.controls.map((c) => <li key={c} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{c}</li>)}</ul>
        </Section>
      )}

      <Summary a={a} />

      {a.notes && <Section title="Notes"><p className="whitespace-pre-wrap">{a.notes}</p></Section>}
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
            <FileDown />{pdf ? "Save as PDF" : "Preparing PDF…"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
