import type { FastifyBaseLogger } from 'fastify';
import nodemailer from 'nodemailer';

/** Outgoing e-mail. */
export interface Mailer {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

export interface MailConfig {
  MAIL_PROVIDER: 'none' | 'log' | 'smtp';
  SMTP_URL: string;
  MAIL_FROM: string;
}

/** Anything with nodemailer's sendMail (a real SMTP transport, or a JSON transport in tests). */
interface Transport {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** pt-BR reset message: plain text plus a minimal HTML version with one button. */
export function passwordResetMessage(resetUrl: string) {
  const subject = 'Redefinir sua senha do Sonora';
  const text = [
    'Recebemos um pedido para redefinir a senha da sua conta Sonora.',
    '',
    `Abra este link no seu celular para escolher uma nova senha (vale por 30 minutos):`,
    resetUrl,
    '',
    'Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
  ].join('\n');
  const url = escapeHtml(resetUrl);
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:system-ui,sans-serif;line-height:1.5">
<p>Recebemos um pedido para redefinir a senha da sua conta Sonora.</p>
<p><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#f5891f;color:#1b1d23;text-decoration:none;font-weight:600">Redefinir senha</a></p>
<p>O link vale por 30 minutos. Abra-o no celular em que o Sonora está instalado.</p>
<p>Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p>
</body></html>`;
  return { subject, text, html };
}

export function createSmtpMailer(transport: Transport, from: string): Mailer {
  return {
    async sendPasswordReset(to, resetUrl) {
      await transport.sendMail({ from, to, ...passwordResetMessage(resetUrl) });
    },
  };
}

export function createMailer(config: MailConfig, log: FastifyBaseLogger): Mailer {
  if (config.MAIL_PROVIDER === 'smtp') {
    // SMTP_URL carries the credentials (smtps://user:pass@host:465); it is never logged.
    return createSmtpMailer(nodemailer.createTransport(config.SMTP_URL), config.MAIL_FROM);
  }
  if (config.MAIL_PROVIDER === 'log') {
    return {
      // Development only (config rejects it in production): the link is a credential.
      async sendPasswordReset(_to, resetUrl) {
        log.info({ event: 'mail_password_reset', resetUrl }, 'password reset e-mail (dev log)');
      },
    };
  }
  return {
    async sendPasswordReset() {
      log.warn({ event: 'mail_dropped', kind: 'password_reset' }, 'no mail provider configured');
    },
  };
}
