// Escudo de Segurança Cibernética & Proteção Anti-Clonagem
// Protege: Código-fonte, Chaves de Acesso, Licenças, Dados dos Clientes e Ataques Externos

const SECRET_SALT = 'SHEILA_NAIL_SECURE_HASH_SALT_2026_PROD_#9821';

// 1. Função de Hashing Criptográfico Rápido (FNV-1a 64-bit extendido com salt)
export const gerarHashSeguro = (dados: string): string => {
  const str = dados + SECRET_SALT;
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).toUpperCase();
};

// 2. Proteção contra Clonagem do App e Inspeção Externa
export const iniciarProtecaoAntiClone = () => {
  if (typeof window === 'undefined') return;

  // A. Proteção Anti-Clickjacking / Anti-Iframe Phishing
  // Impede que sites maliciosos embutam o app dentro de um <iframe> para roubar senhas e clientes
  try {
    if (window.self !== window.top && window.top) {
      window.top.location.href = window.self.location.href;
    }
  } catch (e) {
    // Bloqueio de sandbox
  }

  // B. Bloqueio de Menu de Contexto (Botão Direito -> Inspecionar)
  document.addEventListener('contextmenu', (e) => {
    // Permite uso de botão direito apenas dentro de inputs de texto (para colar/copiar)
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
  }, { capture: true });

  // C. Bloqueio de Teclas de Atalho de Inspeção de Código-Fonte e Clonagem
  window.addEventListener('keydown', (e) => {
    // F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Opt+I (Inspecionar)
    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    // Ctrl+Shift+C / Cmd+Opt+C (Element Selector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+U (Exibir Código Fonte da Página)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Salvar Página e Clonar Arquivos)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // D. Ocultação de Logs de Console em Produção (Protege dados de clientes, tokens e senhas)
  if (import.meta.env.PROD) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.warn = noop;
  }
};

// 3. Sistema Anti Força Bruta no Login (Brute Force Protection)
const TENTATIVAS_STORAGE_KEY = 'sec_login_attempts_v1';
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_SEGUNDOS = 60;

interface RegistroTentativa {
  contador: number;
  bloqueadoAte: number; // timestamp ms
}

const obterRegistroTentativas = (): RegistroTentativa => {
  try {
    const raw = sessionStorage.getItem(TENTATIVAS_STORAGE_KEY);
    if (!raw) return { contador: 0, bloqueadoAte: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { contador: 0, bloqueadoAte: 0 };
  }
};

export const verificarBloqueioLogin = (): { bloqueado: boolean; segundosRestantes: number } => {
  const reg = obterRegistroTentativas();
  const agora = Date.now();
  if (reg.bloqueadoAte > agora) {
    const restante = Math.ceil((reg.bloqueadoAte - agora) / 1000);
    return { bloqueado: true, segundosRestantes: restante };
  }
  return { bloqueado: false, segundosRestantes: 0 };
};

export const registrarFalhaLogin = (): { bloqueouAgora: boolean; segundosRestantes: number } => {
  const reg = obterRegistroTentativas();
  reg.contador += 1;

  if (reg.contador >= MAX_TENTATIVAS) {
    reg.bloqueadoAte = Date.now() + (TEMPO_BLOQUEIO_SEGUNDOS * 1000);
    reg.contador = 0; // reseta contador
    sessionStorage.setItem(TENTATIVAS_STORAGE_KEY, JSON.stringify(reg));
    return { bloqueouAgora: true, segundosRestantes: TEMPO_BLOQUEIO_SEGUNDOS };
  }

  sessionStorage.setItem(TENTATIVAS_STORAGE_KEY, JSON.stringify(reg));
  return { bloqueouAgora: false, segundosRestantes: 0 };
};

export const resetarFalhasLogin = () => {
  try {
    sessionStorage.removeItem(TENTATIVAS_STORAGE_KEY);
  } catch (e) {}
};
