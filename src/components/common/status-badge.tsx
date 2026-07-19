import { Badge } from "@/components/ui/badge";
const styles = { active: "success", complete: "success", pending: "warning", warning: "warning", failed: "destructive", inactive: "secondary", draft: "outline" } as const;
export function StatusBadge({ status }: { status: string }) { const normalized = status.toLowerCase() as keyof typeof styles; return <Badge variant={styles[normalized] ?? "secondary"}><span className="mr-1.5 size-1.5 rounded-full bg-current" aria-hidden="true" />{status.replaceAll("_", " ")}</Badge>; }
