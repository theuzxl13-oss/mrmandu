import { z } from "zod";
import { timeToMinutes } from "@/lib/time";
import {
  emailSchema,
  idSchema,
  optionalPhoneSchema,
  optionalText,
  optionalTimeKeySchema,
  passwordSchema,
  phoneSchema,
  text,
  timeKeySchema,
} from "./common";

// ---------------- Serviços ----------------
export const serviceSchema = z.object({
  name: text({ min: 2, max: 80, label: "Nome" }),
  description: optionalText({ max: 300, label: "Descrição", multiline: true }),
  /** Preço em reais no formulário; convertido para centavos. */
  price: z.coerce
    .number({ invalid_type_error: "Preço inválido." })
    .min(0, "Preço não pode ser negativo.")
    .max(10_000, "Preço muito alto."),
  durationMinutes: z.coerce
    .number({ invalid_type_error: "Duração inválida." })
    .int("Duração deve ser em minutos inteiros.")
    .min(5, "Duração mínima de 5 minutos.")
    .max(480, "Duração máxima de 8 horas."),
  active: z.boolean().default(true),
});
export type ServiceFormInput = z.input<typeof serviceSchema>;
export type ServiceFormOutput = z.output<typeof serviceSchema>;

// ---------------- Barbeiros ----------------
const photoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(
    z
      .string()
      .url("URL da foto inválida.")
      .refine((v) => /^https:\/\//.test(v) || v.startsWith("/"), "Use uma URL https.")
      .nullable(),
  );

const barberBaseSchema = z.object({
  name: text({ min: 3, max: 100, label: "Nome" }),
  email: emailSchema,
  phone: phoneSchema,
  photo: photoUrlSchema,
  specialty: optionalText({ max: 100, label: "Especialidade" }),
  bio: optionalText({ max: 400, label: "Bio", multiline: true }),
  active: z.boolean().default(true),
});

export const createBarberSchema = barberBaseSchema.extend({ password: passwordSchema });
export const updateBarberSchema = barberBaseSchema.extend({
  password: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(passwordSchema.optional()),
});
export type BarberFormInput = z.input<typeof updateBarberSchema>;

// ---------------- Horários ----------------
export const dayHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    active: z.boolean(),
    startTime: timeKeySchema,
    endTime: timeKeySchema,
    breakStart: optionalTimeKeySchema,
    breakEnd: optionalTimeKeySchema,
  })
  .superRefine((d, ctx) => {
    if (!d.active) return;
    const start = timeToMinutes(d.startTime);
    const end = timeToMinutes(d.endTime);
    if (end <= start) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "O fim deve ser após o início." });
    }
    if (!!d.breakStart !== !!d.breakEnd) {
      ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "Informe início e fim do intervalo." });
      return;
    }
    if (d.breakStart && d.breakEnd) {
      const bs = timeToMinutes(d.breakStart);
      const be = timeToMinutes(d.breakEnd);
      if (be <= bs) {
        ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "Intervalo inválido." });
      } else if (bs < start || be > end) {
        ctx.addIssue({ code: "custom", path: ["breakStart"], message: "O intervalo deve estar dentro do expediente." });
      }
    }
  });
export type DayHoursInput = z.input<typeof dayHoursSchema>;

export const weeklyHoursSchema = z.object({
  /** null = horário geral da barbearia. */
  barberId: idSchema.nullable(),
  days: z
    .array(dayHoursSchema)
    .length(7)
    .refine((days) => new Set(days.map((d) => d.dayOfWeek)).size === 7, "Dias duplicados."),
});
export type WeeklyHoursInput = z.input<typeof weeklyHoursSchema>;

// ---------------- Configurações ----------------
export const settingsSchema = z.object({
  name: text({ min: 2, max: 80, label: "Nome" }),
  phone: optionalPhoneSchema,
  whatsapp: optionalPhoneSchema,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(emailSchema.nullable()),
  instagram: optionalText({ max: 60, label: "Instagram" }),
  address: optionalText({ max: 200, label: "Endereço" }),
  city: optionalText({ max: 100, label: "Cidade" }),
  about: optionalText({ max: 1500, label: "Sobre", multiline: true }),
  slotIntervalMinutes: z.coerce.number().int().refine((v) => [10, 15, 20, 30, 45, 60].includes(v), "Intervalo inválido."),
  minAdvanceMinutes: z.coerce.number().int().min(0).max(7 * 24 * 60),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  cancellationNoticeHours: z.coerce.number().int().min(0).max(168),
});
export type SettingsFormInput = z.input<typeof settingsSchema>;

// ---------------- Clientes (admin) ----------------
export const toggleActiveSchema = z.object({ id: idSchema, active: z.boolean() });
