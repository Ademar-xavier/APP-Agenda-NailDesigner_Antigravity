import {
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { Agendamento, Cliente, Database, Servico } from '../types'
import { horariosDisponiveisNoDia, somaDuracao } from './businessRules'

export function clientePorId(db: Database, id: string | null): Cliente | undefined {
  if (!id) return undefined
  return db.clientes.find((c) => c.id === id)
}

export function servicoPorId(db: Database, id: string): Servico | undefined {
  return db.servicos.find((s) => s.id === id)
}

export function agendamentosDoDia(db: Database, data: Date, profissionalId?: string) {
  return db.agendamentos
    .filter((a) => isSameDay(parseISO(a.inicio), data))
    .filter((a) => !profissionalId || a.profissionalId === profissionalId)
    .sort((a, b) => +parseISO(a.inicio) - +parseISO(b.inicio))
}

export function proximoAtendimento(db: Database, agora = new Date()): Agendamento | undefined {
  return db.agendamentos
    .filter((a) => (a.status === 'confirmado' || a.status === 'pendente') && isAfter(parseISO(a.inicio), agora))
    .sort((a, b) => +parseISO(a.inicio) - +parseISO(b.inicio))[0]
}

export function faturamentoRealizado(db: Database, inicio: Date, fim: Date): number {
  return db.agendamentos
    .filter((a) => a.status === 'concluido')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .reduce((acc, a) => acc + a.valorTotal, 0)
}

export function faturamentoPrevisto(db: Database, inicio: Date, fim: Date): number {
  return db.agendamentos
    .filter((a) => a.status === 'confirmado' || a.status === 'pendente')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .reduce((acc, a) => acc + a.valorTotal, 0)
}

export function faturamentoCancelado(db: Database, inicio: Date, fim: Date): number {
  return db.agendamentos
    .filter((a) => a.status === 'cancelado')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .reduce((acc, a) => acc + a.valorTotal, 0)
}

export function faturamentoPerdidoPorFalta(db: Database, inicio: Date, fim: Date): number {
  return db.agendamentos
    .filter((a) => a.status === 'falta')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .reduce((acc, a) => acc + a.valorTotal, 0)
}

export function clientesAConfirmarHoje(db: Database): Agendamento[] {
  const hoje = new Date()
  return db.agendamentos.filter((a) => a.status === 'pendente' && isSameDay(parseISO(a.inicio), hoje))
}

export function atendimentosSemConfirmacao(db: Database): Agendamento[] {
  const agora = new Date()
  return db.agendamentos.filter((a) => a.status === 'pendente' && isAfter(parseISO(a.inicio), agora))
}

export function horariosLivresHoje(db: Database, profissionalId: string): Date[] {
  return horariosDisponiveisNoDia({
    data: new Date(),
    duracaoTotalMinutos: 30,
    profissionalId,
    config: db.configuracao,
    agendamentos: db.agendamentos,
  })
}

export interface ClienteManutencao {
  cliente: Cliente
  dataRecomendada: string
  diasRestantes: number
  ultimoAgendamento: Agendamento
}

export function clientesEmManutencao(db: Database): ClienteManutencao[] {
  const hoje = startOfDay(new Date())
  const resultado: ClienteManutencao[] = []
  const vistos = new Set<string>()

  const concluidosComManutencao = db.agendamentos
    .filter((a) => a.status === 'concluido' && a.proximaManutencaoSugerida && a.clienteId)
    .sort((a, b) => +parseISO(b.inicio) - +parseISO(a.inicio))

  for (const ag of concluidosComManutencao) {
    if (!ag.clienteId || vistos.has(ag.clienteId)) continue
    vistos.add(ag.clienteId)
    const cliente = clientePorId(db, ag.clienteId)
    if (!cliente || !ag.proximaManutencaoSugerida) continue

    // Se já existe um agendamento futuro ativo para essa cliente, não sugerir de novo.
    const jaTemFuturo = db.agendamentos.some(
      (a) =>
        a.clienteId === ag.clienteId &&
        (a.status === 'confirmado' || a.status === 'pendente') &&
        isAfter(parseISO(a.inicio), new Date()),
    )
    if (jaTemFuturo) continue

    const dataRecomendada = parseISO(ag.proximaManutencaoSugerida)
    const diasRestantes = differenceInCalendarDays(dataRecomendada, hoje)
    if (diasRestantes <= 7) {
      resultado.push({ cliente, dataRecomendada: ag.proximaManutencaoSugerida, diasRestantes, ultimoAgendamento: ag })
    }
  }

  return resultado.sort((a, b) => a.diasRestantes - b.diasRestantes)
}

export function cancelamentosEFaltasRecentes(db: Database, dias = 7): Agendamento[] {
  const limite = startOfDay(new Date())
  limite.setDate(limite.getDate() - dias)
  return db.agendamentos
    .filter((a) => a.status === 'cancelado' || a.status === 'falta')
    .filter((a) => isAfter(parseISO(a.inicio), limite) && isBefore(parseISO(a.inicio), new Date()))
    .sort((a, b) => +parseISO(b.inicio) - +parseISO(a.inicio))
}

export function clientesInativos(db: Database, diasMin: number, diasMax?: number): Cliente[] {
  const hoje = new Date()
  return db.clientes.filter((c) => {
    const atendimentos = db.agendamentos
      .filter((a) => a.clienteId === c.id && a.status === 'concluido')
      .sort((a, b) => +parseISO(b.inicio) - +parseISO(a.inicio))
    if (atendimentos.length === 0) return false
    const dias = differenceInCalendarDays(hoje, parseISO(atendimentos[0].inicio))
    return dias >= diasMin && (diasMax === undefined || dias < diasMax)
  })
}

export function taxaOcupacao(db: Database, inicio: Date, fim: Date, profissionalId?: string): number {
  const relevantes = db.agendamentos
    .filter((a) => !profissionalId || a.profissionalId === profissionalId)
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .filter((a) => a.status === 'concluido' || a.status === 'confirmado')

  const minutosOcupados = relevantes.reduce((acc, a) => acc + somaDuracao(a.itens), 0)

  let minutosDisponiveisTotal = 0
  const dias = differenceInCalendarDays(fim, inicio) + 1
  for (let i = 0; i < dias; i++) {
    const dia = new Date(inicio)
    dia.setDate(dia.getDate() + i)
    const diaKey = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][
      dia.getDay()
    ] as keyof typeof db.configuracao.horarios
    const horario = db.configuracao.horarios[diaKey]
    if (!horario.ativo) continue
    const [hi, mi] = horario.inicio.split(':').map(Number)
    const [hf, mf] = horario.fim.split(':').map(Number)
    let minutos = hf * 60 + mf - (hi * 60 + mi)
    if (horario.pausaInicio && horario.pausaFim) {
      const [phi, pmi] = horario.pausaInicio.split(':').map(Number)
      const [phf, pmf] = horario.pausaFim.split(':').map(Number)
      minutos -= phf * 60 + pmf - (phi * 60 + pmi)
    }
    minutosDisponiveisTotal += minutos
  }

  if (minutosDisponiveisTotal === 0) return 0
  return Math.min(100, Math.round((minutosOcupados / minutosDisponiveisTotal) * 100))
}

export function ticketMedio(db: Database, inicio: Date, fim: Date): number {
  const concluidos = db.agendamentos
    .filter((a) => a.status === 'concluido')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
  if (concluidos.length === 0) return 0
  return concluidos.reduce((acc, a) => acc + a.valorTotal, 0) / concluidos.length
}

export function taxaConfirmacao(db: Database, inicio: Date, fim: Date): number {
  const relevantes = db.agendamentos
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .filter((a) => ['confirmado', 'concluido', 'pendente', 'falta'].includes(a.status))
  if (relevantes.length === 0) return 0
  const confirmados = relevantes.filter((a) => a.status !== 'pendente').length
  return Math.round((confirmados / relevantes.length) * 100)
}

export function taxaFaltaCancelamento(db: Database, inicio: Date, fim: Date) {
  const relevantes = db.agendamentos.filter((a) =>
    isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }),
  )
  if (relevantes.length === 0) return { falta: 0, cancelamento: 0 }
  const faltas = relevantes.filter((a) => a.status === 'falta').length
  const cancelamentos = relevantes.filter((a) => a.status === 'cancelado').length
  return {
    falta: Math.round((faltas / relevantes.length) * 100),
    cancelamento: Math.round((cancelamentos / relevantes.length) * 100),
  }
}

export function isMesmoMes(iso: string, referencia: Date): boolean {
  return isSameMonth(parseISO(iso), referencia)
}

export function rankingServicos(db: Database, inicio: Date, fim: Date) {
  const contagem = new Map<string, { nome: string; quantidade: number; total: number }>()
  db.agendamentos
    .filter((a) => a.status === 'concluido')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .forEach((a) => {
      a.itens.forEach((item) => {
        const atual = contagem.get(item.servicoId) ?? {
          nome: item.nomeServico,
          quantidade: 0,
          total: 0,
        }
        atual.quantidade += 1
        atual.total += item.precoCobrado
        contagem.set(item.servicoId, atual)
      })
    })
  return Array.from(contagem.values()).sort((a, b) => b.total - a.total)
}

export function rankingProfissionais(db: Database, inicio: Date, fim: Date) {
  const contagem = new Map<string, { nome: string; quantidade: number; total: number }>()
  db.agendamentos
    .filter((a) => a.status === 'concluido')
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicio, end: fim }))
    .forEach((a) => {
      const usuario = db.usuarios.find((u) => u.id === a.profissionalId)
      const nome = usuario?.nome ?? 'Desconhecida'
      const atual = contagem.get(a.profissionalId) ?? { nome, quantidade: 0, total: 0 }
      atual.quantidade += 1
      atual.total += a.valorTotal
      contagem.set(a.profissionalId, atual)
    })
  return Array.from(contagem.values()).sort((a, b) => b.total - a.total)
}
