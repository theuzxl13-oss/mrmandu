/**
 * Dados fictícios para DESENVOLVIMENTO.
 * As credenciais criadas aqui estão documentadas no README e
 * NUNCA devem ser usadas em produção.
 */
import { PrismaClient, type AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  addDaysToKey,
  dateKeyToDbDate,
  dayOfWeekOf,
  shopDateTimeToUtc,
  timeToMinutes,
  todayKey,
} from "../src/lib/time";

const db = new PrismaClient();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  console.error("Seed bloqueado em produção. Ele cria usuários com senha conhecida.");
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD ?? "Mandu@2026";

async function upsertUser(data: { name: string; email: string; phone: string; role: "CLIENT" | "BARBER" | "ADMIN" }, passwordHash: string) {
  return db.user.upsert({
    where: { email: data.email },
    update: { name: data.name, phone: data.phone, role: data.role, active: true },
    create: { ...data, passwordHash },
  });
}

async function upsertService(data: { name: string; description: string; priceCents: number; durationMinutes: number }) {
  const existing = await db.service.findFirst({ where: { name: data.name } });
  return existing ? db.service.update({ where: { id: existing.id }, data }) : db.service.create({ data });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await db.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "MR.MANDU BARBERS",
      phone: "11999999999",
      whatsapp: "11999999999",
      email: "contato@mrmandu.com",
      instagram: "@mrmandubarbers",
      address: "Av. Paulista, 1000",
      city: "São Paulo — SP",
      about:
        "A MR.MANDU BARBERS nasceu da paixão pela barbearia clássica. Unimos técnicas tradicionais a tendências atuais para entregar um atendimento impecável, em um ambiente pensado para você relaxar.\n\nCada detalhe — da toalha quente ao acabamento na navalha — existe para que você saia daqui melhor do que entrou.",
    },
  });

  // Horário geral: seg–sex 09–19 (almoço 12–13), sáb 09–17, domingo fechado.
  for (let day = 0; day < 7; day++) {
    const data = {
      startTime: "09:00",
      endTime: day === 6 ? "17:00" : "19:00",
      breakStart: "12:00",
      breakEnd: "13:00",
      active: day !== 0,
    };
    const existing = await db.businessHours.findFirst({ where: { barberId: null, dayOfWeek: day } });
    if (existing) await db.businessHours.update({ where: { id: existing.id }, data });
    else await db.businessHours.create({ data: { ...data, dayOfWeek: day } });
  }

  await upsertUser({ name: "Administrador Mandu", email: "admin@mrmandu.com", phone: "11900000000", role: "ADMIN" }, passwordHash);

  const barberSeeds = [
    { name: "João Mandu", email: "joao@mrmandu.com", phone: "11911111111", specialty: "Cortes clássicos e navalha", bio: "Mais de 10 anos de experiência em cortes clássicos, degradê e barboterapia." },
    { name: "Pedro Alves", email: "pedro@mrmandu.com", phone: "11922222222", specialty: "Degradê e barba", bio: "Especialista em degradê, desenhos e design de barba." },
  ];
  const barbers = [];
  for (const b of barberSeeds) {
    const user = await upsertUser({ name: b.name, email: b.email, phone: b.phone, role: "BARBER" }, passwordHash);
    barbers.push(
      await db.barber.upsert({
        where: { userId: user.id },
        update: { specialty: b.specialty, bio: b.bio, active: true },
        create: { userId: user.id, specialty: b.specialty, bio: b.bio },
      }),
    );
  }

  const services = [
    await upsertService({ name: "Corte Masculino", description: "Corte na tesoura e/ou máquina com lavagem e finalização.", priceCents: 4500, durationMinutes: 30 }),
    await upsertService({ name: "Corte + Barba", description: "O combo completo: corte, barba com toalha quente e finalização.", priceCents: 6500, durationMinutes: 60 }),
    await upsertService({ name: "Barba", description: "Modelagem e acabamento na navalha com toalha quente.", priceCents: 3500, durationMinutes: 30 }),
    await upsertService({ name: "Sobrancelha", description: "Limpeza e alinhamento na navalha.", priceCents: 2000, durationMinutes: 15 }),
    await upsertService({ name: "Acabamento", description: "Pezinho e contorno para manter o corte em dia.", priceCents: 2000, durationMinutes: 15 }),
  ];

  const clientSeeds = [
    { name: "Carlos Oliveira", email: "carlos@cliente.com", phone: "11933333333" },
    { name: "Rafael Souza", email: "rafael@cliente.com", phone: "11944444444" },
    { name: "Lucas Pereira", email: "lucas@cliente.com", phone: "11955555555" },
    { name: "Marcos Lima", email: "marcos@cliente.com", phone: "11966666666" },
  ];
  const clients = [];
  for (const c of clientSeeds) clients.push(await upsertUser({ ...c, role: "CLIENT" }, passwordHash));

  // Recria os agendamentos de exemplo (somente dos clientes de seed).
  await db.appointment.deleteMany({ where: { clientId: { in: clients.map((c) => c.id) } } });

  const today = todayKey();
  const now = new Date();
  const times = ["09:00", "10:00", "11:00", "14:00", "15:30", "17:00"];
  let n = 0;
  for (let offset = -14; offset <= 7; offset++) {
    const date = addDaysToKey(today, offset);
    if (dayOfWeekOf(date) === 0) continue;
    for (const [bi, barber] of barbers.entries()) {
      for (let slot = 0; slot < 3; slot++) {
        n++;
        const time = times[(slot * 2 + bi + Math.abs(offset)) % times.length]!;
        const service = services[n % services.length]!;
        const client = clients[n % clients.length]!;
        const start = shopDateTimeToUtc(date, time);
        const end = new Date(start.getTime() + service.durationMinutes * 60_000);
        if (dayOfWeekOf(date) === 6 && timeToMinutes(time) + service.durationMinutes > timeToMinutes("17:00")) continue;
        let status: AppointmentStatus;
        if (end <= now) status = n % 7 === 0 ? "CANCELLED" : "COMPLETED";
        else status = n % 3 === 0 ? "PENDING" : "CONFIRMED";
        try {
          await db.appointment.create({
            data: {
              clientId: client.id,
              barberId: barber.id,
              serviceId: service.id,
              date: dateKeyToDbDate(date),
              startTime: start,
              endTime: end,
              status,
              priceCents: service.priceCents,
              cancelledAt: status === "CANCELLED" ? start : null,
              cancellationReason: status === "CANCELLED" ? "Cliente solicitou cancelamento" : null,
            },
          });
        } catch {
          // Horário em conflito (a constraint do banco protege): apenas ignora no seed.
          console.warn(`  · ignorado conflito ${date} ${time}`);
        }
      }
    }
  }

  const total = await db.appointment.count();
  console.info(`\nSeed concluído: ${barbers.length} barbeiros, ${services.length} serviços, ${clients.length} clientes, ${total} agendamentos.`);
  console.info(`Senha de todos os usuários de teste: ${PASSWORD}  (apenas desenvolvimento!)\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
