import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { carregarSessao, salvarSessao } from '../lib/storage'
import { useAppData } from './AppDataContext'
import type { Usuario } from '../types'

interface AuthContextValue {
  usuario: Usuario | null
  entrar: (usuarioId: string) => void
  sair: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { db } = useAppData()
  const [sessao, setSessao] = useState(() => carregarSessao())

  const usuario = useMemo(
    () => db.usuarios.find((u) => u.id === sessao?.usuarioId) ?? null,
    [db.usuarios, sessao],
  )

  const entrar = useCallback((usuarioId: string) => {
    salvarSessao({ usuarioId })
    setSessao({ usuarioId })
  }, [])

  const sair = useCallback(() => {
    salvarSessao(null)
    setSessao(null)
  }, [])

  const value = useMemo(() => ({ usuario, entrar, sair }), [usuario, entrar, sair])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
