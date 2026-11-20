import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { createSmtpMailer, passwordResetMessage } from '../src/mail/mailer';
import { resetLink } from '../src/routes/auth';

const infra = join(__dirname, '../../../infra');

describe('reset link', () => {
  it('uses a query for the app scheme and a fragment for https', () => {
    expect(resetLink('sonora://reset-password', 'a/b')).toBe('sonora://reset-password?token=a%2Fb');
    expect(resetLink('https://api.example.com/reset-password', 'tok')).toBe(
      'https://api.example.com/reset-password#token=tok',
    );
  });

  it('the Caddy CSP allows exactly the inline script of the bridge page', () => {
    const html = readFileSync(join(infra, 'site/reset-password.html'), 'utf8');
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
    const hash = createHash('sha256').update(script).digest('base64');
    expect(readFileSync(join(infra, 'Caddyfile'), 'utf8')).toContain(`'sha256-${hash}'`);
  });
});

describe('SMTP mailer', () => {
  it('sends a pt-BR message with the escaped link', async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const sent: string[] = [];
    const mailer = createSmtpMailer(
      {
        async sendMail(m) {
          const info = (await transport.sendMail(m)) as { message: string };
          sent.push(info.message);
        },
      },
      'Sonora <nao-responda@example.com>',
    );
    await mailer.sendPasswordReset('ana@example.com', 'https://x.example/reset-password#token=a&b');
    const msg = JSON.parse(sent[0] ?? '{}') as Record<string, unknown>;
    expect(msg.subject).toBe('Redefinir sua senha do Sonora');
    expect(msg.html).toContain('href="https://x.example/reset-password#token=a&#38;b"');
    expect(passwordResetMessage('u').text).toContain('30 minutos');
  });

  it('requires SMTP_URL and MAIL_FROM', () => {
    const base = {
      DATABASE_URL: 'postgres://u:p@localhost:5432/db',
      JWT_SECRET: 'x'.repeat(40),
      MAIL_PROVIDER: 'smtp',
    };
    expect(() => loadConfig(base)).toThrow(/SMTP_URL and MAIL_FROM/);
    expect(
      loadConfig({ ...base, SMTP_URL: 'smtps://u:p@smtp.example.com:465', MAIL_FROM: 'a@b.c' })
        .MAIL_PROVIDER,
    ).toBe('smtp');
  });
});
