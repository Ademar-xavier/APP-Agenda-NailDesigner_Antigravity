import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
} from 'date-fns'
import type {
  Agendamento,
  ConfiguracaoSalao,
  HorarioDia,
  ItemAgendamento,
  Servico,
  StatusAgendamento,
} from '../types'

export const SLOT_STEP_MINUTES = 30

const DIA_SEMANA_KEYS = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
] as const

export function chaveDiaSemana(data: Date): (typeof DIA_SEMANA_KEYS)[number] {
  return DIA_SEMANA_KEYS[data.getDay()]
}

/** Status de agendamento que efetivamente ocupam um horário na agenda. */
export const STATUS_OCUPAM_HORARIO: StatusAgendamento[] = [
  'pendente',
  'confirmado',
  'concluido',
  'bloqueado',
]

export function somaDuracao(itens: { duracaoMinutos: number }[]): number {
  return itens.reduce((acc, i) => acc + i.duracaoMinutos, 0)
}

export function somaValor(itens: { precoCobrado: number }[]): number {
  return itens.reduce((acc, i) => acc + i.precoCobrado, 0)
}

export function itensDeServicos(servicos: Servico[]): ItemAgendamento[] {
  return servicos.map((s) => ({
    id: crypto.randomUUID(),
    servicoId: s.id,
    nomeServico: s.nome,
    duracaoMinutos: s.duracaoMinutos,
    precoCobrado: s.preco,
  }))
}

/** Regra de negócio 1: nunca permitir sobreposição de horários para a mesma profissional. */
export function haSobreposicao(
  agendamentos: Agendamento[],
  profissionalId: string,
  inicio: Date,
  fim: Date,
  excluirId?: string,
): Agendamento | null {
  for (const ag of agendamentos) {
    if (ag.id === excluirId) continue
    if (ag.profissionalId !== profissionalId) continue
    if (!STATUS_OCUPAM_HORARIO.includes(ag.status)) continue
    const agInicio = parseISO(ag.inicio)
    const agFim = parseISO(ag.fim)
    if (isBefore(inicio, agFim) && isBefore(agInicio, fim)) {
      return ag
    }
  }
  return null
}

function parseHoraEmData(data: Date, hora: string): Date {
  const [h, m] = hora.split(':').map(Number)
  return setSeconds(setMinutes(setHours(startOfDay(data), h), m), 0)
}

/**
 * Calcula os horários de início disponíveis em um dia para uma duração total,
 * respeitando expediente, pausa configurada e agendamentos já existentes.
 * Regra de negócio 3: só mostrar horários dentro do expediente e realmente livres.
 */
export function horariosDisponiveisNoDia(params: {
  data: Date
  duracaoTotalMinutos: number
  profissionalId: string
  config: ConfiguracaoSalao
  agendamentos: Agendamento[]
  agora?: Date
}): Date[] {
  const { data, duracaoTotalMinutos, profissionalId, config, agendamentos } = params
  const agora = params.agora ?? new Date()
  const diaKey = chaveDiaSemana(data)
  const horario: HorarioDia = config.horarios[diaKey]
  if (!horario.ativo) return []

  const inicioExpediente = parseHoraEmData(data, horario.inicio)
  const fimExpediente = parseHoraEmData(data, horario.fim)
  const pausaInicio = horario.pausaInicio ? parseHoraEmData(data, horario.pausaInicio) : null
  const pausaFim = horario.pausaFim ? parseHoraEmData(data, horario.pausaFim) : null

  const ocupados = agendamentos.filter(
    (a) => a.profissionalId === profissionalId && STATUS_OCUPAM_HORARIO.includes(a.status),
  )

  const slots: Date[] = []
  let cursor = inicioExpediente
  while (isBefore(cursor, fimExpediente) || +cursor === +fimExpediente) {
    const slotFim = addMinutes(cursor, duracaoTotalMinutos)
    if (isAfter(slotFim, fimExpediente)) break

    const dentroDaPausa =
      pausaInicio && pausaFim && isBefore(cursor, pausaFim) && isBefore(pausaInicio, slotFim)

    const noPassado = isBefore(cursor, agora)

    const conflito = ocupados.some((ag) => {
      const agInicio = parseISO(ag.inicio)
      const agFim = parseISO(ag.fim)
      return isBefore(cursor, agFim) && isBefore(agInicio, slotFim)
    })

    if (!dentroDaPausa && !noPassado && !conflito) {
      slots.push(cursor)
    }
    cursor = addMinutes(cursor, SLOT_STEP_MINUTES)
  }
  return slots
}

/** Regra de negócio 8: valores cobrados ficam "congelados" no momento da criação do item. */
export function calcularValorSinal(itens: ItemAgendamento[], servicos: Servico[]): number {
  let total = 0
  for (const item of itens) {
    const servico = servicos.find((s) => s.id === item.servicoId)
    if (!servico || servico.sinalTipo === 'nenhum') continue
    if (servico.sinalTipo === 'valor_fixo') {
      total += servico.sinalValor
    } else if (servico.sinalTipo === 'percentual') {
      total += (item.precoCobrado * servico.sinalValor) / 100
    }
  }
  return Math.round(total * 100) / 100
}

/** Sugere a data da próxima manutenção com base no menor intervalo entre os serviços do atendimento. */
export function sugerirProximaManutencao(
  itens: ItemAgendamento[],
  servicos: Servico[],
  dataConclusao: Date,
): string | undefined {
  const intervalos = itens
    .map((item) => servicos.find((s) => s.id === item.servicoId)?.intervaloManutencaoDias)
    .filter((v): v is number => typeof v === 'number' && v > 0)
  if (intervalos.length === 0) return undefined
  const menor = Math.min(...intervalos)
  return format(addDays(dataConclusao, menor), 'yyyy-MM-dd')
}

export function gerarLinkPublico(config: ConfiguracaoSalao): string {
  return config.linkPublico
}
