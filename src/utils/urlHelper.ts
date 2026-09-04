/**
 * Utilitário central de URLs do sistema Sheila Santos Nails
 * Suporta detecção automática de ambiente (Web Netlify, localhost, Capacitor e Electron)
 */

export const getBaseAppUrl = (): string => {
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return window.location.origin;
  }
  // Fallback para aplicativos instalados nativos (Capacitor / Electron com file://)
  return 'https://sheilasantos-agenda.vercel.app';
};

/**
 * Gera a URL da Página Pública de Confirmação em 1 Toque
 */
export const getConfirmationUrl = (agendamentoId: string): string => {
  const base = getBaseAppUrl();
  return `${base}/#confirmar?id=${agendamentoId}`;
};

/**
 * Gera a URL da Página Pública de Auto-Agendamento
 */
export const getBookingUrl = (): string => {
  const base = getBaseAppUrl();
  return `${base}/#agendar`;
};

/**
 * Gera o link direto para adicionar o agendamento ao Google Calendar
 */
export const gerarLinkGoogleCalendar = (params: {
  titulo: string;
  dataInicioIso: string;
  duracaoMinutos?: number;
  descricao?: string;
  local?: string;
}): string => {
  try {
    let ano = 0, mes = 0, dia = 0, hora = 0, minuto = 0;

    // Extrai ano, mês, dia, hora e minuto diretamente dos dígitos para garantir o horário nominal do salão
    const match = params.dataInicioIso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      ano = parseInt(match[1], 10);
      mes = parseInt(match[2], 10) - 1;
      dia = parseInt(match[3], 10);
      hora = parseInt(match[4], 10);
      minuto = parseInt(match[5], 10);
    } else {
      const d = new Date(params.dataInicioIso);
      ano = d.getFullYear();
      mes = d.getMonth();
      dia = d.getDate();
      hora = d.getHours();
      minuto = d.getMinutes();
    }

    const dataInicio = new Date(ano, mes, dia, hora, minuto, 0);
    const duracao = params.duracaoMinutos || 60;
    const dataFim = new Date(dataInicio.getTime() + duracao * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatGCalDate = (d: Date) => {
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    };

    const inicioStr = formatGCalDate(dataInicio);
    const fimStr = formatGCalDate(dataFim);

    const titulo = encodeURIComponent(params.titulo || 'Atendimento Sheila Santos Nails');
    const detalhes = encodeURIComponent(params.descricao || 'Atendimento agendado com Sheila Santos Nails.');
    const local = encodeURIComponent(params.local || 'Sheila Santos Nails');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${inicioStr}/${fimStr}&details=${detalhes}&location=${local}&ctz=America/Sao_Paulo`;
  } catch (e) {
    return 'https://calendar.google.com';
  }
};

/**
 * Normaliza número de telefone para formato aceito pelo WhatsApp
 */
export const formatarNumeroWhatsApp = (telefone?: string): string => {
  if (!telefone) return '';
  let limpo = telefone.replace(/\D/g, '').replace(/^0+/, '');
  if (!limpo) return '';
  if (limpo.startsWith('55') && limpo.length >= 12) {
    return limpo;
  }
  return '55' + limpo;
};

/**
 * Gera URL segura para WhatsApp (retorna vazio se o telefone for inválido para evitar tela branca do WhatsApp)
 * Utiliza api.whatsapp.com diretamente para evitar o bug de redirecionamento do wa.me que corrompe emojis UTF-8 em 
 */
export const gerarLinkWhatsApp = (telefone?: string, mensagem: string = ''): string => {
  const numero = formatarNumeroWhatsApp(telefone);
  // Se não tiver pelo menos 10 dígitos (DDD + número) após adicionar 55 (ou seja, total >= 12)
  if (!numero || numero.length < 12) return '';
  return `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensagem)}`;
};

/**
 * Preenche templates de WhatsApp substituindo TODAS as ocorrências de tags dinâmicas ({cliente}, {servico}, etc.)
 */
export const preencherTemplateWhatsApp = (
  template: string,
  variaveis: Record<string, string | number | undefined | null>
): string => {
  if (!template) return '';
  let resultado = template;

  // Substitui cada variável em todas as posições do texto
  for (const [chave, valor] of Object.entries(variaveis)) {
    if (valor !== undefined && valor !== null) {
      const regex = new RegExp(`\\{${chave}\\}`, 'gi');
      resultado = resultado.replace(regex, String(valor));
    }
  }

  return resultado;
};
