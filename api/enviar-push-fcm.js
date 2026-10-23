// Vercel Serverless Function: Envio de Push Notifications via Firebase Cloud Messaging (FCM v1)
// Permite entrega em tempo real mesmo com o aplicativo fechado ou minimizado no Android
import crypto from 'node:crypto';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Obtém o Access Token OAuth2 para chamar a API v1 do Firebase Cloud Messaging
async function obterAccessTokenGoogle(serviceAccount) {
  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Credenciais de Service Account inválidas.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claim);
  const signature = signer.sign(serviceAccount.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = header + '.' + claim + '.' + signature;

  const postData = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': String(Buffer.byteLength(postData))
    },
    body: postData
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Falha OAuth2 Google (' + res.status + '): ' + txt);
  }

  const json = await res.json();
  return json.access_token;
}

// Dispara mensagem individual para o Google FCM v1
async function enviarMensagemFcmV1(accessToken, projectId, tokenDispositivo, dados) {
  const { titulo, mensagem, agendamentoId, tipo } = dados;

  const payload = {
    message: {
      token: tokenDispositivo,
      notification: {
        title: titulo || 'Sheila Santos Nails 💅',
        body: mensagem || 'Novo alerta de agendamento'
      },
      data: {
        agendamentoId: String(agendamentoId || ''),
        tipo: String(tipo || 'agendamento'),
        titulo: String(titulo || ''),
        mensagem: String(mensagem || '')
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'agendamentos_nail_v2',
          sound: 'default',
          default_sound: true,
          default_vibrate_timings: true,
          notification_priority: 'PRIORITY_MAX',
          visibility: 'PUBLIC',
          icon: 'ic_launcher',
          color: '#C71585'
        }
      }
    }
  };

  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const body = await res.text().catch(() => '');
    return {
      sucesso: res.ok,
      status: res.status,
      token: tokenDispositivo,
      resposta: body
    };
  } catch (err) {
    return {
      sucesso: false,
      status: 500,
      token: tokenDispositivo,
      erro: err.message
    };
  }
}

// Busca os tokens FCM ativos cadastrados na tabela configuracoes do Supabase
async function buscarTokensFcmSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
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
    if (!res.ok) return [];
    const json = await res.json();
    const configSalao = json[0]?.config_salao || {};
    return Array.isArray(configSalao.fcm_tokens) ? configSalao.fcm_tokens : [];
  } catch (e) {
    return [];
  }
}

// Rate Limiter em memória por IP (máximo 15 envios de push por minuto por IP)
const ipRateLimit = new Map();
function verificarRateLimit(ip, limite = 15, janelaMs = 60000) {
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Secret, X-App-Source');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido. Use POST.' });
  }

  // 1. Proteção de Taxa (Rate Limit) por IP
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!verificarRateLimit(clientIp, 15, 60000)) {
    return res.status(429).json({ erro: 'Muitas requisições. Aguarde um momento antes de reenviar notificações.' });
  }

  try {
    // 1. Obtenção Segura da Service Account via Variável de Ambiente
    let serviceAccount = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        console.error('Falha ao analisar FIREBASE_SERVICE_ACCOUNT_JSON:', e);
      }
    }

    if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
      return res.status(503).json({
        erro: 'Configuração do Firebase não encontrada. Defina FIREBASE_SERVICE_ACCOUNT_JSON nas variáveis de ambiente da Vercel.'
      });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { titulo, mensagem, detalhes, agendamentoId, tipo, tokens: tokensInformados } = body;

    let tokens = Array.isArray(tokensInformados) && tokensInformados.length > 0
      ? tokensInformados
      : await buscarTokensFcmSupabase();

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({
        sucesso: false,
        mensagem: 'Nenhum celular registrado com Token FCM no momento.'
      });
    }

    const accessToken = await obterAccessTokenGoogle(serviceAccount);
    const corpoCompleto = `${mensagem || ''}${detalhes ? ' • ' + detalhes : ''}`.trim();

    const envios = await Promise.all(
      tokens.map(token => enviarMensagemFcmV1(accessToken, serviceAccount.project_id, token, {
        titulo: String(titulo || 'Novo Agendamento 💅').slice(0, 100),
        mensagem: String(corpoCompleto).slice(0, 500),
        agendamentoId: String(agendamentoId || '').slice(0, 50),
        tipo: String(tipo || 'agendamento').slice(0, 50)
      }))
    );

    const sucessos = envios.filter(e => e.sucesso).length;

    return res.status(200).json({
      sucesso: sucessos > 0,
      totalEnviados: sucessos,
      totalDispositivos: tokens.length,
      detalhes: envios
    });
  } catch (error) {
    console.error('Erro interno no push FCM:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar notificação' });
  }
}
