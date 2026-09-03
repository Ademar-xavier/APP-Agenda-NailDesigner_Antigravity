// Serviço de Produção para Google Agenda
// Suporta:
// 1. Google OAuth 2.0 via Google Identity Services (GIS)
// 2. Importação direta de arquivo .ics exportado da Google Agenda

export interface EventoGoogleReal {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoNome: string;
  servicoId: string;
  inicio: string; // YYYY-MM-DDTHH:MM:ss
  fim: string;
  periodo: string;
  tituloOriginal: string;
}

const STORAGE_KEY_CLIENT_ID = 'nail_google_client_id';

export const obterGoogleClientId = (): string => {
  return localStorage.getItem(STORAGE_KEY_CLIENT_ID) || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
};

export const salvarGoogleClientId = (clientId: string) => {
  localStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
};

// Extrai nome de cliente inteligente de títulos como:
// "Alongamento - Maria Silva", "Maria Silva (fibra)", "Manutenção Carla Santos 99712-4455"
export const extrairClienteEServico = (summary: string, description: string = '') => {
  let nome = summary.trim();
  let servico = 'Atendimento em Salão';
  let telefone = '';

  // Procura telefone no summary ou description (padrões de 8 a 11 dígitos)
  const foneRegex = /(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}/;
  const matchFone = (description + ' ' + summary).match(foneRegex);
  if (matchFone) {
    telefone = matchFone[0].trim();
  }

  // Se tem separador " - " ou " : "
  if (summary.includes(' - ')) {
    const partes = summary.split(' - ');
    servico = partes[0].trim();
    nome = partes[1].trim();
  } else if (summary.includes(':')) {
    const partes = summary.split(':');
    servico = partes[0].trim();
    nome = partes[1].trim();
  }

  // Limpa números do nome
  nome = nome.replace(foneRegex, '').trim();
  // Se sobrou vazio
  if (!nome) nome = 'Cliente Google Agenda';

  return { nome, servico, telefone };
};

// Converte strings de data do ICS (ex: 20260903T160000Z ou 20260903) para formato ISO local
export const parseIcsDate = (icsDateStr: string): string => {
  if (!icsDateStr) return new Date().toISOString();
  const clean = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
  
  if (clean.length >= 15 && clean.includes('T')) {
    const ano = clean.substring(0, 4);
    const mes = clean.substring(4, 6);
    const dia = clean.substring(6, 8);
    const hora = clean.substring(9, 11);
    const min = clean.substring(11, 13);
    const sec = clean.substring(13, 15);
    return `${ano}-${mes}-${dia}T${hora}:${min}:${sec}`;
  } else if (clean.length >= 8) {
    const ano = clean.substring(0, 4);
    const mes = clean.substring(4, 6);
    const dia = clean.substring(6, 8);
    return `${ano}-${mes}-${dia}T09:00:00`;
  }
  return new Date().toISOString();
};

// Parser de arquivo .ics do Google Agenda
export const parseIcsCalendar = (icsContent: string): EventoGoogleReal[] => {
  const events: EventoGoogleReal[] = [];
  const lines = icsContent.split(/\r\n|\n|\r/);
  let inEvent = false;
  let summary = '';
  let dtstart = '';
  let dtend = '';
  let desc = '';
  let uid = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      summary = '';
      dtstart = '';
      dtend = '';
      desc = '';
      uid = '';
    } else if (line.startsWith('END:VEVENT')) {
      if (inEvent && dtstart) {
        const { nome, servico, telefone } = extrairClienteEServico(summary, desc);
        const inicioIso = parseIcsDate(dtstart);
        const fimIso = dtend ? parseIcsDate(dtend) : '';
        const horaNum = parseInt(inicioIso.split('T')[1]?.substring(0, 2) || '12', 10);

        events.push({
          id: uid || 'ics_' + Math.random().toString(36).substring(2, 9),
          clienteNome: nome,
          clienteTelefone: telefone,
          servicoNome: servico,
          servicoId: 's1',
          inicio: inicioIso,
          fim: fimIso,
          periodo: horaNum < 12 ? 'manhã' : 'tarde',
          tituloOriginal: summary || 'Compromisso da Google Agenda'
        });
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        dtstart = line;
      } else if (line.startsWith('DTEND')) {
        dtend = line;
      } else if (line.startsWith('DESCRIPTION:')) {
        desc = line.substring(12);
      } else if (line.startsWith('UID:')) {
        uid = line.substring(4);
      }
    }
  }

  return events;
};

// Busca eventos reais da API oficial do Google Calendar v3
export const buscarEventosReaisGoogleApi = async (accessToken: string): Promise<EventoGoogleReal[]> => {
  const agora = new Date();
  agora.setMonth(agora.getMonth() - 1); // Traz desde o mês passado até o futuro
  const timeMin = agora.toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=250`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Erro ${response.status} ao conectar à Google Calendar API`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item: any) => {
    const rawStart = item.start?.dateTime || item.start?.date || '';
    const rawEnd = item.end?.dateTime || item.end?.date || '';
    const summary = item.summary || 'Atendimento Sem Título';
    const desc = item.description || '';

    const { nome, servico, telefone } = extrairClienteEServico(summary, desc);
    const inicioIso = rawStart.includes('T') ? rawStart.substring(0, 19) : `${rawStart}T09:00:00`;
    const fimIso = rawEnd.includes('T') ? rawEnd.substring(0, 19) : `${rawEnd}T10:00:00`;
    const horaNum = parseInt(inicioIso.split('T')[1]?.substring(0, 2) || '12', 10);

    return {
      id: item.id,
      clienteNome: nome,
      clienteTelefone: telefone,
      servicoNome: servico,
      servicoId: 's1',
      inicio: inicioIso,
      fim: fimIso,
      periodo: horaNum < 12 ? 'manhã' : 'tarde',
      tituloOriginal: summary
    };
  });
};