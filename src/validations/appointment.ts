import { z } from "zod";
import { dateKeySchema, idSchema, optionalText, text, timeKeySchema } from "./common";

export const ANY_BARBER = "any" as const;

export const APPOINTMENT_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export type AppointmentStatusValue = (typeof APPOINTMENT_STATUSES)[number];

const barberChoiceSchema = z.union([z.literal(ANY_BARBER), idSchema]);

export const availabilityQuerySchema = z.object({
  serviceId: idSchema,
  barberId: barberChoiceSchema,
  date: dateKeySchema,
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const createAppointmentSchema = z.object({
  serviceId: idSchema,
  barberId: barberChoiceSchema,
  date: dateKeySchema,
  time: timeKeySchema,
  notes: optionalText({ max: 500, label: "Observações", multiline: true }),
});
export type CreateAppointmentInput = z.input<typeof createAppointmentSchema>;

/** Criação pelo administrador em nome de um cliente. */
export const adminCreateAppointmentSchema = createAppointmentSchema.extend({
  clientId: idSchema,
});

export const rescheduleSchema = z.object({
  appointmentId: idSchema,
  date: dateKeySchema,
  time: timeKeySchema,
  /** Apenas administradores podem trocar o barbeiro. */
  barberId: idSchema.optional(),
});
export type RescheduleInput = z.input<typeof rescheduleSchema>;

export const rescheduleSlotsQuerySchema = z.object({
  appointmentId: idSchema,
  date: dateKeySchema,
  barberId: idSchema.optional(),
});

export const cancelSchema = z.object({
  appointmentId: idSchema,
  reason: optionalText({ max: 300, label: "Motivo" }),
});

export const updateNotesSchema = z.object({
  appointmentId: idSchema,
  notes: optionalText({ max: 500, label: "Observações", multiline: true }),
});

export const appointmentFiltersSchema = z.object({
  date: dateKeySchema.optional().catch(undefined),
  barberId: idSchema.optional().catch(undefined),
  serviceId: idSchema.optional().catch(undefined),
  status: z.enum(APPOINTMENT_STATUSES).optional().catch(undefined),
  q: text({ max: 100, label: "Busca" }).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});
export type AppointmentFilters = z.infer<typeof appointmentFiltersSchema>;
