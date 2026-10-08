import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@/lib/errors";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { mailer } from "@/server/mail/mailer";
import { forgotPasswordSchema, resetPasswordSchema } from "@/validations/auth";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Solicita redefinição. Sempre "sucesso" para não revelar se o e-mail existe.
 * O token é aleatório (256 bits), armazenado apenas como hash e de uso único.
 */
export async function requestPasswordReset(input: unknown): Promise<void> {
  const { email } = forgotPasswordSchema.parse(input);
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, active: true } });
  if (!user || !user.active) return;

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    }),
  ]);

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  await mailer.send({
    to: user.email,
    subject: "MR.MANDU BARBERS — Redefinição de senha",
    text: `Para criar uma nova senha, acesse (válido por 1 hora):\n${baseUrl}/redefinir-senha?token=${token}\n\nSe você não solicitou, ignore este e-mail.`,
  });
}

export async function resetPassword(input: unknown): Promise<void> {
  const data = resetPasswordSchema.parse(input);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(data.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) throw new AppError("INVALID_TOKEN");

  const passwordHash = await hashPassword(data.password);
  await db.$transaction([
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
  ]);
}
