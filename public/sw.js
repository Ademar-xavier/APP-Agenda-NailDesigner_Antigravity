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
