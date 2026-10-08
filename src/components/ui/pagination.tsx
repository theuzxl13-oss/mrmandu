import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount, basePath, params }: { page: number; pageCount: number; basePath: string; params: Record<string, string | undefined> }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...params, page: String(p) }).filter((e): e is [string, string] => !!e[1]));
    return `${basePath}?${q.toString()}`;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
      <span className="text-muted-foreground">Página {page} de {pageCount}</span>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-40")}>
          <ChevronLeft /> Anterior
        </Link>
        <Link aria-disabled={page >= pageCount} href={href(Math.min(pageCount, page + 1))} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pageCount && "pointer-events-none opacity-40")}>
          Próxima <ChevronRight />
        </Link>
      </div>
    </nav>
  );
}
