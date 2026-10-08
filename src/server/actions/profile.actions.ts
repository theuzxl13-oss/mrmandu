"use server";

import { changePassword, updateProfile } from "@/server/services/user.service";
import { withActor } from "./run-action";

export async function updateProfileAction(input: unknown) {
  return withActor(["CLIENT", "BARBER", "ADMIN"], async (a) => void (await updateProfile(a, input)), {
    revalidate: ["/cliente"],
    message: "Dados atualizados.",
  });
}

/** Após trocar a senha, as sessões antigas são invalidadas; o usuário entra novamente. */
export async function changePasswordAction(input: unknown) {
  return withActor(["CLIENT", "BARBER", "ADMIN"], async (a) => void (await changePassword(a, input)), {
    message: "Senha alterada. Faça login novamente.",
  });
}
