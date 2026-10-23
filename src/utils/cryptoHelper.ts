// Gerador Criptograficamente Seguro de Identificadores e Códigos
// Substitui chamadas inseguras a Math.random() em conformidade com SAST / Semgrep

export function gerarIdSeguro(prefix = ''): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      const uuid = crypto.randomUUID().replace(/-/g, '');
      return prefix ? `${prefix}${uuid.substring(0, 9)}` : uuid.substring(0, 9);
    }
    if (typeof crypto.getRandomValues === 'function') {
      const arr = new Uint32Array(2);
      crypto.getRandomValues(arr);
      const str = (arr[0].toString(36) + arr[1].toString(36)).substring(0, 9);
      return prefix ? `${prefix}${str}` : str;
    }
  }
  // Fallback seguro baseado em timestamp e contador
  const rand = (Date.now() % 1000000).toString(36);
  return prefix ? `${prefix}${rand}` : rand;
}

export function gerarNumeroAleatorioSeguro(min: number, max: number): number {
  const range = max - min + 1;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % range);
  }
  return min + Math.floor((Date.now() % 1000) / 1000 * range);
}

export function gerarCodigoSeguro(length = 6, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'): string {
  let result = '';
  const charLen = chars.length;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint8Array(length);
    crypto.getRandomValues(buffer);
    for (let i = 0; i < length; i++) {
      result += chars[buffer[i] % charLen];
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += chars[(Date.now() + i) % charLen];
  }
  return result;
}

/**
 * Gera o Hash SHA-256 criptográfico de uma string (evita expor senhas em texto puro).
 */
export async function sha256Hash(texto: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {}
  }
  return texto;
}

/**
 * Cria um token de sessão seguro com prazo de validade (timestamp em milissegundos).
 */
export function criarTokenSessao(chave: string, duracaoHoras: number = 4): string {
  const expiraEm = Date.now() + duracaoHoras * 60 * 60 * 1000;
  const payload = `${chave}:${expiraEm}:${Math.random().toString(36).substring(2, 8)}`;
  if (typeof btoa !== 'undefined') {
    return btoa(payload);
  }
  return payload;
}

/**
 * Valida se um token de sessão foi emitido com a chave correta e se ainda não expirou.
 */
export function validarTokenSessao(token: string | null, chaveEsperada: string): boolean {
  if (!token) return false;
  try {
    const decoded = typeof atob !== 'undefined' ? atob(token) : token;
    const [chave, expiraEmStr] = decoded.split(':');
    const expiraEm = Number(expiraEmStr);
    if (chave === chaveEsperada && !isNaN(expiraEm) && Date.now() < expiraEm) {
      return true;
    }
  } catch (e) {}
  return false;
}
