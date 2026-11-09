import { cn } from "@/lib/utils";
import type { Category } from "@/lib/assessment";

export function CategoryBadge({ category, className }: { category: Category | null; className?: string }) {
  const styles = category === "A" || category === "B" ? "bg-destructive text-destructive-foreground" : category === "C" ? "bg-primary text-primary-foreground" : category === "D" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground";
  return <span className={cn("shrink-0 rounded px-2 py-1 text-xs font-bold uppercase", styles, className)}>{category ? `Cat ${category}` : "Draft"}</span>;
}
