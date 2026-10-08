/** Fuso horário da barbearia. Todos os horários de agenda são interpretados nele. */
export const SHOP_TIMEZONE = process.env.NEXT_PUBLIC_SHOP_TIMEZONE ?? "America/Sao_Paulo";

export const APP_NAME = "MR.MANDU BARBERS";

export const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
] as const;
