import type { Database } from '../types'
import { gerarSeed } from './seed'

const STORAGE_KEY = 'nail-agenda:db:v1'
const AUTH_KEY = 'nail-agenda:auth:v1'

export function carregarBanco(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Database
  } catch {
    // dados corrompidos: recria a partir da semente
  }
  const seed = gerarSeed()
  salvarBanco(seed)
  return seed
}

export function salvarBanco(db: Database) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function resetarBanco(): Database {
  const seed = gerarSeed()
  salvarBanco(seed)
  return seed
}

export interface SessaoAuth {
  usuarioId: string
}

export function carregarSessao(): SessaoAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as SessaoAuth) : null
  } catch {
    return null
  }
}

export function salvarSessao(sessao: SessaoAuth | null) {
  if (sessao) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessao))
  } else {
    localStorage.removeItem(AUTH_KEY)
  }
}
