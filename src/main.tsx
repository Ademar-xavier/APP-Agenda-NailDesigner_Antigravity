import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { iniciarProtecaoAntiClone } from './services/securityShield';

// Ativa Escudo de Segurança Cibernética, Anti-Clonagem e Proteção de Código-Fonte
iniciarProtecaoAntiClone();

// Registro do Service Worker para PWA (Instalação no celular e notificações push)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update();
    }).catch((err) => {
      console.log('SW registration failed: ', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
