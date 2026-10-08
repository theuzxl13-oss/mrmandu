import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import type { SessionUser } from "@/types/auth";

export const PASSWORD = "Senha1234";

/**
 * "Agora" fixo usado nos testes: segunda-feira, 07/01/2030 às 08:00 em São Paulo (UTC-3).
 * Os serviços recebem `now` explicitamente, tornando os testes determinísticos.
 */
export const NOW = new Date("2030-01-07T11:00:00Z");
export const MONDAY = "2030-01-07";
export const TUESDAY = "2030-01-08";
export const SUNDAY = "2030-01-13";

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE "Subscription", "Plan", "LoyaltyRedemption", "Appointment", "BusinessHours", "Barber", "Service", "PasswordResetToken", "User", "ShopSettings" CASCADE',
  );
}

let cachedHash: string | null = null;
async function passwordHash() {
  cachedHash ??= await hashPassword(PASSWORD);
  return cachedHash;
}

export async function createUser(role: SessionUser["role"], email: string, name = email.split("@")[0] ?? "user") {
  return db.user.create({ data: { name, email, phone: "11999990000", passwordHash: await passwordHash(), role } });
}

export async function createBarberActor(email: string, name: string): Promise<SessionUser> {
  const user = await db.user.create({
    data: { name, email, passwordHash: await passwordHash(), role: "BARBER", barber: { create: { specialty: "Cortes" } } },
    include: { barber: true },
  });
  return { id: user.id, name, email, role: "BARBER", barberId: user.barber!.id };
}

export function actorOf(user: { id: string; name: string; email: string; role: SessionUser["role"] }): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, barberId: null };
}

/** Cenário padrão: configurações, horário seg–sáb 09–19 (intervalo 12–13), 2 barbeiros, serviços e clientes. */
export async function seedScenario() {
  await resetDb();
  await db.shopSettings.create({
    data: { id: 1, slotIntervalMinutes: 30, minAdvanceMinutes: 60, maxAdvanceDays: 60, cancellationNoticeHours: 2 },
  });
  for (let day = 0; day < 7; day++) {
    await db.businessHours.create({
      data: { dayOfWeek: day, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", active: day !== 0 },
    });
  }
  const joao = await createBarberActor("joao@test.com", "João");
  const pedro = await createBarberActor("pedro@test.com", "Pedro");
  const corte = await db.service.create({ data: { name: "Corte", priceCents: 4000, durationMinutes: 30 } });
  const combo = await db.service.create({ data: { name: "Corte + Barba", priceCents: 6500, durationMinutes: 60 } });
  const inactive = await db.service.create({ data: { name: "Antigo", priceCents: 1000, durationMinutes: 30, active: false } });
  const admin = actorOf(await createUser("ADMIN", "admin@test.com", "Admin"));
  const ana = actorOf(await createUser("CLIENT", "ana@test.com", "Ana"));
  const bruno = actorOf(await createUser("CLIENT", "bruno@test.com", "Bruno"));
  return { joao, pedro, corte, combo, inactive, admin, ana, bruno };
}

export type Scenario = Awaited<ReturnType<typeof seedScenario>>;
