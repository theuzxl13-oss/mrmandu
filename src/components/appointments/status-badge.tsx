import type { AppointmentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const STYLES: Record<AppointmentStatus, string> = {
  PENDING: "border-warning/40 text-warning",
  CONFIRMED: "border-foreground/40 text-foreground",
  COMPLETED: "border-success/40 text-success",
  CANCELLED: "border-border text-muted-foreground line-through decoration-1",
};

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <Badge className={cn(STYLES[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
