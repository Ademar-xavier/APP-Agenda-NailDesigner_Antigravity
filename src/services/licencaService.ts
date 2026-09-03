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

// Chaves de Licença configuradas no arquivo .env
const ENV_KEY_VITALICIO = (import.meta.env.VITE_LICENSE_KEY_VITALICIO || 'SHEILA-VIP-2026').trim().toUpperCase();
const ENV_KEY_MENSAL = (import.meta.env.VITE_LICENSE_KEY_MENSAL || 'SHEILA-MENSAL-2026').trim().toUpperCase();

// Chaves Oficiais Pré-cadastradas para Entrega Rápida
const CHAVES_MESTRAS: { [key: string]: { tipo: 'vitalicio' | 'mensal' | 'teste'; titular: string; diasValidade?: number } } = {
  [ENV_KEY_VITALICIO]: { tipo: 'vitalicio', titular: 'Sheila Santos' },
  [ENV_KEY_MENSAL]: { tipo: 'mensal', titular: 'Assinatura Mensal', diasValidade: 30 },
  'SHEILA-VIP-2026': { tipo: 'vitalicio', titular: 'Sheila Santos' },
  'SHEILA-VITALICIO-2026': { tipo: 'vitalicio', titular: 'Sheila Santos Nails Designer' },
  'ADEMAR-ADMIN-VITA': { tipo: 'vitalicio', titular: 'Ademar Xavier' },
  'NAIL-PRO-VITALICIO': { tipo: 'vitalicio', titular: 'Licença Vitalícia Profissional' },
  'NAIL-MENSAL-30': { tipo: 'mensal', titular: 'Assinatura Mensal', diasValidade: 30 }
};

// Gera assinatura de integridade para a licença
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

    novaLicenca.sig = assinarLicenca(novaLicenca);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLicenca));
    return {
      sucesso: true,
      mensagem: mestre.tipo === 'vitalicio'
        ? 'Licença Vitalícia ativada com sucesso! Acesso ilimitado liberado.'
        : `Assinatura ativada com sucesso! Válida por ${mestre.diasValidade} dias.`,
      licenca: novaLicenca
    };
  }

  // 3. Validação Criptográfica de Chaves Geradas:
  // Formato: PREFIXO-CORPO-CHECKSUM (onde CHECKSUM é a assinatura criptográfica do corpo)
  const partes = chaveLimpa.split('-');
  if (partes.length >= 3) {
    const prefixo = partes[0];
    const checksumFornecido = partes[partes.length - 1];
    const corpo = partes.slice(0, partes.length - 1).join('-');
    const checksumCalculado = gerarHashSeguro(corpo).substring(0, 4);

    if (checksumFornecido === checksumCalculado) {
      const isVitalicio = prefixo === 'VITA' || prefixo === 'VIP';
      const dias = isVitalicio ? undefined : 30;
      let expIso: string | null = null;

      if (!isVitalicio) {
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);
        expIso = exp.toISOString();
      }

      const novaLicenca: LicencaInfo = {
        ativa: true,
        tipo: isVitalicio ? 'vitalicio' : 'mensal',
        chave: chaveLimpa,
        titular: nomeTitular?.trim() || (isVitalicio ? 'Licença Vitalícia' : 'Assinatura Mensal'),
        dataAtivacao: agora.toISOString(),
        dataExpiracao: expIso,
        diasRestantes: dias
      };

      novaLicenca.sig = assinarLicenca(novaLicenca);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLicenca));

      return {
        sucesso: true,
        mensagem: isVitalicio
          ? 'Chave Vitalícia verificada e autenticada com sucesso!'
          : 'Assinatura Mensal de 30 dias ativada com sucesso!',
        licenca: novaLicenca
      };
    }
  }

  return {
    sucesso: false,
    mensagem: 'Chave de licença inválida ou inexistente. Verifique se digitou corretamente ou entre em contato com o suporte.'
  };
};

// Desativar / Remover licença
export const revogarLicenca = () => {
  localStorage.removeItem(STORAGE_KEY);
};
