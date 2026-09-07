// Service Worker para PWA (Sheila Santos Agenda)
const CACHE_NAME = 'sheila-santos-cache-v4';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => console.log('Cache addAll error:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Não intercepta chamadas de API externas ou Supabase
  if (
    event.request.url.includes('supabase.co') || 
    event.request.url.includes('facebook.com') ||
    event.request.url.includes('wa.me')
  ) {
    return;
  }

  // Para navegação de páginas (HTML): SEMPRE tenta a rede primeiro
  // Isso garante que o celular nunca fique travado em tela branca ou versão antiga
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Para outros assets: tenta a rede com fallback para o cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Abertura/foco do app quando o usuário clica na notificação do topo do celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Suporte a mensagens do app para disparar notificações na Notification Tray / Shade
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'Sheila Santos Nails', {
      body: options?.body || '',
      icon: options?.icon || '/logo.png',
      badge: options?.badge || '/logo.png',
      vibrate: options?.vibrate || [250, 100, 250],
      tag: options?.tag || 'nail_notif_' + Date.now(),
      renotify: true,
      data: options?.data || {}
    });
  }
});

// Suporte a Web Push (Notificações quando o app estiver fechado)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Sheila Santos Nails', body: event.data.text() };
    }
  }
  const title = data.title || 'Sheila Santos Nails';
  const options = {
    body: data.body || 'Você tem uma nova notificação de agendamento.',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [250, 100, 250],
    data: data
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
