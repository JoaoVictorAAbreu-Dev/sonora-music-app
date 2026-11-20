import {
  emailSchema,
  newPasswordSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@sonora/shared';
import { ApiRequestError } from '@/lib/api/client';

/** User-facing copy (pt-BR). Validation rules come from the shared schemas used by the API. */
export const copy = {
  emailInvalid: 'Digite um e-mail válido.',
  emailRequired: 'Digite seu e-mail.',
  passwordRequired: 'Digite sua senha.',
  passwordTooShort: `A senha precisa ter ao menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  passwordTooLong: `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
  passwordTooCommon: 'Essa senha é muito comum. Escolha outra.',
  passwordMismatch: 'As senhas não coincidem.',
  termsRequired: 'Aceite os Termos e a Política de Privacidade para continuar.',
  invalidCredentials: 'E-mail ou senha incorretos',
  emailTaken: 'Este e-mail já tem uma conta. Entre com ele.',
  rateLimited: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  network: 'Sem conexão. Verifique a internet e tente de novo.',
  generic: 'Algo deu errado. Tente de novo.',
  comingSoon: 'Em breve',
  resetTokenInvalid: 'Este link expirou ou já foi usado. Peça um novo.',
  passwordChanged: 'Senha alterada. Entre com a nova senha.',
};

export function emailError(value: string, required = true): string | undefined {
  if (!value.trim()) return required ? copy.emailRequired : undefined;
  return emailSchema.safeParse(value).success ? undefined : copy.emailInvalid;
}

export function newPasswordError(value: string): string | undefined {
  const r = newPasswordSchema.safeParse(value);
  if (r.success) return undefined;
  switch (r.error.issues[0]?.message) {
    case 'too_common':
      return copy.passwordTooCommon;
    case 'too_long':
      return copy.passwordTooLong;
    default:
      return copy.passwordTooShort;
  }
}

/** Maps any thrown error to a message; field-specific API errors are handled by the screens. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof ApiRequestError)) return copy.generic;
  switch (err.code) {
    case 'INVALID_CREDENTIALS':
      return copy.invalidCredentials;
    case 'EMAIL_TAKEN':
      return copy.emailTaken;
    case 'RESET_TOKEN_INVALID':
      return copy.resetTokenInvalid;
    case 'RATE_LIMITED':
      return copy.rateLimited;
    case 'NETWORK_ERROR':
      return copy.network;
    default:
      return copy.generic;
  }
}
