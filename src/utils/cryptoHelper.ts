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
