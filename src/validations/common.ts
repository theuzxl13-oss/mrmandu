import { z } from "zod";
import { isValidDateKey, TIME_KEY_REGEX } from "@/lib/time";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Texto livre sanitizado: remove caracteres de controle, normaliza espaços e limita tamanho. */
export function text(opts: { min?: number; max: number; label: string; multiline?: boolean }) {
  return z
    .string({ required_error: `${opts.label} é obrigatório.` })
    .transform((v) => {
      const cleaned = v.replace(CONTROL_CHARS, "");
      return opts.multiline ? cleaned.replace(/[ \t]+/g, " ").trim() : cleaned.replace(/\s+/g, " ").trim();
    })
    .pipe(
      z
        .string()
        .min(opts.min ?? 0, opts.min ? `${opts.label} deve ter ao menos ${opts.min} caracteres.` : undefined)
        .max(opts.max, `${opts.label} deve ter no máximo ${opts.max} caracteres.`),
    );
}

export function optionalText(opts: { max: number; label: string; multiline?: boolean }) {
  return text(opts)
    .optional()
    .transform((v) => (v ? v : null));
}

export const idSchema = z.string().trim().min(1, "Identificador inválido.").max(64);

export const emailSchema = z
  .string({ required_error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail muito longo.")
  .email("E-mail inválido.");

/** Senha forte: 8–72 caracteres (limite do bcrypt), com letra e número. */
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra.")
  .regex(/\d/, "A senha deve conter ao menos um número.");

export const phoneSchema = z
  .string({ required_error: "Informe o telefone." })
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(z.string().regex(/^\d{10,11}$/, "Telefone inválido. Use DDD + número."));

export const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : ""))
  .pipe(z.string().regex(/^(\d{10,11})?$/, "Telefone inválido. Use DDD + número."))
  .transform((v) => (v ? v : null));

export const dateKeySchema = z
  .string({ required_error: "Informe a data." })
  .refine(isValidDateKey, "Data inválida.");

export const timeKeySchema = z
  .string({ required_error: "Informe o horário." })
  .regex(TIME_KEY_REGEX, "Horário inválido.");

export const optionalTimeKeySchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(timeKeySchema.nullable());
