// Vercel Serverless Function: Webhook Oficial da Meta Cloud API (WhatsApp Business)
// Recebe as respostas de cliques dos botões enviados para as clientes e atualiza o Supabase em tempo real!
import crypto from 'node:crypto';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const VERIFY_TOKEN = (process.env.META_VERIFY_TOKEN || '').trim();
const APP_SECRET = (process.env.META_APP_SECRET || '').trim();

const supabaseRest = async (path, options = {}) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };
  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`Erro Supabase REST ${res.status}:`, txt);
      return null;
    }
    return await res.json().catch(() => null);
  } catch (err) {
    console.error('Erro na chamada Supabase REST:', err);
    return null;
  }
};

export default async function handler(req, res) {
  // 1. Verificação inicial da Meta (GET Request com hub.mode, hub.verify_token e hub.challenge)
  if (req.method === 'GET') {
    const query = req.query || {};
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
      console.log('Webhook da Meta verificado com sucesso no Vercel!');
      return res.status(200).send(String(challenge || 'OK'));
    }
    return res.status(403).send('Token de verificação inválido');
  }

  // 2. Recebimento de mensagens e cliques da cliente (POST Request)
  if (req.method === 'POST') {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});

      // Validação Criptográfica da Assinatura HMAC SHA256 enviada pela Meta
      if (APP_SECRET) {
        const signature = req.headers['x-hub-signature-256'];
        if (!signature || typeof signature !== 'string') {
          console.warn('Webhook Meta rejeitado: Assinatura X-Hub-Signature-256 ausente.');
          return res.status(401).json({ erro: 'Assinatura X-Hub-Signature-256 ausente.' });
        }

        const expectedSignature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          console.warn('Webhook Meta rejeitado: Assinatura HMAC SHA-256 inválida.');
          return res.status(401).json({ erro: 'Assinatura HMAC SHA-256 inválida.' });
        }
      }

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value;
            if (value && value.messages && value.messages.length > 0) {
              const msg = value.messages[0];

              // Identifica resposta interativa de botão
              if (msg.type === 'interactive' && msg.interactive) {
                const buttonReply = msg.interactive.button_reply;
                if (buttonReply) {
                  const actionId = String(buttonReply.id || '');
                  console.log(`Resposta de botão recebida: ${actionId} de ${msg.from}`);

                  // Sanitização do ID de agendamento (somente caracteres alfanuméricos e underscores)
                  const extrairIdSeguro = (prefixo) => {
                    const idBruto = actionId.replace(prefixo, '');
                    return idBruto.replace(/[^a-zA-Z0-9_-]/g, '');
                  };

                  if (actionId.startsWith('CONFIRMAR_')) {
                    const agendamentoId = extrairIdSeguro('CONFIRMAR_');
                    if (agendamentoId) {
                      await supabaseRest(`agendamentos?id=eq.${encodeURIComponent(agendamentoId)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                          status: 'confirmado',
                          confirmado_pelo_cliente: true,
                          confirmado_em: new Date().toISOString()
                        })
                      });
                    }
                  } else if (actionId.startsWith('CANCELAR_')) {
                    const agendamentoId = extrairIdSeguro('CANCELAR_');
                    if (agendamentoId) {
                      await supabaseRest(`agendamentos?id=eq.${encodeURIComponent(agendamentoId)}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                          status: 'cancelado',
                          motivo_cancelamento: 'Cancelado pela cliente via WhatsApp'
                        })
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }

      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (e) {
      console.error('Erro no processamento do webhook Meta:', e);
      return res.status(200).json({ status: 'ERROR_LOGGED' });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
