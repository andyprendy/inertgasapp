import { cn } from "@/lib/utils";
import { OUTCOME_LABEL, type Outcome } from "@/lib/assessment";

export function OutcomeBadge({ outcome, className }: { outcome: Outcome | null; className?: string }) {
  const styles = outcome === "safe" ? "bg-success text-success-foreground" : outcome === "stop" ? "bg-destructive text-destructive-foreground" : outcome === "controls" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground";
  const short = outcome === "safe" ? "Safe" : outcome === "stop" ? "Stop" : outcome === "controls" ? "Controls" : "Draft";
  return <span title={outcome ? OUTCOME_LABEL[outcome] : undefined} className={cn("shrink-0 rounded px-2 py-1 text-xs font-bold uppercase", styles, className)}>{short}</span>;
}
