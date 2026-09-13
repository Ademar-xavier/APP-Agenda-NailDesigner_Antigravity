// Vercel Serverless Function: Webhook Oficial da Meta Cloud API (WhatsApp Business)
// Recebe as respostas de cliques dos botões enviados para as clientes e atualiza o Supabase em tempo real!

const FALLBACK_URL = typeof Buffer !== 'undefined'
  ? Buffer.from('aHR0cHM6Ly9za2R2YXhlemhza2ZzZmhtdmFqdC5zdXBhYmFzZS5jbw==', 'base64').toString()
  : '';
const FALLBACK_KEY = typeof Buffer !== 'undefined'
  ? Buffer.from('c2JfcHVibGlzaGFibGVfc2R6ZUxCZFFlVWdmWS03c0h3UFc1Z18yVXFaM1JhcA==', 'base64').toString()
  : '';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || FALLBACK_URL).trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_KEY).trim();
const VERIFY_TOKEN = (process.env.META_VERIFY_TOKEN || '').trim();

const supabaseRest = async (path, options = {}) => {
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

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook da Meta verificado com sucesso no Vercel!');
      return res.status(200).send(String(challenge || 'OK'));
    }
    return res.status(403).send('Token de verificação inválido');
  }

  // 2. Recebimento de mensagens e cliques da cliente (POST Request)
  if (req.method === 'POST') {
    try {
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
                  const actionId = buttonReply.id;
                  console.log(`Resposta de botão recebida: ${actionId} de ${msg.from}`);

                  if (actionId.startsWith('CONFIRMAR_')) {
                    const agendamentoId = actionId.replace('CONFIRMAR_', '');
                    await supabaseRest(`agendamentos?id=eq.${agendamentoId}`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        status: 'confirmado',
                        confirmado_pelo_cliente: true,
                        confirmado_em: new Date().toISOString()
                      })
                    });
                  } else if (actionId.startsWith('CANCELAR_')) {
                    const agendamentoId = actionId.replace('CANCELAR_', '');
                    await supabaseRest(`agendamentos?id=eq.${agendamentoId}`, {
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

      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (e) {
      console.error('Erro no processamento do webhook Meta:', e);
      return res.status(200).json({ status: 'ERROR_LOGGED' });
    }
  }

  return res.status(405).send('Method Not Allowed');
}
