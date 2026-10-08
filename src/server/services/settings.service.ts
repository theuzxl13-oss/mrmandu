import type { ShopSettings } from "@prisma/client";
import { db, type TxClient } from "@/server/db";
import { assertRole } from "@/server/auth/permissions";
import type { SessionUser } from "@/types/auth";
import { settingsSchema } from "@/validations/catalog";

/** Configuração singleton; criada com valores padrão caso não exista. */
export async function getShopSettings(client: TxClient | typeof db = db): Promise<ShopSettings> {
  const existing = await client.shopSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return client.shopSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function updateShopSettings(actor: SessionUser, input: unknown) {
  assertRole(actor, "ADMIN");
  const data = settingsSchema.parse(input);
  return db.shopSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
}
