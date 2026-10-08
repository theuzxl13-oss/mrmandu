import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AuthHeading({ title, description, back }: { title: string; description?: string; back?: string }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back} className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
      )}
      <h1 className="heading-display text-3xl sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: React.ReactNode }) {
  const styles = {
    info: "border-border bg-secondary text-foreground",
    error: "border-destructive/40 bg-destructive/10 text-destructive-foreground",
    success: "border-success/40 bg-success/10 text-foreground",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-6 rounded-md border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}
