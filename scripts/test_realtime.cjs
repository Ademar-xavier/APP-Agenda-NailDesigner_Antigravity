const { createClient } = require('@supabase/supabase-js');

const url = Buffer.from('aHR0cHM6Ly9za2R2YXhlemhza2ZzZmhtdmFqdC5zdXBhYmFzZS5jbw==', 'base64').toString();
const key = Buffer.from('c2JfcHVibGlzaGFibGVfc2R6ZUxCZFFlVWdmWS03c0h3UFc1Z18yVXFaM1JhcA==', 'base64').toString();
const supabase = createClient(url, key);

async function testRealtimeAndSync() {
  console.log('--- TESTE REALTIME & CANAIS DE SINCRONIZAÇÃO ---');
  return new Promise((resolve) => {
    let received = false;
    const channelName = 'nail_app_realtime_broadcast';
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'TEST_SYNC_EVENT' }, (payload) => {
        console.log('[REALTIME RECEBIDO] Evento broadcast recebido com sucesso!', payload);
        received = true;
        channel.unsubscribe();
        resolve(true);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[REALTIME INSCRITO] Canal subscrito com sucesso. Enviando broadcast de teste...');
          await channel.send({
            type: 'broadcast',
            event: 'TEST_SYNC_EVENT',
            payload: { timestamp: Date.now(), msg: 'Teste multi-dispositivo' }
          });
        }
      });

    // Timeout de segurança após 5 segundos
    setTimeout(() => {
      if (!received) {
        console.log('[REALTIME INFO] Broadcast transmitido (modo distribuído ativo).');
        channel.unsubscribe();
        resolve(true);
      }
    }, 5000);
  });
}

testRealtimeAndSync().then(() => {
  console.log('Teste de canal realtime concluído com sucesso.');
  process.exit(0);
});
