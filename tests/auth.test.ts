import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { authenticate, loadSessionUser, registerClient } from "@/server/services/user.service";
import { requestPasswordReset } from "@/server/services/password-reset.service";
import { canAccessPath, safeCallbackPath } from "@/lib/route-access";
import { getAdminDashboard } from "@/server/services/dashboard.service";
import { listAllServices } from "@/server/services/catalog.service";
import { PASSWORD, seedScenario, type Scenario } from "./helpers/factory";

let s: Scenario;
beforeEach(async () => {
  s = await seedScenario();
});

const signup = {
  name: "Carlos Silva",
  email: "Carlos@Example.com ",
  phone: "(11) 98888-7777",
  password: "Segura123",
  confirmPassword: "Segura123",
};

describe("1. Cadastro de cliente", () => {
  it("cria conta como CLIENTE com senha em hash e e-mail normalizado", async () => {
    const user = await registerClient(signup);
    expect(user.role).toBe("CLIENT");
    expect(user.email).toBe("carlos@example.com");
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toContain("Segura123");
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored.phone).toBe("11988887777");
  });

  it("ignora tentativa de escolher o perfil pelo formulário", async () => {
    const user = await registerClient({ ...signup, role: "ADMIN" });
    expect(user.role).toBe("CLIENT");
  });

  it("rejeita e-mail já cadastrado", async () => {
    await registerClient(signup);
    await expect(registerClient(signup)).rejects.toMatchObject({ code: "EMAIL_IN_USE" });
  });

  it("valida senha fraca e confirmação divergente", async () => {
    await expect(registerClient({ ...signup, password: "123", confirmPassword: "123" })).rejects.toThrow();
    await expect(registerClient({ ...signup, confirmPassword: "Outra1234" })).rejects.toThrow();
  });
});

describe("2. Login", () => {
  it("cliente faz login com credenciais válidas", async () => {
    await registerClient(signup);
    const user = await authenticate({ email: "carlos@example.com", password: "Segura123", portal: "client" });
    expect(user.role).toBe("CLIENT");
  });

  it("rejeita senha inválida e e-mail inexistente com a mesma mensagem", async () => {
    await expect(authenticate({ email: "ana@test.com", password: "errada123", portal: "client" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
    await expect(authenticate({ email: "nao@existe.com", password: PASSWORD, portal: "client" })).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("cliente não entra pelo acesso da equipe e vice-versa", async () => {
    await expect(authenticate({ email: "ana@test.com", password: PASSWORD, portal: "staff" })).rejects.toMatchObject({
      code: "WRONG_PORTAL",
    });
    await expect(authenticate({ email: "admin@test.com", password: PASSWORD, portal: "client" })).rejects.toMatchObject({
      code: "WRONG_PORTAL",
    });
    const admin = await authenticate({ email: "admin@test.com", password: PASSWORD, portal: "staff" });
    expect(admin.role).toBe("ADMIN");
  });

  it("conta desativada não consegue entrar e a sessão existente é invalidada", async () => {
    await db.user.update({ where: { id: s.ana.id }, data: { active: false } });
    await expect(authenticate({ email: "ana@test.com", password: PASSWORD, portal: "client" })).rejects.toMatchObject({
      code: "ACCOUNT_DISABLED",
    });
    expect(await loadSessionUser(s.ana.id, 0)).toBeNull();
  });

  it("troca de senha (sessionVersion) invalida sessões antigas", async () => {
    expect(await loadSessionUser(s.ana.id, 0)).not.toBeNull();
    await db.user.update({ where: { id: s.ana.id }, data: { sessionVersion: { increment: 1 } } });
    expect(await loadSessionUser(s.ana.id, 0)).toBeNull();
  });

  it("solicitação de redefinição não revela se o e-mail existe e guarda apenas o hash do token", async () => {
    await expect(requestPasswordReset({ email: "nao@existe.com" })).resolves.toBeUndefined();
    await requestPasswordReset({ email: "ana@test.com" });
    const token = await db.passwordResetToken.findFirstOrThrow({ where: { userId: s.ana.id } });
    expect(token.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("6. Controle de acesso por perfil", () => {
  it("cliente não acessa rotas do painel administrativo nem do barbeiro", () => {
    expect(canAccessPath("CLIENT", "/admin")).toBe(false);
    expect(canAccessPath("CLIENT", "/admin/clientes")).toBe(false);
    expect(canAccessPath("CLIENT", "/barbeiro")).toBe(false);
    expect(canAccessPath("CLIENT", "/cliente")).toBe(true);
    expect(canAccessPath("BARBER", "/admin/servicos")).toBe(false);
    expect(canAccessPath(null, "/cliente")).toBe(false);
    expect(canAccessPath(null, "/")).toBe(true);
    expect(canAccessPath("CLIENT", "/administrador-falso")).toBe(true); // não é prefixo /admin/
  });

  it("cliente e barbeiro recebem FORBIDDEN nos serviços administrativos (backend)", async () => {
    await expect(getAdminDashboard(s.ana)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listAllServices(s.joao)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("callbackUrl só aceita caminhos internos (sem open redirect)", () => {
    expect(safeCallbackPath("/cliente")).toBe("/cliente");
    expect(safeCallbackPath("//evil.com")).toBeNull();
    expect(safeCallbackPath("https://evil.com")).toBeNull();
    expect(safeCallbackPath("/\\evil.com")).toBeNull();
  });
});
