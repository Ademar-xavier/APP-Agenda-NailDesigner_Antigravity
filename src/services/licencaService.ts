import { supabase } from './supabase';
import { gerarHashSeguro } from './securityShield';

export interface LicencaInfo {
  ativa: boolean;
  tipo: 'vitalicio' | 'mensal' | 'teste';
  chave: string;
  titular: string;
  dataAtivacao: string;
  dataExpiracao: string | null; // null se vitalício
  diasRestantes?: number;
  sig?: string; // Assinatura de integridade anti-tampering
}

const STORAGE_KEY = 'nail_app_licenca_ativa_v1';

// Chaves de Licença configuradas opcionalmente via arquivo de ambiente (.env) para testes locais
const ENV_KEY_VITALICIO = (import.meta.env.VITE_LICENSE_KEY_VITALICIO || '').trim().toUpperCase();
const ENV_KEY_MENSAL = (import.meta.env.VITE_LICENSE_KEY_MENSAL || '').trim().toUpperCase();

// Gera assinatura de integridade criptográfica para a licença salva no aparelho (anti-tampering)
const assinarLicenca = (info: LicencaInfo): string => {
  return gerarHashSeguro(`${info.chave}#${info.tipo}#${info.titular}#${info.dataAtivacao}#${info.dataExpiracao || 'none'}`);
};

// Obter dados da licença atual gravada no aparelho com verificação de integridade
export const obterLicencaAtual = (): LicencaInfo | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const info: LicencaInfo = JSON.parse(raw);

    // Verificação de Integridade Criptográfica (Bloqueia tentativas de invasão via localStorage)
    const assinaturaEsperada = assinarLicenca(info);
    if (info.sig && info.sig !== assinaturaEsperada) {
      // Violação de segurança detectada: alguém tentou forjar a licença!
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

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

    infoAtualizada.sig = assinarLicenca(infoAtualizada);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(infoAtualizada));
    return infoAtualizada;
  } catch (e) {
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

// Validar e Ativar uma Chave (Verifica tanto na Nuvem Supabase quanto nas Chaves Oficiais)
export const ativarChaveLicenca = async (
  chaveDigitada: string, 
  nomeTitular?: string
): Promise<{ sucesso: boolean; mensagem: string; licenca?: LicencaInfo }> => {
  const chaveLimpa = chaveDigitada.trim().toUpperCase();

  if (!chaveLimpa) {
    return { sucesso: false, mensagem: 'Por favor, digite a sua Chave de Licença.' };
  }

  // 1. Validação na Nuvem Oficial Supabase
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
  } catch (e) {}

  // 2. Ambiente de Desenvolvimento Local (apenas se configurado explicitamente no .env)
  if (ENV_KEY_VITALICIO && chaveLimpa === ENV_KEY_VITALICIO) {
    const agora = new Date();
    const novaLicenca: LicencaInfo = {
      ativa: true,
      tipo: 'vitalicio',
      chave: chaveLimpa,
      titular: nomeTitular?.trim() || 'Desenvolvedor / Administrador',
      dataAtivacao: agora.toISOString(),
      dataExpiracao: null
    };

    novaLicenca.sig = assinarLicenca(novaLicenca);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLicenca));
    return {
      sucesso: true,
      mensagem: 'Licença de desenvolvimento ativada com sucesso!',
      licenca: novaLicenca
    };
  }

  return {
    sucesso: false,
    mensagem: 'Chave de licença inválida ou não encontrada no sistema. Verifique a digitação ou entre em contato com o suporte.'
  };
};

// Desativar / Remover licença
export const revogarLicenca = () => {
  localStorage.removeItem(STORAGE_KEY);
};
