import { useMemo, useState } from 'react'
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Search, CalendarX } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { PageHeader } from '../../components/layout/AppShell'
import { Button, Card, EmptyState, Select, Input, Tabs } from '../../components/ui/Primitives'
import { RevealGroup, RevealItem } from '../../components/motion/Reveal'
import { AgendamentoCard } from './AgendamentoCard'
import { NovoAgendamentoModal } from './NovoAgendamentoModal'
import { AgendamentoDetalheModal } from '../../components/AgendamentoDetalheModal'
import { useAppData } from '../../context/AppDataContext'
import { clientePorId } from '../../lib/selectors'
import { formatDate } from '../../lib/format'
import type { StatusAgendamento } from '../../types'

type Visualizacao = 'dia' | 'semana' | 'mes'

const STATUS_TABS: { id: StatusAgendamento | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendente', label: 'Pendente' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'concluido', label: 'Concluído' },
  { id: 'cancelado', label: 'Cancelado' },
  { id: 'falta', label: 'Falta' },
]

export function AgendaPage() {
  const { db } = useAppData()
  const reduzMovimento = useReducedMotion()
  const viewSwitchId = useId()
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('dia')
  const [dataRef, setDataRef] = useState(new Date())
  const [profissionalFiltro, setProfissionalFiltro] = useState('todos')
  const [servicoFiltro, setServicoFiltro] = useState('todos')
  const [statusFiltro, setStatusFiltro] = useState<StatusAgendamento | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState<{ data: Date; profissionalId?: string } | null>(null)
  const [detalheId, setDetalheId] = useState<string | null>(null)

  const agendamentosFiltrados = useMemo(() => {
    return db.agendamentos.filter((a) => {
      if (profissionalFiltro !== 'todos' && a.profissionalId !== profissionalFiltro) return false
      if (statusFiltro !== 'todos' && a.status !== statusFiltro) return false
      if (servicoFiltro !== 'todos' && !a.itens.some((i) => i.servicoId === servicoFiltro)) return false
      if (busca.trim()) {
        const cliente = clientePorId(db, a.clienteId)
        const termo = busca.toLowerCase()
        const combina =
          cliente?.nome.toLowerCase().includes(termo) || cliente?.telefone.includes(busca)
        if (!combina) return false
      }
      return true
    })
  }, [db, profissionalFiltro, statusFiltro, servicoFiltro, busca])

  function navegar(direcao: 1 | -1) {
    if (visualizacao === 'dia') setDataRef((d) => addDays(d, direcao))
    if (visualizacao === 'semana') setDataRef((d) => (direcao === 1 ? addWeeks(d, 1) : subWeeks(d, 1)))
    if (visualizacao === 'mes') setDataRef((d) => (direcao === 1 ? addMonths(d, 1) : subMonths(d, 1)))
  }

  const tituloPeriodo = useMemo(() => {
    if (visualizacao === 'dia') return formatDate(dataRef.toISOString(), "EEEE, dd 'de' MMMM")
    if (visualizacao === 'semana') {
      const inicio = startOfWeek(dataRef, { locale: ptBR })
      const fim = endOfWeek(dataRef, { locale: ptBR })
      return `${format(inicio, 'dd MMM', { locale: ptBR })} – ${format(fim, 'dd MMM', { locale: ptBR })}`
    }
    return format(dataRef, "MMMM 'de' yyyy", { locale: ptBR })
  }, [visualizacao, dataRef])

  return (
    <div>
      <PageHeader
        title="Agenda"
        action={
          <Button icon={<Plus size={16} />} onClick={() => setModalNovo({ data: dataRef })}>
            Novo agendamento
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="mb-4 !p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou telefone…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={profissionalFiltro} onChange={(e) => setProfissionalFiltro(e.target.value)}>
            <option value="todos">Todas as profissionais</option>
            {db.usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Select>
          <Select value={servicoFiltro} onChange={(e) => setServicoFiltro(e.target.value)}>
            <option value="todos">Todos os serviços</option>
            {db.servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-2">
          <Tabs
            tabs={STATUS_TABS}
            active={statusFiltro}
            onChange={(id) => setStatusFiltro(id as StatusAgendamento | 'todos')}
          />
        </div>
      </Card>

      {/* Navegação de período */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={reduzMovimento ? undefined : { scale: 1.08 }}
            whileTap={reduzMovimento ? undefined : { scale: 0.9 }}
            onClick={() => navegar(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-graphite-500 hover:bg-white"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <motion.button
            whileHover={reduzMovimento ? undefined : { scale: 1.04 }}
            whileTap={reduzMovimento ? undefined : { scale: 0.94 }}
            onClick={() => setDataRef(new Date())}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-plum-600 hover:bg-white"
          >
            Hoje
          </motion.button>
          <motion.button
            whileHover={reduzMovimento ? undefined : { scale: 1.08 }}
            whileTap={reduzMovimento ? undefined : { scale: 0.9 }}
            onClick={() => navegar(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-graphite-500 hover:bg-white"
          >
            <ChevronRight size={18} />
          </motion.button>
          <AnimatePresence mode="wait">
            <motion.p
              key={tituloPeriodo}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="ml-2 text-sm font-semibold capitalize text-graphite-800"
            >
              {tituloPeriodo}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex gap-1 rounded-xl bg-nude-50 p-1">
          {(['dia', 'semana', 'mes'] as Visualizacao[]).map((v) => (
            <button
              key={v}
              onClick={() => setVisualizacao(v)}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${visualizacao === v ? 'text-plum-600' : 'text-graphite-500'}`}
            >
              {visualizacao === v && (
                <motion.span
                  layoutId={`agenda-view-pill-${viewSwitchId}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                />
              )}
              <span className="relative z-10">{v}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${visualizacao}-${dataRef.toDateString()}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {visualizacao === 'dia' && (
            <VisaoDia
              data={dataRef}
              agendamentos={agendamentosFiltrados}
              onSelecionar={setDetalheId}
              onNovo={(hora) => setModalNovo({ data: hora })}
            />
          )}
          {visualizacao === 'semana' && (
            <VisaoSemana
              data={dataRef}
              agendamentos={agendamentosFiltrados}
              onSelecionarDia={(d) => {
                setDataRef(d)
                setVisualizacao('dia')
              }}
            />
          )}
          {visualizacao === 'mes' && (
            <VisaoMes
              data={dataRef}
              agendamentos={agendamentosFiltrados}
              onSelecionarDia={(d) => {
                setDataRef(d)
                setVisualizacao('dia')
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {modalNovo && (
        <NovoAgendamentoModal
          open
          dataInicial={modalNovo.data}
          profissionalInicial={modalNovo.profissionalId}
          onClose={() => setModalNovo(null)}
        />
      )}
      {detalheId && (
        <AgendamentoDetalheModal agendamentoId={detalheId} onClose={() => setDetalheId(null)} />
      )}
    </div>
  )
}

function VisaoDia({
  data,
  agendamentos,
  onSelecionar,
  onNovo,
}: {
  data: Date
  agendamentos: ReturnType<typeof useAppData>['db']['agendamentos']
  onSelecionar: (id: string) => void
  onNovo: (data: Date) => void
}) {
  const doDia = agendamentos
    .filter((a) => isSameDay(parseISO(a.inicio), data))
    .sort((a, b) => +parseISO(a.inicio) - +parseISO(b.inicio))

  if (doDia.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX size={32} />}
        title="Nenhum atendimento neste dia"
        description="Crie um novo agendamento ou divulgue horários vagos para suas clientes."
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => onNovo(data)}>
            Agendar horário
          </Button>
        }
      />
    )
  }

  return (
    <RevealGroup className="space-y-2" stagger={0.04}>
      {doDia.map((a) => (
        <RevealItem key={a.id}>
          <AgendamentoCard agendamento={a} onClick={() => onSelecionar(a.id)} />
        </RevealItem>
      ))}
    </RevealGroup>
  )
}

function VisaoSemana({
  data,
  agendamentos,
  onSelecionarDia,
}: {
  data: Date
  agendamentos: ReturnType<typeof useAppData>['db']['agendamentos']
  onSelecionarDia: (d: Date) => void
}) {
  const dias = eachDayOfInterval({
    start: startOfWeek(data, { locale: ptBR }),
    end: endOfWeek(data, { locale: ptBR }),
  })

  return (
    <RevealGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7" stagger={0.05}>
      {dias.map((dia) => {
        const doDia = agendamentos
          .filter((a) => isSameDay(parseISO(a.inicio), dia))
          .sort((a, b) => +parseISO(a.inicio) - +parseISO(b.inicio))
        const hoje = isSameDay(dia, new Date())
        return (
          <RevealItem key={dia.toISOString()}>
          <Card
            onClick={() => onSelecionarDia(dia)}
            className={`!p-3 ${hoje ? 'ring-2 ring-plum-300' : ''}`}
          >
            <p className="text-xs font-semibold uppercase text-graphite-400">
              {format(dia, 'EEE', { locale: ptBR })}
            </p>
            <p className="mb-2 text-lg font-semibold text-graphite-900">{format(dia, 'dd')}</p>
            <div className="space-y-1">
              {doDia.slice(0, 4).map((a) => (
                <AgendamentoCard key={a.id} agendamento={a} onClick={() => onSelecionarDia(dia)} compact />
              ))}
              {doDia.length === 0 && <p className="text-xs text-graphite-300">Sem atendimentos</p>}
              {doDia.length > 4 && (
                <p className="text-xs font-medium text-plum-600">+{doDia.length - 4} mais</p>
              )}
            </div>
          </Card>
          </RevealItem>
        )
      })}
    </RevealGroup>
  )
}

const STATUS_DOT: Record<string, string> = {
  pendente: 'bg-warning-500',
  confirmado: 'bg-success-500',
  concluido: 'bg-info-500',
  cancelado: 'bg-graphite-300',
  falta: 'bg-danger-500',
  bloqueado: 'bg-graphite-400',
}

function VisaoMes({
  data,
  agendamentos,
  onSelecionarDia,
}: {
  data: Date
  agendamentos: ReturnType<typeof useAppData>['db']['agendamentos']
  onSelecionarDia: (d: Date) => void
}) {
  const inicioGrade = startOfWeek(startOfMonth(data), { locale: ptBR })
  const fimGrade = endOfWeek(endOfMonth(data), { locale: ptBR })
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade })

  return (
    <Card className="!p-2 sm:!p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-graphite-400">
        {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia) => {
          const doDia = agendamentos.filter((a) => isSameDay(parseISO(a.inicio), dia))
          const foraDoMes = !isSameMonth(dia, data)
          const hoje = isSameDay(dia, new Date())
          return (
            <button
              key={dia.toISOString()}
              onClick={() => onSelecionarDia(dia)}
              className={`flex min-h-[64px] flex-col items-center gap-1 rounded-xl border p-1.5 text-left transition-colors sm:min-h-[80px] sm:items-start sm:p-2 ${
                foraDoMes ? 'border-transparent text-graphite-300' : 'border-graphite-100 hover:border-plum-200'
              } ${hoje ? 'bg-plum-50' : ''}`}
            >
              <span className={`text-sm font-medium ${hoje ? 'text-plum-700' : 'text-graphite-700'}`}>
                {format(dia, 'd')}
              </span>
              <div className="flex flex-wrap gap-0.5">
                {doDia.slice(0, 4).map((a) => (
                  <span key={a.id} className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status]}`} />
                ))}
              </div>
              {doDia.length > 0 && (
                <span className="hidden text-[10px] text-graphite-400 sm:block">
                  {doDia.length} atend.
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
