// Netlify Serverless Function: Webhook Oficial da Meta Cloud API (WhatsApp Business)
// Recebe as respostas de cliques dos botões enviados para as clientes e atualiza o Supabase em tempo real!

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://skdvaxezhskfsfhmvajt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_sdzeLBdQeUgfY-7sHwPW5g_2UqZ3Rap';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'sheila_nail_webhook_secret';

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

export const handler = async (event) => {
  // 1. Verificação inicial da Meta (GET Request com hub.mode, hub.verify_token e hub.challenge)
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook da Meta verificado com sucesso!');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: String(challenge || 'OK')
      };
    }
    return { statusCode: 403, body: 'Token de verificação inválido' };
  }

  // 2. Recebimento de mensagens e cliques da cliente (POST Request)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        const fromNumber = message.from; // Número de telefone da cliente

        // Verifica se a cliente clicou em um botão interativo oficial da Meta
        if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
          const buttonId = message.interactive.button_reply?.id;
          console.log(`Cliente ${fromNumber} clicou no botão: ${buttonId}`);

          if (buttonId?.includes('confirmar')) {
            const agendamentoId = buttonId.replace('confirmar_', '').replace('btn_', '');

            if (agendamentoId && agendamentoId !== 'teste') {
              await supabaseRest(`agendamentos?id=eq.${agendamentoId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'confirmado' })
              });
            } else {
              const ultimos8 = fromNumber.slice(-8);
              const clientes = await supabaseRest(`clientes?telefone=ilike.*${ultimos8}*&select=id`);
              if (clientes && clientes.length > 0) {
                await supabaseRest(`agendamentos?cliente_id=eq.${clientes[0].id}&status=eq.pendente`, {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'confirmado' })
                });
              }
            }
          } else if (buttonId?.includes('cancelar')) {
            const agendamentoId = buttonId.replace('cancelar_', '').replace('btn_', '');
            if (agendamentoId && agendamentoId !== 'teste') {
              await supabaseRest(`agendamentos?id=eq.${agendamentoId}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                  status: 'cancelado', 
                  motivo_cancelamento: 'Cancelado pela cliente via WhatsApp Oficial' 
                })
              });
            }
          }
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'EVENT_RECEIVED' })
      };
    } catch (e) {
      console.error('Erro no processamento do webhook Meta:', e);
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ERROR_LOGGED', error: e.message })
      };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
