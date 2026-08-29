import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { v4 as uuid } from 'uuid'
import type {
  Agendamento,
  Cliente,
  ConfiguracaoSalao,
  Database,
  FotoInspiracao,
  ListaEspera,
  Notificacao,
  Pagamento,
  Servico,
  Usuario,
} from '../types'
import { carregarBanco, resetarBanco, salvarBanco } from '../lib/storage'
import { haSobreposicao } from '../lib/businessRules'

interface AppDataContextValue {
  db: Database
  // Clientes
  criarCliente: (c: Omit<Cliente, 'id' | 'criadoEm'>) => Cliente
  atualizarCliente: (id: string, patch: Partial<Cliente>) => void
  // Serviços
  criarServico: (s: Omit<Servico, 'id' | 'criadoEm'>) => Servico
  atualizarServico: (id: string, patch: Partial<Servico>) => void
  // Agendamentos
  criarAgendamento: (
    a: Omit<Agendamento, 'id' | 'criadoEm'>,
  ) => { ok: true; agendamento: Agendamento } | { ok: false; motivo: string }
  atualizarAgendamento: (id: string, patch: Partial<Agendamento>) => void
  confirmarAgendamento: (id: string) => void
  cancelarAgendamento: (id: string, motivo: string, responsavel: string) => void
  marcarFalta: (id: string) => void
  concluirAgendamento: (
    id: string,
    opts?: { proximaManutencaoSugerida?: string | null },
  ) => void
  removerBloqueio: (id: string) => void
  // Pagamentos
  registrarPagamento: (p: Omit<Pagamento, 'id'>) => Pagamento
  // Lista de espera
  adicionarListaEspera: (l: Omit<ListaEspera, 'id' | 'criadoEm' | 'status'>) => ListaEspera
  atualizarListaEspera: (id: string, patch: Partial<ListaEspera>) => void
  // Fotos
  adicionarFoto: (f: Omit<FotoInspiracao, 'id' | 'criadoEm'>) => FotoInspiracao
  // Notificações
  registrarNotificacao: (n: Omit<Notificacao, 'id' | 'criadoEm'>) => Notificacao
  // Configuração
  atualizarConfiguracao: (patch: Partial<ConfiguracaoSalao>) => void
  // Usuários
  atualizarUsuario: (id: string, patch: Partial<Usuario>) => void
  criarUsuario: (u: Omit<Usuario, 'id'>) => Usuario
  // Utilidades
  resetarDados: () => void
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => carregarBanco())

  const persist = useCallback((updater: (prev: Database) => Database) => {
    setDb((prev) => {
      const next = updater(prev)
      salvarBanco(next)
      return next
    })
  }, [])

  const criarCliente = useCallback<AppDataContextValue['criarCliente']>(
    (c) => {
      const novo: Cliente = { ...c, id: `cli-${uuid()}`, criadoEm: new Date().toISOString() }
      persist((prev) => ({ ...prev, clientes: [novo, ...prev.clientes] }))
      return novo
    },
    [persist],
  )

  const atualizarCliente = useCallback<AppDataContextValue['atualizarCliente']>(
    (id, patch) => {
      persist((prev) => ({
        ...prev,
        clientes: prev.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    [persist],
  )

  const criarServico = useCallback<AppDataContextValue['criarServico']>(
    (s) => {
      const novo: Servico = { ...s, id: `srv-${uuid()}`, criadoEm: new Date().toISOString() }
      persist((prev) => ({ ...prev, servicos: [novo, ...prev.servicos] }))
      return novo
    },
    [persist],
  )

  const atualizarServico = useCallback<AppDataContextValue['atualizarServico']>(
    (id, patch) => {
      persist((prev) => ({
        ...prev,
        servicos: prev.servicos.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }))
    },
    [persist],
  )

  const criarAgendamento = useCallback<AppDataContextValue['criarAgendamento']>(
    (a) => {
      const inicio = new Date(a.inicio)
      const fim = new Date(a.fim)
      const conflito = haSobreposicao(db.agendamentos, a.profissionalId, inicio, fim)
      if (conflito) {
        return {
          ok: false,
          motivo: 'Já existe um atendimento nesse horário para esta profissional.',
        }
      }
      const novo: Agendamento = { ...a, id: `ag-${uuid()}`, criadoEm: new Date().toISOString() }
      persist((prev) => ({ ...prev, agendamentos: [novo, ...prev.agendamentos] }))
      return { ok: true, agendamento: novo }
    },
    [db.agendamentos, persist],
  )

  const atualizarAgendamento = useCallback<AppDataContextValue['atualizarAgendamento']>(
    (id, patch) => {
      persist((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }))
    },
    [persist],
  )

  const confirmarAgendamento = useCallback<AppDataContextValue['confirmarAgendamento']>(
    (id) => atualizarAgendamento(id, { status: 'confirmado' }),
    [atualizarAgendamento],
  )

  const cancelarAgendamento = useCallback<AppDataContextValue['cancelarAgendamento']>(
    (id, motivo, responsavel) =>
      atualizarAgendamento(id, {
        status: 'cancelado',
        motivoCancelamento: motivo,
        canceladoPor: responsavel,
        canceladoEm: new Date().toISOString(),
      }),
    [atualizarAgendamento],
  )

  const marcarFalta = useCallback<AppDataContextValue['marcarFalta']>(
    (id) => atualizarAgendamento(id, { status: 'falta' }),
    [atualizarAgendamento],
  )

  const concluirAgendamento = useCallback<AppDataContextValue['concluirAgendamento']>(
    (id, opts) =>
      atualizarAgendamento(id, {
        status: 'concluido',
        ...(opts && 'proximaManutencaoSugerida' in opts
          ? { proximaManutencaoSugerida: opts.proximaManutencaoSugerida ?? undefined }
          : {}),
      }),
    [atualizarAgendamento],
  )

  const removerBloqueio = useCallback<AppDataContextValue['removerBloqueio']>(
    (id) => {
      persist((prev) => ({
        ...prev,
        agendamentos: prev.agendamentos.filter((a) => a.id !== id),
      }))
    },
    [persist],
  )

  const registrarPagamento = useCallback<AppDataContextValue['registrarPagamento']>(
    (p) => {
      const novo: Pagamento = { ...p, id: uuid() }
      persist((prev) => ({ ...prev, pagamentos: [novo, ...prev.pagamentos] }))
      return novo
    },
    [persist],
  )

  const adicionarListaEspera = useCallback<AppDataContextValue['adicionarListaEspera']>(
    (l) => {
      const novo: ListaEspera = {
        ...l,
        id: uuid(),
        status: 'aguardando',
        criadoEm: new Date().toISOString(),
      }
      persist((prev) => ({ ...prev, listaEspera: [novo, ...prev.listaEspera] }))
      return novo
    },
    [persist],
  )

  const atualizarListaEspera = useCallback<AppDataContextValue['atualizarListaEspera']>(
    (id, patch) => {
      persist((prev) => ({
        ...prev,
        listaEspera: prev.listaEspera.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      }))
    },
    [persist],
  )

  const adicionarFoto = useCallback<AppDataContextValue['adicionarFoto']>(
    (f) => {
      const novo: FotoInspiracao = { ...f, id: uuid(), criadoEm: new Date().toISOString() }
      persist((prev) => ({ ...prev, fotos: [novo, ...prev.fotos] }))
      return novo
    },
    [persist],
  )

  const registrarNotificacao = useCallback<AppDataContextValue['registrarNotificacao']>(
    (n) => {
      const novo: Notificacao = { ...n, id: uuid(), criadoEm: new Date().toISOString() }
      persist((prev) => ({ ...prev, notificacoes: [novo, ...prev.notificacoes] }))
      return novo
    },
    [persist],
  )

  const atualizarConfiguracao = useCallback<AppDataContextValue['atualizarConfiguracao']>(
    (patch) => {
      persist((prev) => ({ ...prev, configuracao: { ...prev.configuracao, ...patch } }))
    },
    [persist],
  )

  const atualizarUsuario = useCallback<AppDataContextValue['atualizarUsuario']>(
    (id, patch) => {
      persist((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }))
    },
    [persist],
  )

  const criarUsuario = useCallback<AppDataContextValue['criarUsuario']>(
    (u) => {
      const novo: Usuario = { ...u, id: `user-${uuid()}` }
      persist((prev) => ({ ...prev, usuarios: [...prev.usuarios, novo] }))
      return novo
    },
    [persist],
  )

  const resetarDados = useCallback(() => {
    const seed = resetarBanco()
    setDb(seed)
  }, [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      db,
      criarCliente,
      atualizarCliente,
      criarServico,
      atualizarServico,
      criarAgendamento,
      atualizarAgendamento,
      confirmarAgendamento,
      cancelarAgendamento,
      marcarFalta,
      concluirAgendamento,
      removerBloqueio,
      registrarPagamento,
      adicionarListaEspera,
      atualizarListaEspera,
      adicionarFoto,
      registrarNotificacao,
      atualizarConfiguracao,
      atualizarUsuario,
      criarUsuario,
      resetarDados,
    }),
    [
      db,
      criarCliente,
      atualizarCliente,
      criarServico,
      atualizarServico,
      criarAgendamento,
      atualizarAgendamento,
      confirmarAgendamento,
      cancelarAgendamento,
      marcarFalta,
      concluirAgendamento,
      removerBloqueio,
      registrarPagamento,
      adicionarListaEspera,
      atualizarListaEspera,
      adicionarFoto,
      registrarNotificacao,
      atualizarConfiguracao,
      atualizarUsuario,
      criarUsuario,
      resetarDados,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData deve ser usado dentro de AppDataProvider')
  return ctx
}
