import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AssessmentForm } from "@/components/AssessmentForm";
import { newAssessment, type Assessment } from "@/lib/assessment";
import { getLastAssessor } from "@/lib/store";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New assessment — Inert Gas Safety" },
      { name: "description", content: "Log a new inert gas safety assessment." },
      { property: "og:title", content: "New inert gas assessment" },
      { property: "og:description", content: "Log a new inert gas safety assessment." },
    ],
  }),
  component: NewPage,
});

function NewPage() {
  const [a, setA] = useState<Assessment | null>(null);
  useEffect(() => setA(newAssessment(getLastAssessor())), []);
  return <AppShell title="New assessment" back>{a && <AssessmentForm initial={a} />}</AppShell>;
}
