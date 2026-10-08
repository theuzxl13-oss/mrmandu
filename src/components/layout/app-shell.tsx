"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Clock,
  Home,
  House,
  IdCard,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth.actions";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  list: ClipboardList,
  users: Users,
  scissors: Scissors,
  clock: Clock,
  settings: Settings,
  plus: CalendarPlus,
  user: User,
  home: Home,
  house: House,
  card: IdCard,
  layers: Layers,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Ativo somente na rota exata (ex.: raiz do painel). */
  exact?: boolean;
}

interface AppShellProps {
  user: { name: string; email: string; roleLabel: string };
  nav: NavItem[];
  layout: "sidebar" | "top";
  /** Legenda no rodapé da barra lateral. */
  sidebarLabel?: string;
  children: React.ReactNode;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({ user, nav, layout, sidebarLabel, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  const navLinks = (variant: "sidebar" | "top" | "mobile") =>
    nav.map((item) => {
      const Icon = ICONS[item.icon];
      const active = isActive(pathname, item);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md text-sm transition-colors",
            variant === "top" ? "px-3 py-2" : "px-3 py-2.5",
            active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      );
    });

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
        <span className="hidden text-right sm:block">
          <span className="block text-sm leading-tight">{user.name}</span>
          <span className="block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{user.roleLabel}</span>
        </span>
        <Avatar name={user.name} className="h-9 w-9" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block text-sm text-foreground">{user.name}</span>
          <span className="block truncate">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home /> Site da barbearia
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void logoutAction()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const header = (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className={cn("flex h-16 items-center justify-between gap-4 px-4 sm:px-6", layout === "top" && "container")}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn("-ml-2 rounded-md p-2", layout === "sidebar" ? "lg:hidden" : "md:hidden")}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href={nav[0]?.href ?? "/"} className={cn(layout === "sidebar" && "lg:hidden")}>
            <Logo size="sm" tagline />
          </Link>
          {layout === "top" && <nav className="ml-6 hidden items-center gap-1 md:flex">{navLinks("top")}</nav>}
        </div>
        {userMenu}
      </div>
      {mobileOpen && (
        <nav className={cn("animate-fade-in space-y-1 border-t p-3", layout === "sidebar" ? "lg:hidden" : "md:hidden")} aria-label="Menu">
          {navLinks("mobile")}
          <button
            type="button"
            onClick={() => void logoutAction()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/60"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </nav>
      )}
    </header>
  );

  if (layout === "top") {
    return (
      <div className="min-h-dvh">
        {header}
        <main className="container py-6 sm:py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r lg:flex">
        <Link href={nav[0]?.href ?? "/"} className="flex items-center justify-center px-6 pb-16 pt-10">
          <Logo size="md" />
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4" aria-label="Menu do painel">
          {navLinks("sidebar")}
          <button
            type="button"
            onClick={() => void logoutAction()}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </nav>
        {sidebarLabel && <p className="px-6 py-6 text-caption uppercase text-muted-foreground">{sidebarLabel}</p>}
      </aside>
      <div className="min-w-0">
        {header}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
