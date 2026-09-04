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
    const dataInicio = new Date(params.dataInicioIso);
    const duracao = params.duracaoMinutos || 60;
    const dataFim = new Date(dataInicio.getTime() + duracao * 60 * 1000);

    const formatGCalDate = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const inicioStr = formatGCalDate(dataInicio);
    const fimStr = formatGCalDate(dataFim);

    const titulo = encodeURIComponent(params.titulo || 'Atendimento Sheila Santos Nails');
    const detalhes = encodeURIComponent(params.descricao || 'Atendimento agendado com Sheila Santos Nails.');
    const local = encodeURIComponent(params.local || 'Sheila Santos Nails');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${inicioStr}/${fimStr}&details=${detalhes}&location=${local}`;
  } catch (e) {
    return 'https://calendar.google.com';
  }
};
