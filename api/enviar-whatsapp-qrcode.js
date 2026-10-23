// Vercel Serverless Function: Envio de Mensagens via WhatsApp QR Code (Z-API / Evolution API / Gateway Personalizado)
// Permite envio de alertas automáticos sem burocracia do Facebook / Meta

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

function normalizarTelefone(telefone) {
  if (!telefone) return '';
  let limpo = String(telefone).replace(/\D/g, '');
  if (limpo.length === 10 || limpo.length === 11) {
    limpo = '55' + limpo;
  }
  return limpo;
}

// Proteção Anti-SSRF: Bloqueia conexões a redes internas, loopback, metadados da nuvem e esquemas inseguros
function validarUrlDestinoSegura(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    // 1. Exige obrigatoriamente HTTPS
    if (parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();

    // 2. Bloqueia loopback, localhost e link-local (metadados AWS/GCP/Azure)
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '[::1]' ||
      host.startsWith('127.') ||
      host.startsWith('169.254.') || // Cloud Metadata
      host.startsWith('10.') ||      // RFC1918 Private
      host.startsWith('192.168.') || // RFC1918 Private
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) || // RFC1918 Private
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

async function buscarConfigQrCodeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/configuracoes?id=eq.salao_principal&select=config_salao`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json[0]?.config_salao?.qrcode_whatsapp || null;
  } catch (e) {
    return null;
  }
}

// Rate Limiter em memória por IP (máximo 20 envios de WhatsApp por minuto por IP)
const ipRateLimit = new Map();
function verificarRateLimit(ip, limite = 20, janelaMs = 60000) {
  const now = Date.now();
  const registro = ipRateLimit.get(ip) || { count: 0, resetAt: now + janelaMs };
  if (now > registro.resetAt) {
    registro.count = 1;
    registro.resetAt = now + janelaMs;
  } else {
    registro.count++;
  }
  ipRateLimit.set(ip, registro);
  return registro.count <= limite;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-App-Source');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido. Use POST.' });
  }

  // 1. Proteção de Taxa (Rate Limit Anti-Abuso)
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!verificarRateLimit(clientIp, 20, 60000)) {
    return res.status(429).json({ erro: 'Muitas mensagens enviadas em curto período. Aguarde 1 minuto.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { destinatario, mensagem, config: configInformada } = body;

    if (!destinatario || !mensagem) {
      return res.status(400).json({ erro: 'Destinatário e mensagem são obrigatórios.' });
    }

    const telefoneFinal = normalizarTelefone(destinatario);
    if (!/^\d{10,15}$/.test(telefoneFinal)) {
      return res.status(400).json({ erro: 'Formato de telefone inválido.' });
    }

    // Prioriza configuração salva e validada no Supabase
    const cfgBanco = await buscarConfigQrCodeSupabase();
    const cfg = (cfgBanco && cfgBanco.ativo) ? cfgBanco : configInformada;

    if (!cfg || !cfg.ativo) {
      return res.status(200).json({
        sucesso: false,
        mensagem: 'Envio via WhatsApp QR Code desativado ou não configurado.'
      });
    }

    const provedor = cfg.provedor || 'zapi';
    let urlDestino = '';
    let headersRequisicao = { 'Content-Type': 'application/json' };
    let corpoEnvio = {};

    if (provedor === 'zapi') {
      const instancia = (cfg.instancia || '').trim();
      const token = (cfg.token || '').trim();
      if (!instancia || !token) {
        return res.status(400).json({ erro: 'Instância e Token da Z-API são obrigatórios.' });
      }

      urlDestino = cfg.apiUrl && cfg.apiUrl.includes('/send-text')
        ? cfg.apiUrl
        : `https://api.z-api.io/instances/${encodeURIComponent(instancia)}/token/${encodeURIComponent(token)}/send-text`;

      if (cfg.clientToken) {
        headersRequisicao['Client-Token'] = String(cfg.clientToken).trim();
      }

      corpoEnvio = {
        phone: telefoneFinal,
        message: String(mensagem).slice(0, 2000)
      };
    } else if (provedor === 'evolution') {
      const apiUrl = (cfg.apiUrl || '').replace(/\/$/, '').trim();
      const instancia = (cfg.instancia || '').trim();
      const token = (cfg.token || '').trim();

      if (!apiUrl || !instancia) {
        return res.status(400).json({ erro: 'URL da API e Nome da Instância da Evolution API são obrigatórios.' });
      }

      urlDestino = `${apiUrl}/message/sendText/${encodeURIComponent(instancia)}`;
      if (token) {
        headersRequisicao['apikey'] = token;
      }

      corpoEnvio = {
        number: telefoneFinal,
        text: String(mensagem).slice(0, 2000)
      };
    } else {
      const apiUrl = (cfg.apiUrl || '').trim();
      if (!apiUrl) {
        return res.status(400).json({ erro: 'URL do Endpoint é obrigatória para Gateway Personalizado.' });
      }

      urlDestino = apiUrl;
      if (cfg.token) {
        headersRequisicao['Authorization'] = `Bearer ${String(cfg.token).trim()}`;
      }

      corpoEnvio = {
        phone: telefoneFinal,
        number: telefoneFinal,
        message: String(mensagem).slice(0, 2000),
        text: String(mensagem).slice(0, 2000)
      };
    }

    // Validação Anti-SSRF estrita antes de efetuar fetch
    if (!validarUrlDestinoSegura(urlDestino)) {
      return res.status(400).json({
        erro: 'URL de destino inválida ou não permitida. Apenas conexões HTTPS externas seguras são aceitas.'
      });
    }

    // Executa o disparo para o provedor
    const respostaApi = await fetch(urlDestino, {
      method: 'POST',
      headers: headersRequisicao,
      body: JSON.stringify(corpoEnvio)
    });

    const textoResposta = await respostaApi.text().catch(() => '');
    let jsonResposta = {};
    try {
      jsonResposta = JSON.parse(textoResposta);
    } catch (e) {
      jsonResposta = { raw: textoResposta };
    }

    if (!respostaApi.ok) {
      console.warn(`[WhatsApp QR Code] Erro ${respostaApi.status} retornado pelo provedor:`, textoResposta);
      return res.status(200).json({
        sucesso: false,
        status: respostaApi.status,
        mensagem: `O provedor WhatsApp retornou código ${respostaApi.status}. Verifique se a instância está conectada.`,
        detalhes: jsonResposta
      });
    }

    return res.status(200).json({
      sucesso: true,
      status: respostaApi.status,
      mensagem: 'Mensagem de WhatsApp enviada com sucesso via QR Code!',
      dados: jsonResposta
    });
  } catch (err) {
    console.error('[WhatsApp QR Code] Erro interno:', err);
    return res.status(500).json({
      sucesso: false,
      erro: err.message || 'Erro interno ao disparar mensagem via QR Code'
    });
  }
}
