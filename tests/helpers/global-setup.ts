import { execSync } from "node:child_process";

/** Aplica migrations pendentes (não destrutivo) no banco de teste (DATABASE_URL de .env.test). */
export default function setup() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/test/i.test(url)) {
    throw new Error("DATABASE_URL de teste deve apontar para um banco de TESTE (nome contendo 'test').");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}
