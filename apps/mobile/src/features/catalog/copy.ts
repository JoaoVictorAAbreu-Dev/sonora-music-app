import { ApiRequestError } from '@/lib/api/client';

/** pt-BR copy for catalog errors (T06 "Erro de conexão"). */
export function errorCopy(error: unknown): { title: string; description: string } {
  if (error instanceof ApiRequestError && error.code === 'NETWORK_ERROR') {
    return {
      title: 'Sem conexão',
      description: 'Verifique sua conexão com a internet e tente de novo.',
    };
  }
  if (error instanceof ApiRequestError && error.code === 'RATE_LIMITED') {
    return { title: 'Muitas solicitações', description: 'Aguarde um instante e tente de novo.' };
  }
  return {
    title: 'Não foi possível carregar',
    description: 'O catálogo está indisponível agora. Tente de novo em instantes.',
  };
}
