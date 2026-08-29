// Script de verificação rápida das regras de negócio (não faz parte do app final).
import { horariosDisponiveisNoDia, haSobreposicao, sugerirProximaManutencao, calcularValorSinal } from '../src/lib/businessRules.ts'

function assert(cond, msg) {
  if (!cond) {
    console.error('FALHOU:', msg)
    process.exitCode = 1
  } else {
    console.log('OK:', msg)
  }
}

const config = {
  horarios: {
    domingo: { ativo: false, inicio: '09:00', fim: '18:00' },
    segunda: { ativo: true, inicio: '09:00', fim: '19:00', pausaInicio: '12:30', pausaFim: '13:30' },
    terca: { ativo: true, inicio: '09:00', fim: '19:00', pausaInicio: '12:30', pausaFim: '13:30' },
    quarta: { ativo: true, inicio: '09:00', fim: '19:00', pausaInicio: '12:30', pausaFim: '13:30' },
    quinta: { ativo: true, inicio: '09:00', fim: '19:00', pausaInicio: '12:30', pausaFim: '13:30' },
    sexta: { ativo: true, inicio: '09:00', fim: '19:00', pausaInicio: '12:30', pausaFim: '13:30' },
    sabado: { ativo: true, inicio: '09:00', fim: '16:00' },
  },
}

// Segunda-feira fixa e distante no futuro para não colidir com "agora"
const segundaFutura = new Date('2027-03-01T00:00:00') // é uma segunda-feira

const agendamentos = [
  {
    id: 'ag-1',
    profissionalId: 'prof-1',
    inicio: new Date('2027-03-01T10:00:00').toISOString(),
    fim: new Date('2027-03-01T11:00:00').toISOString(),
    status: 'confirmado',
  },
]

// 1) Não deve sugerir horários dentro da pausa de almoço
const slots = horariosDisponiveisNoDia({
  data: segundaFutura,
  duracaoTotalMinutos: 30,
  profissionalId: 'prof-1',
  config,
  agendamentos,
  agora: new Date('2027-01-01T00:00:00'),
})
const dentroDaPausa = slots.some((s) => s.getHours() === 12 && s.getMinutes() >= 30)
assert(!dentroDaPausa, 'nenhum horário sugerido cai dentro da pausa de almoço')

// 2) Não deve sugerir horário que colida com o agendamento das 10h-11h
const colideComOcupado = slots.some((s) => s.getHours() === 10 || (s.getHours() === 10 && s.getMinutes() === 30))
assert(!colideComOcupado, 'horários ocupados (10h-11h) não aparecem como disponíveis')

// 3) haSobreposicao detecta conflito de horário para a mesma profissional
const conflito = haSobreposicao(
  agendamentos,
  'prof-1',
  new Date('2027-03-01T10:30:00'),
  new Date('2027-03-01T11:30:00'),
)
assert(conflito !== null, 'sobreposição parcial é detectada corretamente')

const semConflito = haSobreposicao(
  agendamentos,
  'prof-1',
  new Date('2027-03-01T11:00:00'),
  new Date('2027-03-01T12:00:00'),
)
assert(semConflito === null, 'horário adjacente (sem sobreposição real) não gera conflito')

const outraProfissional = haSobreposicao(
  agendamentos,
  'prof-2',
  new Date('2027-03-01T10:00:00'),
  new Date('2027-03-01T11:00:00'),
)
assert(outraProfissional === null, 'mesmo horário não conflita entre profissionais diferentes')

// 4) Sugestão de próxima manutenção usa o menor intervalo entre os serviços do atendimento
const servicos = [
  { id: 'srv-a', intervaloManutencaoDias: 30 },
  { id: 'srv-b', intervaloManutencaoDias: 15 },
]
const itens = [
  { servicoId: 'srv-a' },
  { servicoId: 'srv-b' },
]
const proxima = sugerirProximaManutencao(itens, servicos, new Date('2027-03-01T00:00:00'))
assert(proxima === '2027-03-16', `próxima manutenção usa o menor intervalo (15 dias): obtido ${proxima}`)

// 5) Cálculo de sinal percentual e fixo
const servicosSinal = [
  { id: 'srv-p', sinalTipo: 'percentual', sinalValor: 30 },
  { id: 'srv-f', sinalTipo: 'valor_fixo', sinalValor: 20 },
]
const itensSinal = [
  { servicoId: 'srv-p', precoCobrado: 100 },
  { servicoId: 'srv-f', precoCobrado: 50 },
]
const sinal = calcularValorSinal(itensSinal, servicosSinal)
assert(sinal === 50, `sinal combinado (30% de 100 + 20 fixo = 50): obtido ${sinal}`)

console.log('\nTodos os testes de regras de negócio executados.')
