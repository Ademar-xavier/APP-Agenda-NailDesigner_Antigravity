import { endOfMonth, startOfMonth, startOfDay, endOfDay, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  TrendingUp,
  Users,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/layout/AppShell'
import { Card, EmptyState, SectionTitle, Button } from '../components/ui/Primitives'
import { StatusAgendamentoBadge } from '../components/StatusBadge'
import {
  agendamentosDoDia,
  cancelamentosEFaltasRecentes,
  clientePorId,
  clientesAConfirmarHoje,
  clientesEmManutencao,
  faturamentoPrevisto,
  faturamentoRealizado,
  horariosLivresHoje,
  proximoAtendimento,
} from '../lib/selectors'
import { formatCurrency, formatDate, formatDuration, formatTime, initials } from '../lib/format'
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal'

export function DashboardPage() {
  const { db } = useAppData()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const hoje = new Date()

  const agendaHoje = agendamentosDoDia(db, hoje).filter((a) => a.status !== 'bloqueado')
  const proximo = proximoAtendimento(db)
  const faturamentoHoje = faturamentoRealizado(db, startOfDay(hoje), endOfDay(hoje)) +
    faturamentoPrevisto(db, startOfDay(hoje), endOfDay(hoje))
  const faturamentoMes =
    faturamentoRealizado(db, startOfMonth(hoje), endOfMonth(hoje)) +
    faturamentoPrevisto(db, startOfMonth(hoje), endOfMonth(hoje))
  const aConfirmar = clientesAConfirmarHoje(db)
  const livres = horariosLivresHoje(db, usuario?.id ?? db.usuarios[0].id)
  const manutencao = clientesEmManutencao(db)
  const recentes = cancelamentosEFaltasRecentes(db)

  return (
    <div>
      <PageHeader
        title={`Olá, ${usuario?.nome.split(' ')[0]} 👋`}
        subtitle={formatDate(hoje.toISOString(), "EEEE, dd 'de' MMMM")}
      />

      {/* KPIs principais */}
      <RevealGroup className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" stagger={0.08}>
        <RevealItem blur>
          <Card className="!p-3.5">
            <div className="flex items-center gap-2 text-graphite-400">
              <TrendingUp size={16} />
              <p className="text-xs font-medium">Previsto hoje</p>
            </div>
            <p className="mt-1.5 text-lg font-semibold text-graphite-900">
              {formatCurrency(faturamentoHoje)}
            </p>
          </Card>
        </RevealItem>
        <RevealItem blur>
          <Card className="!p-3.5">
            <div className="flex items-center gap-2 text-graphite-400">
              <TrendingUp size={16} />
              <p className="text-xs font-medium">Previsto no mês</p>
            </div>
            <p className="mt-1.5 text-lg font-semibold text-graphite-900">
              {formatCurrency(faturamentoMes)}
            </p>
          </Card>
        </RevealItem>
        <RevealItem blur>
          <Card className="!p-3.5">
            <div className="flex items-center gap-2 text-graphite-400">
              <CalendarDays size={16} />
              <p className="text-xs font-medium">Atendimentos hoje</p>
            </div>
            <p className="mt-1.5 text-lg font-semibold text-graphite-900">{agendaHoje.length}</p>
          </Card>
        </RevealItem>
        <RevealItem blur>
          <Card className="!p-3.5">
            <div className="flex items-center gap-2 text-graphite-400">
              <Clock3 size={16} />
              <p className="text-xs font-medium">Horários livres hoje</p>
            </div>
            <p className="mt-1.5 text-lg font-semibold text-graphite-900">{livres.length}</p>
          </Card>
        </RevealItem>
      </RevealGroup>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Próximo atendimento */}
          <Reveal atraso={0.05}>
          <Card>
            <SectionTitle>Próximo atendimento</SectionTitle>
            {proximo ? (
              <ProximoAtendimentoCard agendamentoId={proximo.id} />
            ) : (
              <EmptyState
                icon={<CalendarClock size={32} />}
                title="Nenhum atendimento futuro"
                description="Sua agenda está livre a partir de agora."
              />
            )}
          </Card>
          </Reveal>

          {/* Agenda do dia */}
          <Reveal atraso={0.1}>
          <Card>
            <SectionTitle
              action={
                <button
                  onClick={() => navigate('/agenda')}
                  className="flex items-center gap-1 text-xs font-medium text-plum-600"
                >
                  Ver agenda <ArrowRight size={14} />
                </button>
              }
            >
              Agenda de hoje
            </SectionTitle>
            {agendaHoje.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={32} />}
                title="Nenhum atendimento hoje"
                description="Aproveite para organizar sua semana ou divulgar horários vagos."
              />
            ) : (
              <div className="space-y-2">
                {agendaHoje.map((a) => {
                  const cliente = clientePorId(db, a.clienteId)
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate('/agenda')}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-graphite-100 px-3 py-2.5 hover:bg-graphite-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 shrink-0 text-sm font-semibold text-graphite-700">
                          {formatTime(a.inicio)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-graphite-900">
                            {cliente?.nome ?? 'Cliente'}
                          </p>
                          <p className="text-xs text-graphite-400">
                            {a.itens.map((i) => i.nomeServico).join(', ')}
                          </p>
                        </div>
                      </div>
                      <StatusAgendamentoBadge status={a.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
          </Reveal>

          {/* Cancelamentos e faltas recentes */}
          <Reveal atraso={0.15}>
          <Card>
            <SectionTitle>Cancelamentos e faltas recentes</SectionTitle>
            {recentes.length === 0 ? (
              <EmptyState
                icon={<AlertCircle size={32} />}
                title="Nada por aqui"
                description="Nenhum cancelamento ou falta nos últimos 7 dias."
              />
            ) : (
              <div className="space-y-2">
                {recentes.map((a) => {
                  const cliente = clientePorId(db, a.clienteId)
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-graphite-900">{cliente?.nome}</p>
                        <p className="text-xs text-graphite-400">
                          {formatDate(a.inicio, "dd/MM 'às' HH:mm")}
                        </p>
                      </div>
                      <StatusAgendamentoBadge status={a.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
          </Reveal>
        </div>

        <RevealGroup className="space-y-5" stagger={0.1}>
          {/* Confirmações pendentes */}
          <RevealItem direcao="right">
          <Card>
            <SectionTitle
              action={
                <button
                  onClick={() => navigate('/confirmacoes')}
                  className="flex items-center gap-1 text-xs font-medium text-plum-600"
                >
                  Ver todas <ArrowRight size={14} />
                </button>
              }
            >
              A confirmar hoje
            </SectionTitle>
            {aConfirmar.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">
                Nenhuma confirmação pendente para hoje.
              </p>
            ) : (
              <div className="space-y-2">
                {aConfirmar.map((a) => {
                  const cliente = clientePorId(db, a.clienteId)
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl bg-warning-50 px-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-warning-600">
                        {cliente ? initials(cliente.nome) : '?'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-graphite-900">{cliente?.nome}</p>
                        <p className="text-xs text-graphite-500">{formatTime(a.inicio)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
          </RevealItem>

          {/* Manutenção recomendada */}
          <RevealItem direcao="right">
          <Card>
            <SectionTitle
              action={
                <button
                  onClick={() => navigate('/clientes')}
                  className="flex items-center gap-1 text-xs font-medium text-plum-600"
                >
                  Clientes <ArrowRight size={14} />
                </button>
              }
            >
              Manutenção recomendada
            </SectionTitle>
            {manutencao.length === 0 ? (
              <p className="py-4 text-center text-sm text-graphite-400">
                Nenhuma manutenção prevista para os próximos dias.
              </p>
            ) : (
              <div className="space-y-2">
                {manutencao.slice(0, 5).map((m) => (
                  <div
                    key={m.cliente.id}
                    onClick={() => navigate(`/clientes/${m.cliente.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-graphite-100 px-3 py-2.5 hover:bg-graphite-50"
                  >
                    <Sparkles size={16} className="shrink-0 text-terracotta-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-graphite-900">{m.cliente.nome}</p>
                      <p className="text-xs text-graphite-400">
                        {m.diasRestantes <= 0
                          ? 'Manutenção vencida'
                          : `Em ${m.diasRestantes} dia(s)`}{' '}
                        — {formatDate(m.dataRecomendada + 'T00:00:00')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </RevealItem>

          <RevealItem direcao="right">
          <Card className="bg-plum-600 text-white">
            <div className="flex items-center gap-2">
              <Users size={18} />
              <p className="text-sm font-semibold">Divulgue seu link de agendamento</p>
            </div>
            <p className="mt-2 text-xs text-plum-100">
              Compartilhe no Instagram e WhatsApp para que suas clientes agendem sozinhas.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 !bg-white !text-plum-700"
              onClick={() => navigate('/configuracoes')}
            >
              Ver meu link
            </Button>
          </Card>
          </RevealItem>
        </RevealGroup>
      </div>
    </div>
  )
}

function ProximoAtendimentoCard({ agendamentoId }: { agendamentoId: string }) {
  const { db } = useAppData()
  const a = db.agendamentos.find((x) => x.id === agendamentoId)
  if (!a) return null
  const cliente = clientePorId(db, a.clienteId)
  const duracao = a.itens.reduce((acc, i) => acc + i.duracaoMinutos, 0)
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-plum-50 text-sm font-bold text-plum-700">
          {cliente ? initials(cliente.nome) : '?'}
        </div>
        <div>
          <p className="font-semibold text-graphite-900">{cliente?.nome}</p>
          <p className="text-sm text-graphite-500">{a.itens.map((i) => i.nomeServico).join(', ')}</p>
          <p className="text-xs text-graphite-400">
            {formatDate(a.inicio, "dd/MM 'às' HH:mm")} · {formatDuration(duracao)}
          </p>
        </div>
      </div>
      <StatusAgendamentoBadge status={a.status} />
    </div>
  )
}
