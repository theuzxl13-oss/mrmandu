import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Exibe "barbers" como legenda discreta ao lado do logotipo. */
  tagline?: boolean;
}

const SIZES = {
  sm: "text-[22px]",
  md: "text-[28px]",
  lg: "text-[44px]",
  xl: "text-[clamp(3.5rem,12vw,9rem)]",
} as const;

/**
 * Logotipo "mr.mandu" — "mr." leve + "mandu" pesado, em caixa-baixa.
 * Recriado em tipografia a partir do arquivo enviado pelo cliente. Para usar o
 * arquivo original, coloque-o em /public/logo.svg e troque o conteúdo por <img>.
 */
export function Logo({ className, size = "md", tagline }: LogoProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 normal-case text-foreground", className)} aria-label="mr.mandu barbers" role="img">
      <span className={cn("font-logo leading-none tracking-[-0.03em]", SIZES[size])} aria-hidden>
        <span className="font-normal">mr.</span>
        <span className="font-bold">mandu</span>
      </span>
      {tagline && <span className="text-caption uppercase leading-none text-muted-foreground" aria-hidden>barbers</span>}
    </span>
  );
}
