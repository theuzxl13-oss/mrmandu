import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { SHOP_TIMEZONE } from "@/config/shop";
import type { DateKey } from "./time";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(cents: number): string {
  return currency.format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** 15/10/2026 */
export function formatDateKey(date: DateKey): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** "quinta-feira, 15 de outubro" */
export function formatDateLong(date: DateKey): string {
  return formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "qui, 15 out" */
export function formatDateShort(date: DateKey): string {
  return formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEE, d MMM", { locale: ptBR });
}

export function formatInstant(instant: Date, pattern = "dd/MM/yyyy HH:mm"): string {
  return formatInTimeZone(instant, SHOP_TIMEZONE, pattern, { locale: ptBR });
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}
