import { Capacitor } from '@capacitor/core';

let canalInicializado = false;

export const inicializarCanalNotificacoes = async () => {
  if (canalInicializado || !Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    // Cria canal de alta prioridade para o Android 8+ (heads-up banner no topo + status bar)
    await LocalNotifications.createChannel({
      id: 'agendamentos_nail',
      name: 'Alertas de Agendamentos e Clientes',
      description: 'Notificações em tempo real sobre novos agendamentos, confirmações, cancelamentos e pagamentos',
      importance: 5, // 5 = High/Max: ativa aviso no topo da tela (heads up) e som
      visibility: 1, // 1 = Public: visível na tela de bloqueio e barra de status
      vibration: true,
      lights: true
    });

    // Ouvinte para quando o usuário clicar na notificação da barra de status
    LocalNotifications.addListener('localNotificationActionPerformed', () => {
      try {
        window.focus();
      } catch (e) {}
    });

    canalInicializado = true;
  } catch (e) {
    console.warn('Erro ao inicializar canal de notificações Android:', e);
  }
};

export const solicitarPermissaoNotificacoes = async (): Promise<boolean> => {
  // 1. Capacitor Native (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await inicializarCanalNotificacoes();
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (e) {
      console.warn('Erro ao solicitar permissao no Capacitor LocalNotifications:', e);
    }
  }

  // 2. Web / PWA (Browser Notification API)
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
  } catch (e) {
    console.warn('Erro ao solicitar permissao de notificacoes Web:', e);
  }

  return false;
};

export const dispararNotificacaoBarraStatus = async (
  titulo: string, 
  mensagem: string, 
  detalhes?: string, 
  agendamentoId?: string
) => {
  const corpo = `${mensagem}${detalhes ? ' • ' + detalhes : ''}`.trim();

  // 1. Prioridade 1: Android Nativo (Capacitor) -> Barra de Notificações / Central de Notificações do Topo
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await inicializarCanalNotificacoes();

      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('Permissão de exibição não concedida no Android');
        }
      }

      // Disparo imediato sem agendamento no AlarmManager para exibição instantânea no topo
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 899999) + 100000,
            title: titulo,
            body: corpo,
            channelId: 'agendamentos_nail',
            extra: { agendamentoId }
          }
        ]
      });
      return;
    } catch (err) {
      console.warn('Falha no LocalNotifications nativo:', err);
    }
  }

  // 2. Prioridade 2: Service Worker (PWA Mobile no Android Chrome / iOS Safari)
  // No Android móvel PWA, o construtor `new Notification(...)` é bloqueado; DEVE-SE usar `registration.showNotification`
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | undefined>((resolve) => setTimeout(() => resolve(undefined), 800))
      ]) || await navigator.serviceWorker.getRegistration();

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(titulo, {
          body: corpo,
          icon: './logo.png?v=3',
          badge: './logo.png?v=3',
          vibrate: [250, 100, 250],
          tag: agendamentoId ? `nail_${agendamentoId}` : `nail_${Date.now()}`,
          renotify: true,
          data: {
            agendamentoId,
            url: window.location.origin
          }
        } as any);
        return;
      }
    }
  } catch (err) {
    console.warn('Falha no ServiceWorker showNotification:', err);
  }

  // 3. Prioridade 3: Desktop Web / Electron fallback
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, {
        body: corpo,
        icon: './logo.png?v=3',
        badge: './logo.png?v=3'
      });
    }
  } catch (err) {
    console.warn('Falha no Notification construtor Desktop:', err);
  }
};
