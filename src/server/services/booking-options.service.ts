import { addDaysToKey, todayKey } from "@/lib/time";
import { listActiveBarbers } from "./barber.service";
import { getWeeklyHours } from "./business-hours.service";
import { listActiveServices } from "./catalog.service";
import { getShopSettings } from "./settings.service";

/** Dados necessários para montar o fluxo de agendamento. */
export async function getBookingOptions(opts: { limitWindow: boolean }) {
  const [services, barbers, settings, hours] = await Promise.all([
    listActiveServices(),
    listActiveBarbers(),
    getShopSettings(),
    getWeeklyHours(null),
  ]);
  const today = todayKey();
  return {
    services,
    barbers,
    today,
    maxDate: opts.limitWindow ? addDaysToKey(today, settings.maxAdvanceDays) : undefined,
    closedWeekdays: hours.days.filter((d) => !d.active).map((d) => d.dayOfWeek),
  };
}
