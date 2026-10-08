import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { formatInstant, formatPhone } from "@/lib/format";
import { requirePageRole } from "@/server/auth/session";
import { setClientActiveAction } from "@/server/actions/admin.actions";
import { listClients } from "@/server/services/client.service";

export const metadata = { title: "Clientes" };

export default async function AdminClientesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requirePageRole("ADMIN");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await listClients(user, { q, page });

  return (
    <div>
      <PageHeader title="Clientes" description={`${data.total} cliente${data.total === 1 ? "" : "s"} cadastrado${data.total === 1 ? "" : "s"}`} />
      <form action="/admin/clientes" className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou telefone" className="pl-9" aria-label="Buscar cliente" />
      </form>

      {data.items.length === 0 ? (
        <EmptyState icon={<Users />} title="Nenhum cliente encontrado" />
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-[11px] [&>th]:font-medium [&>th]:uppercase [&>th]:tracking-[0.15em] [&>th]:text-muted-foreground">
                  <th>Nome</th><th>Telefone</th><th>E-mail</th><th className="text-center">Agend.</th><th>Último atendimento</th><th>Status</th><th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-accent/40 [&>td]:px-4 [&>td]:py-3">
                    <td><Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">{c.name}</Link></td>
                    <td className="whitespace-nowrap text-muted-foreground">{formatPhone(c.phone)}</td>
                    <td className="text-muted-foreground">{c.email}</td>
                    <td className="text-center tabular-nums">{c.appointmentsCount}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{c.lastVisit ? formatInstant(new Date(c.lastVisit), "dd/MM/yyyy") : "—"}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <ActiveToggle id={c.id} active={c.active} label="cliente" action={setClientActiveAction} deactivateWarning="O cliente não conseguirá entrar nem agendar até ser reativado." />
                        <Badge className={c.active ? "text-foreground" : "text-muted-foreground"}>{c.active ? "Ativo" : "Inativo"}</Badge>
                      </div>
                    </td>
                    <td><Link href={`/admin/clientes/${c.id}`} aria-label={`Ver ${c.name}`}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Cards (mobile) */}
          <ul className="space-y-2 md:hidden">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/clientes/${c.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{formatPhone(c.phone)} · {c.appointmentsCount} agend.</p>
                    {!c.active && <Badge className="mt-2 text-muted-foreground">Inativo</Badge>}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath="/admin/clientes" params={{ q }} />
    </div>
  );
}
