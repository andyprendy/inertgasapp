import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, AlertTriangle, ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { OutcomeBadge } from "@/components/OutcomeBadge";
import { findIssues, type Assessment } from "@/lib/assessment";
import { listAssessments } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assessments — Inert Gas Safety" },
      { name: "description", content: "Your logged inert gas safety assessments, stored on this device." },
      { property: "og:title", content: "Inert Gas Safety Assessments" },
      { property: "og:description", content: "Log inert gas safety assessments in the field, even offline." },
    ],
  }),
  component: Index,
});

function Index() {
  const [items, setItems] = useState<Assessment[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { listAssessments().then(setItems).catch(() => setItems([])); }, []);
  const filtered = (items ?? []).filter((a) =>
    [a.site, a.area, a.assessor, a.gasType].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Gas Safety Assessments">
      {items && items.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search site, area, assessor…" className="h-11 bg-card pl-9" />
        </div>
      )}
      {items === null ? null : items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-accent p-5"><ClipboardCheck className="h-10 w-10" /></div>
          <h2 className="font-display text-2xl font-bold uppercase">No assessments yet</h2>
          <p className="mt-1 max-w-xs text-muted-foreground">Tap the button below to log your first inert gas assessment. Works without signal.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((a) => {
            const n = findIssues(a).length;
            return (
              <li key={a.id}>
                <Link to="/a/$id" params={{ id: a.id }} className="block rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-bold uppercase">{a.site || "Untitled site"}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.area || "—"} · {a.gasType}</p>
                    </div>
                    <OutcomeBadge outcome={a.outcome} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(a.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {a.assessor}</span>
                    {n > 0 && <span className="flex items-center gap-1 font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{n}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/new" className="fixed bottom-5 left-1/2 z-20 flex h-14 -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 font-display text-lg font-bold uppercase text-primary-foreground shadow-lg ring-4 ring-background">
        <Plus className="h-5 w-5" />New assessment
      </Link>
    </AppShell>
  );
}
