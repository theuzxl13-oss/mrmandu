/**
 * Abstração de envio de e-mail. Em desenvolvimento os e-mails são apenas
 * registrados no console do servidor. Para produção, implemente um provedor
 * (SMTP, Resend, SES...) respeitando a mesma interface.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    console.info(`\n[mailer] Para: ${message.to}\n[mailer] Assunto: ${message.subject}\n${message.text}\n`);
  }
}

export const mailer: Mailer = new ConsoleMailer();
