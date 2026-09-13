// Vercel Serverless Function: Envio de Push Notifications via Firebase Cloud Messaging (FCM v1)
// Permite entrega em tempo real mesmo com o aplicativo fechado ou minimizado no Android
import crypto from 'node:crypto';

const FALLBACK_SA_B64 = 'eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InNoZWlsYS1zYW50b3MtbmFpbHMiLCJwcml2YXRlX2tleV9pZCI6IjU3NWU4NTY5N2ZkMTZhYjEwNWM1NzIwZjhmZjI5Mzc1MzNmNDUwMWUiLCJwcml2YXRlX2tleSI6Ii0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZRSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2N3Z2dTakFnRUFBb0lCQVFEcnVNbnBWM2hpeCtGVlxuQW1TYk1mSHBFcnZVcnJEbW81cnE4QTNHclhWd1JyNzJ3WWNBL3BJU05OejNiRmJHSTB1TlB6YVJZZ1prWnd6VlxudnRRNlkyRHhaVmdqYmN2U3I1NGVQMWFDOE9WTWRxUVlkSFhxdGdzMjJSVDlTaE8yUnVCZkFHWHpSRSsvSWtYVVxuQXJHUDFVTG9oTTY5R3lCRi96K3REamZLSEVoVXJyRFF3RVdCMTNIRzlnK0FaeE1mUHFaY1J6YVZlTGU5SDVCUVxuNGtFSnFGR2xvdTFJSElxNnZaZ01oYmFHZ1p1LzU5YllleEpISHFkZkU4cmxUSDlNbjNLOG5yUEVjWUVsUld6S1xuWnJzaS9BWGEzUHlBUEduMWNCd3pxZ1JySW1meTJvL3FVRHJ6NS9kVWRCR1pDbGlTaWdxejFCNUFpL0dMSDJGbFxuVGxReEpIWHJBZ01CQUFFQ2dnRUFiVGtubmM2aEFxeDVWYW1STW5RM0VuZFN2MTdlcTAvOXRZVGI3VVpzbDBUQVxuc1pmRTFZb2Y1djNGc1lQcXhVNlBjSGhzOFhxSldiYUNOUHlDWERlMk1NUnp6WjdQaGVWSUQ5M3JXU3NFSktVSVxucmlnd2h6d3BBQllnYXFrTGJ6ZHlPYkwyaW4wSnNwZlA0VWdLUElwbHdWWGdjYkdEQjh3WkZqZnpVOXc5QzdjdVxuZ00veUdUTFlFZWtJbkx6WnRKWXFjOE8zL2h5RGE4WTkrcEFQU2tNQ1RhY0NxcG9KTzJQaDEvekx1V2crYWYyQlxubGlpTmYrTnlMRnNmUGZyL1psUStjUkl1T1U1RndQUmpoK1V0VjYyemlvcnQ4cDQvSEZaTWU0bG9DMnA0T2ZQQlxubkFMSTJROG1yYnhZQzUvOXpsUVBndzdzS2NKZWlMdVZlRUQvdTRJRFFRS0JnUUQrRWRzb2xOVVpiSW1vL0tVTVxuTEFscWRFcU05a3U1ZG1xVkhjUHN2dElFUnFGZ1c1TCszNG9zY21JT0htZm9SNUJOZnBQRjNCRFVVNzBPYS9CZFxuY2Y2TSt4WEIvU2FpWktET3JMNk9KUy8zRG9pbkd2QUdCdWphZXkrK1Q1eGh0SlRLRnZGYzlDeUJtN01Wekd5L1xuQjJYSDZNRCtYTEMvanJPNXl4Ums4MFR5NFFLQmdRRHRnejliN0d0bWFyZllxNFR3S3YzZlhsSCt3b1R6RkJZZlxuNDdzZGpXUWNRRXowdW5TNW9QQlNoZm92QkxlTXVRK3dnUDVCd0JDTC9ONitmTzZwcitoQXJuZ1FqNzNkdEl0alxuNzhZWHNJSTFGZ29HajJ3b1crZ2pYV1lOcHVWUVlpS0JKWkgydmkvNy9aSEVrc0pDVkpMMWtsUE1takp5QlY5V1xuSW1NUzlNa09Td0tCZ0IwekdDajEwZmYyRFd3cWZSMkZBaUFGOVh0MTR3WVJvZlk1VVljbjl5TWVxdlZVRVBUUlxuNUNOdmtlMWxlVE9zNWR6Q0syR1dCU2toNXB4OXMwWktENk5NU0JmZmJFMUZtMldsWE5FaFhQM2I0Y0N5eTlzbFxuZUNXRCt0eTRjWlNaR0hDUmFuUHdiQjBKTSsvUmFyNFpyNHptSnlnVXB3dWM3dkx2Y0F5YUdOYUJBb0dBT3R2b1xucXE0WEc0VmMxQndGVU1OR3NNRWVEc1ZEenoxdUVpOE1ZdEYwT3JBUW9pRkc1ZTJsUUw0azl0dnpaTE5EMlJqT1xuYVpyZ1B1REdqbXhGZE5XNzk3T0UyNDNUbm9xc2RIS3FJNXJCV2NpQmFZakhZK1VLelNETE5wemlmUjRrc042UFxub3BjVkt4eDJzRUV5Vk4vQ240cklxNDZXNjd5N0dJeGpBd0tZaEtzQ2dZRUFrSjZuVTlIem5JOXdMQnRDaC9YQ1xuRXpwUzh3aVhJNkV6SGFRcmN4VmFJUmYvZkVvZWVVZk5LZEJjY3NFbk1vbkR0REhZWmx1SUpZUUtXVG5PRlhVdVxuMzNHdk1hanoxdHp3VHVnUzZQNXROcDN5NzZ2MGZZQXlUcXVHNEx0OTgxWFhwaFVxTmZMdVZSRFYxbVl6SEVWaFxuak5RcGxvUjZHaG1YbEhYWktveVk5cU09XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLCJjbGllbnRfZW1haWwiOiJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BzaGVpbGEtc2FudG9zLW5haWxzLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiY2xpZW50X2lkIjoiMTAxNTE0ODk4MzIxNzY0MzUyMzY3IiwiYXV0aF91cmkiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsInRva2VuX3VyaSI6Imh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjoiaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vb2F1dGgyL3YxL2NlcnRzIiwiY2xpZW50X3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2ZpcmViYXNlLWFkbWluc2RrLWZic3ZjJTQwc2hlaWxhLXNhbnRvcy1uYWlscy5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInVuaXZlcnNlX2RvbWFpbiI6Imdvb2dsZWFwaXMuY29tIn0=';

const FALLBACK_SUPABASE_URL = Buffer.from('aHR0cHM6Ly9za2R2YXhlemhza2ZzZmhtdmFqdC5zdXBhYmFzZS5jbw==', 'base64').toString();
const FALLBACK_SUPABASE_KEY = Buffer.from('c2JfcHVibGlzaGFibGVfc2R6ZUxCZFFlVWdmWS03c0h3UFc1Z18yVXFaM1JhcA==', 'base64').toString();

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// Obtém o Access Token OAuth2 para chamar a API v1 do Firebase Cloud Messaging
async function obterAccessTokenGoogle(serviceAccount) {
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
    if (!res.ok) return [];
    const json = await res.json();
    const configSalao = json[0]?.config_salao || {};
    return Array.isArray(configSalao.fcm_tokens) ? configSalao.fcm_tokens : [];
  } catch (e) {
    return [];
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
    const { titulo, mensagem, detalhes, agendamentoId, tipo, tokens: tokensInformados } = body;

    let serviceAccount = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (e) {}
    }
    if (!serviceAccount) {
      const decoded = Buffer.from(FALLBACK_SA_B64, 'base64').toString('utf8');
      serviceAccount = JSON.parse(decoded);
    }

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
        titulo: titulo || 'Novo Agendamento 💅',
        mensagem: corpoCompleto,
        agendamentoId,
        tipo
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
