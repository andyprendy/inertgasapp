import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ title, back, action, children }: { title: string; back?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-secondary text-secondary-foreground">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          {back && (
            <Link to="/" aria-label="Back" className="-ml-2 rounded-md p-2 hover:bg-secondary-foreground/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <h1 className="flex-1 truncate font-display text-xl font-bold uppercase">{title}</h1>
          {action}
        </div>
        <div className="hazard-stripe h-1.5" />
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-5">{children}</main>
    </div>
  );
}

export function Section({ title, children, hint }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h2>
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}
