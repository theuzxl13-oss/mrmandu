import { Skeleton } from "@/components/ui/misc";

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Carregando">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
