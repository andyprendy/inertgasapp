import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AssessmentForm } from "@/components/AssessmentForm";
import type { Assessment } from "@/lib/assessment";
import { getAssessment } from "@/lib/store";

export const Route = createFileRoute("/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit assessment — Inert Gas Safety" },
      { name: "description", content: "Edit an inert gas safety assessment." },
      { property: "og:title", content: "Edit inert gas assessment" },
      { property: "og:description", content: "Edit an inert gas safety assessment." },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  const [a, setA] = useState<Assessment | null | undefined>(undefined);
  useEffect(() => { getAssessment(id).then(setA); }, [id]);
  return (
    <AppShell title="Edit assessment" back>
      {a === null && <p className="text-muted-foreground">Assessment not found on this device.</p>}
      {a && <AssessmentForm initial={a} />}
    </AppShell>
  );
}
