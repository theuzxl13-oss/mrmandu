import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatDateLong } from "@/lib/format";
import { addDaysToKey, type DateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Navegação de dias via querystring (?data=YYYY-MM-DD) — funciona sem JavaScript. */
export function DateNav({ date, today, basePath, extraParams = {} }: { date: DateKey; today: DateKey; basePath: string; extraParams?: Record<string, string | undefined> }) {
  const href = (d: DateKey) => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(extraParams).filter(([, v]) => v)) as Record<string, string>, data: d });
    return `${basePath}?${params.toString()}`;
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(addDaysToKey(date, -1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Dia anterior">
        <ChevronLeft />
      </Link>
      <Link href={href(addDaysToKey(date, 1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Próximo dia">
        <ChevronRight />
      </Link>
      {date !== today && (
        <Link href={href(today)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Hoje
        </Link>
      )}
      <form action={basePath} className="contents">
        {Object.entries(extraParams).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        <input
          type="date"
          name="data"
          defaultValue={date}
          aria-label="Escolher data"
          className="h-10 rounded-md border bg-transparent px-3 text-sm [color-scheme:dark]"
        />
        <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-10")}>Ir</button>
      </form>
      <p className="w-full text-sm text-muted-foreground sm:ml-2 sm:w-auto">{formatDateLong(date)}</p>
    </div>
  );
}
