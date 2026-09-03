// Serviço de Ativação e Gerenciamento de Licenças (Vitalício e Mensal)

export interface LicencaInfo {
  ativa: boolean;
  tipo: 'vitalicio' | 'mensal' | 'teste';
  chave: string;
  titular: string;
  dataAtivacao: string;
  dataExpiracao: string | null; // null se vitalício
  diasRestantes?: number;
}

const STORAGE_KEY = 'nail_app_licenca_ativa_v1';

// Chaves de Licença configuradas no arquivo .env (você pode alterar no .env quando quiser)
const ENV_KEY_VITALICIO = (import.meta.env.VITE_LICENSE_KEY_VITALICIO || 'SHEILA-VIP-2026').trim().toUpperCase();
const ENV_KEY_MENSAL = (import.meta.env.VITE_LICENSE_KEY_MENSAL || 'SHEILA-MENSAL-2026').trim().toUpperCase();

// Chaves Oficiais Pré-cadastradas para Entrega Rápida
const CHAVES_MESTRAS: { [key: string]: { tipo: 'vitalicio' | 'mensal' | 'teste'; titular: string; diasValidade?: number } } = {
  // Chaves oficiais configuráveis pelo seu arquivo .env
  [ENV_KEY_VITALICIO]: { tipo: 'vitalicio', titular: 'Sheila Santos' },
  [ENV_KEY_MENSAL]: { tipo: 'mensal', titular: 'Assinatura Mensal', diasValidade: 30 },

  // Chaves reservas de fábrica
  'SHEILA-VIP-2026': { tipo: 'vitalicio', titular: 'Sheila Santos' },
  'SHEILA-VITALICIO-2026': { tipo: 'vitalicio', titular: 'Sheila Santos Nails Designer' },
  'ADEMAR-ADMIN-VITA': { tipo: 'vitalicio', titular: 'Ademar Xavier' },
  'NAIL-PRO-VITALICIO': { tipo: 'vitalicio', titular: 'Licença Vitalícia Profissional' },
  
  // Chaves de Assinatura Mensal (30 dias a partir da data de ativação)
  'NAIL-MENSAL-30': { tipo: 'mensal', titular: 'Assinatura Mensal', diasValidade: 30 },
  
  // Degustação / Teste
  'TESTE-7-DIAS': { tipo: 'teste', titular: 'Período de Degustação', diasValidade: 7 },
  'TESTE-GRATIS': { tipo: 'teste', titular: 'Avaliação Gratuita', diasValidade: 7 }
};

import { supabase } from './supabase';

// Obter dados da licença atual gravada no aparelho
export const obterLicencaAtual = (): LicencaInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const info: LicencaInfo = JSON.parse(raw);

    // Se for mensal ou teste, verifica se expirou
    if (info.dataExpiracao) {
      const expiraEm = new Date(info.dataExpiracao).getTime();
      const agora = new Date().getTime();
      const diffMs = expiraEm - agora;
      const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diasRestantes <= 0) {
        info.ativa = false;
        info.diasRestantes = 0;
      } else {
        info.diasRestantes = diasRestantes;
      }
    }

    return info;
  } catch (e) {
    return null;
  }
};

// Verifica na nuvem (Supabase) se a licença do cliente foi renovada ou cancelada
export const verificarLicencaNuvem = async (chave: string): Promise<LicencaInfo | null> => {
  const chaveLimpa = chave.trim().toUpperCase();
  if (!chaveLimpa) return null;

  try {
    const { data, error } = await supabase
      .from('licencas')
      .select('*')
      .eq('chave', chaveLimpa)
      .maybeSingle();

    if (error || !data) return null;

    let diasRestantes: number | undefined;
    let ativa = data.status === 'ativo';

    if (data.data_expiracao) {
      const expiraEm = new Date(data.data_expiracao).getTime();
      const agora = new Date().getTime();
      const diffMs = expiraEm - agora;
      diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diasRestantes <= 0) {
        ativa = false;
        diasRestantes = 0;
      }
    }

    const infoAtualizada: LicencaInfo = {
      ativa,
      tipo: data.tipo || 'mensal',
      chave: data.chave,
      titular: data.titular || 'Sheila Santos',
      dataAtivacao: data.criado_em || new Date().toISOString(),
      dataExpiracao: data.data_expiracao || null,
      diasRestantes
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(infoAtualizada));
    return infoAtualizada;
  } catch (e) {
    // Se estiver sem internet momentaneamente, não bloqueia o app imediatamente
    return null;
  }
};

// Sincroniza silenciosamente a licença gravada no aparelho com a nuvem toda vez que o app abre
export const sincronizarLicencaAtualComNuvem = async (): Promise<LicencaInfo | null> => {
  const atual = obterLicencaAtual();
  if (!atual || !atual.chave) return null;
  return await verificarLicencaNuvem(atual.chave);
};

// Verifica se a licença está válida e ativa
export const isLicencaAtiva = (): boolean => {
  const licenca = obterLicencaAtual();
  if (!licenca) return false;
  return licenca.ativa === true;
};

// Validar e Ativar uma Chave (Verifica tanto na Nuvem Supabase quanto no .env local)
export const ativarChaveLicenca = async (
  chaveDigitada: string, 
  nomeTitular?: string
): Promise<{ sucesso: boolean; mensagem: string; licenca?: LicencaInfo }> => {
  const chaveLimpa = chaveDigitada.trim().toUpperCase();

  if (!chaveLimpa) {
    return { sucesso: false, mensagem: 'Por favor, digite a sua Chave de Licença.' };
  }

  // 1. Tenta validar primeiro diretamente no banco de dados Supabase na Nuvem
  try {
    const licencaNuvem = await verificarLicencaNuvem(chaveLimpa);
    if (licencaNuvem) {
      if (!licencaNuvem.ativa) {
        return {
          sucesso: false,
          mensagem: 'Esta assinatura está vencida ou suspensa no sistema. Entre em contato para renovar.'
        };
      }
      return {
        sucesso: true,
        mensagem: licencaNuvem.tipo === 'vitalicio'
          ? 'Licença Vitalícia verificada e ativada na nuvem com sucesso!'
          : `Assinatura confirmada na nuvem! Válida por ${licencaNuvem.diasRestantes} dias.`,
        licenca: licencaNuvem
      };
    }
  } catch (e) {
    console.log('Verificação na nuvem indisponível, usando chaves locais/env.');
  }

  // 2. Verifica se é uma chave mestre pré-configurada no .env ou de fábrica
  const mestre = CHAVES_MESTRAS[chaveLimpa];
  const agora = new Date();

  if (mestre) {
    let dataExpiracao: string | null = null;
    if (mestre.diasValidade) {
      const exp = new Date();
      exp.setDate(exp.getDate() + mestre.diasValidade);
      dataExpiracao = exp.toISOString();
    }

    const novaLicenca: LicencaInfo = {
      ativa: true,
      tipo: mestre.tipo,
      chave: chaveLimpa,
      titular: nomeTitular?.trim() || mestre.titular,
      dataAtivacao: agora.toISOString(),
      dataExpiracao,
      diasRestantes: mestre.diasValidade || undefined
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLicenca));
    return {
      sucesso: true,
      mensagem: mestre.tipo === 'vitalicio'
        ? 'Licença Vitalícia ativada com sucesso! Acesso ilimitado liberado.'
        : `Assinatura ativada com sucesso! Válida por ${mestre.diasValidade} dias.`,
      licenca: novaLicenca
    };
  }

  // 2. Validação Algorítmica de Chaves Geradas:
  // Formato Vitalício: VITA-XXXX-XXXX-XXXX
  // Formato Mensal: MENS-XXXX-XXXX-XXXX
  if (chaveLimpa.startsWith('VITA-') && chaveLimpa.length >= 14) {
    const novaLicenca: LicencaInfo = {
      ativa: true,
      tipo: 'vitalicio',
      chave: chaveLimpa,
      titular: nomeTitular?.trim() || 'Licença Vitalícia',
      dataAtivacao: agora.toISOString(),
      dataExpiracao: null
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLicenca));
    return {
      sucesso: true,
      mensagem: 'Licença Vitalícia verificada e ativada com sucesso!',
      licenca: novaLicenca
    };
  }

  if (chaveLimpa.startsWith('MENS-') && chaveLimpa.length >= 14) {
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    const novaLicenca: LicencaInfo = {
      ativa: true,
      tipo: 'mensal',
      chave: chaveLimpa,
      titular: nomeTitular?.trim() || 'Assinatura Mensal',
      dataAtivacao: agora.toISOString(),
      dataExpiracao: exp.toISOString(),
      diasRestantes: 30
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLicenca));
    return {
      sucesso: true,
      mensagem: 'Assinatura Mensal de 30 dias ativada com sucesso!',
      licenca: novaLicenca
    };
  }

  return {
    sucesso: false,
    mensagem: 'Chave de licença inválida ou inexistente. Verifique se digitou corretamente ou entre em contato com o suporte.'
  };
};

// Desativar / Remover licença (para testes ou troca de chave)
export const revogarLicenca = () => {
  localStorage.removeItem(STORAGE_KEY);
};
