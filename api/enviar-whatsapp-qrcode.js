// Vercel Serverless Function: Envio de Mensagens via WhatsApp QR Code (Z-API / Evolution API / Gateway Personalizado)
// Permite envio de alertas automáticos sem burocracia do Facebook / Meta

const FALLBACK_SUPABASE_URL = Buffer.from('aHR0cHM6Ly9za2R2YXhlemhza2ZzZmhtdmFqdC5zdXBhYmFzZS5jbw==', 'base64').toString();
const FALLBACK_SUPABASE_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfc2R6ZUxCZFFlVWdmWS03c0h3UFc1Z18yVXFaM1JhcA==', 'base64').toString();

function normalizarTelefone(telefone) {
  if (!telefone) return '';
  let limpo = String(telefone).replace(/\D/g, '');
  if (limpo.length === 10 || limpo.length === 11) {
    limpo = '55' + limpo;
  }
  return limpo;
}

async function buscarConfigQrCodeSupabase() {
  const url = `${FALLBACK_SUPABASE_URL}/rest/v1/configuracoes?id=eq.salao_principal&select=config_salao`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': FALLBACK_SUPABASE_KEY,
        'Authorization': 'Bearer ' + FALLBACK_SUPABASE_KEY,
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { destinatario, mensagem, config: configInformada } = body;

    if (!destinatario || !mensagem) {
      return res.status(400).json({ erro: 'Destinatário e mensagem são obrigatórios.' });
    }

    const cfg = configInformada && (configInformada.instancia || configInformada.apiUrl)
      ? configInformada
      : await buscarConfigQrCodeSupabase();

    if (!cfg || !cfg.ativo) {
      return res.status(200).json({
        sucesso: false,
        mensagem: 'Envio via WhatsApp QR Code desativado ou não configurado.'
      });
    }

    const telefoneFinal = normalizarTelefone(destinatario);
    const provedor = cfg.provedor || 'zapi';

    let urlDestino = '';
    let headersRequisicao = { 'Content-Type': 'application/json' };
    let corpoEnvio = {};

    if (provedor === 'zapi') {
      // Z-API (Gateway Líder em QR Code no Brasil)
      const instancia = (cfg.instancia || '').trim();
      const token = (cfg.token || '').trim();
      if (!instancia || !token) {
        return res.status(400).json({ erro: 'Instância e Token da Z-API são obrigatórios.' });
      }

      urlDestino = cfg.apiUrl && cfg.apiUrl.includes('/send-text')
        ? cfg.apiUrl
        : `https://api.z-api.io/instances/${instancia}/token/${token}/send-text`;

      if (cfg.clientToken) {
        headersRequisicao['Client-Token'] = cfg.clientToken.trim();
      }

      corpoEnvio = {
        phone: telefoneFinal,
        message: mensagem
      };
    } else if (provedor === 'evolution') {
      // Evolution API (v1 / v2)
      const apiUrl = (cfg.apiUrl || '').replace(/\/$/, '').trim();
      const instancia = (cfg.instancia || '').trim();
      const token = (cfg.token || '').trim();

      if (!apiUrl || !instancia) {
        return res.status(400).json({ erro: 'URL da API e Nome da Instância da Evolution API são obrigatórios.' });
      }

      urlDestino = `${apiUrl}/message/sendText/${instancia}`;
      if (token) {
        headersRequisicao['apikey'] = token;
      }

      corpoEnvio = {
        number: telefoneFinal,
        text: mensagem
      };
    } else {
      // Gateway Genérico / Webhook Personalizado
      const apiUrl = (cfg.apiUrl || '').trim();
      if (!apiUrl) {
        return res.status(400).json({ erro: 'URL do Endpoint é obrigatória para Gateway Personalizado.' });
      }

      urlDestino = apiUrl;
      if (cfg.token) {
        headersRequisicao['Authorization'] = `Bearer ${cfg.token.trim()}`;
      }

      corpoEnvio = {
        phone: telefoneFinal,
        telefone: telefoneFinal,
        number: telefoneFinal,
        message: mensagem,
        text: mensagem,
        mensagem: mensagem
      };
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
        mensagem: `O provedor WhatsApp retornou código ${respostaApi.status}. Verifique se a instância está conectada ao QR Code.`,
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
