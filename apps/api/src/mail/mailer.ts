import type { FastifyBaseLogger } from 'fastify';

/** Outgoing e-mail. A real provider is pending (open question Q14); see config MAIL_PROVIDER. */
export interface Mailer {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

export function createMailer(provider: 'none' | 'log', log: FastifyBaseLogger): Mailer {
  if (provider === 'log') {
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
