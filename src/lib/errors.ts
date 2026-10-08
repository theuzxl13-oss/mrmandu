/**
 * Erros de domínio com códigos estáveis e mensagens claras para o usuário.
 * Serviços lançam AppError; actions convertem em ActionResult.
 */
export const ERROR_MESSAGES = {
  UNAUTHENTICATED: "Sua sessão expirou. Faça login novamente.",
  FORBIDDEN: "Você não tem permissão para realizar esta ação.",
  INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
  WRONG_PORTAL: "Este acesso não corresponde ao seu tipo de conta.",
  ACCOUNT_DISABLED: "Sua conta está desativada. Entre em contato com a barbearia.",
  TOO_MANY_ATTEMPTS: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  EMAIL_IN_USE: "Este e-mail já está cadastrado.",
  NOT_FOUND: "Registro não encontrado.",
  VALIDATION: "Verifique os dados informados.",
  SLOT_UNAVAILABLE: "Este horário não está mais disponível. Escolha outro horário.",
  SLOT_IN_PAST: "Não é possível agendar em um horário que já passou.",
  OUTSIDE_BUSINESS_HOURS: "Horário fora do funcionamento da barbearia.",
  TOO_FAR_AHEAD: "Data muito distante. Escolha uma data mais próxima.",
  BARBER_UNAVAILABLE: "Barbeiro indisponível no momento.",
  NO_BARBER_AVAILABLE: "Nenhum barbeiro disponível neste horário.",
  SERVICE_INACTIVE: "Este serviço não está disponível no momento.",
  SERVICE_IN_USE: "Este serviço possui agendamentos. Desative-o em vez de excluir.",
  INVALID_STATUS_TRANSITION: "Não é possível alterar o status deste agendamento.",
  CANCELLATION_TOO_LATE: "O prazo para cancelar ou reagendar este horário já passou.",
  CANNOT_COMPLETE_FUTURE: "Só é possível concluir atendimentos que já começaram.",
  INVALID_TOKEN: "Link inválido ou expirado. Solicite uma nova redefinição de senha.",
  WRONG_PASSWORD: "Senha atual incorreta.",
  INVALID_HOURS: "Horário de funcionamento inválido.",
  INTERNAL: "Algo deu errado. Tente novamente em instantes.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
