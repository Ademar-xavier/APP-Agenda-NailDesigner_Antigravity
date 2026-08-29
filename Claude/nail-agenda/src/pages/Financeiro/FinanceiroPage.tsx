import { useMemo, useState, type ReactNode } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { addMonths, subMonths } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '../../components/layout/AppShell'
import { Card, EmptyState, SectionTitle } from '../../components/ui/Primitives'
import { Reveal, RevealGroup, RevealItem } from '../../components/motion/Reveal'
import { StatusPagamentoBadge } from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import {
  clientePorId,
  faturamentoCancelado,
  faturamentoPerdidoPorFalta,
  faturamentoPrevisto,
  faturamentoRealizado,
  rankingProfissionais,
  rankingServicos,
  taxaConfirmacao,
  taxaFaltaCancelamento,
  taxaOcupacao,
  ticketMedio,
} from '../../lib/selectors'
import { formatCurrency, formatDateTime } from '../../lib/format'

export function FinanceiroPage() {
  const { db } = useAppData()
  const [mesRef, setMesRef] = useState(new Date())

  const inicioMes = startOfMonth(mesRef)
  const fimMes = endOfMonth(mesRef)

  const realizado = faturamentoRealizado(db, inicioMes, fimMes)
  const previsto = faturamentoPrevisto(db, inicioMes, fimMes)
  const cancelado = faturamentoCancelado(db, inicioMes, fimMes)
  const perdidoFalta = faturamentoPerdidoPorFalta(db, inicioMes, fimMes)
  const ticket = ticketMedio(db, inicioMes, fimMes)
  const ocupacao = taxaOcupacao(db, inicioMes, fimMes)
  const confirmacao = taxaConfirmacao(db, inicioMes, fimMes)
  const { falta, cancelamento } = taxaFaltaCancelamento(db, inicioMes, fimMes)

  const dadosGrafico = useMemo(() => {
    const dias = eachDayOfInterval({ start: inicioMes, end: fimMes })
    return dias.map((dia) => {
      const total = db.agendamentos
        .filter((a) => a.status === 'concluido')
        .filter((a) => format(parseISO(a.inicio), 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd'))
        .reduce((acc, a) => acc + a.valorTotal, 0)
      return { dia: format(dia, 'dd'), total }
    })
  }, [db.agendamentos, inicioMes, fimMes])

  const ranking = rankingServicos(db, inicioMes, fimMes)
  const rankingProf = rankingProfissionais(db, inicioMes, fimMes)

  const pagamentosPendentes = db.agendamentos
    .filter((a) => (a.status === 'confirmado' || a.status === 'pendente') && a.valorTotal > 0)
    .filter((a) => isWithinInterval(parseISO(a.inicio), { start: inicioMes, end: fimMes }))
    .filter((a) => !db.pagamentos.some((p) => p.agendamentoId === a.id && p.status === 'pago'))

  return (
    <div>
      <PageHeader title="Financeiro" />

      <div className="mb-4 flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMesRef((d) => subMonths(d, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-graphite-500 hover:bg-white"
        >
          <ChevronLeft size={18} />
        </motion.button>
        <AnimatePresence mode="wait">
          <motion.p
            key={format(mesRef, 'yyyy-MM')}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="w-40 text-center text-sm font-semibold capitalize text-graphite-800"
          >
            {format(mesRef, "MMMM 'de' yyyy", { locale: ptBR })}
          </motion.p>
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMesRef((d) => addMonths(d, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-graphite-500 hover:bg-white"
        >
          <ChevronRight size={18} />
        </motion.button>
      </div>

      <RevealGroup className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" stagger={0.05}>
        <RevealItem blur><Kpi icon={<TrendingUp size={16} />} label="Realizado" value={formatCurrency(realizado)} /></RevealItem>
        <RevealItem blur><Kpi icon={<Wallet size={16} />} label="Previsto" value={formatCurrency(previsto)} /></RevealItem>
        <RevealItem blur><Kpi icon={<TrendingDown size={16} />} label="Cancelado" value={formatCurrency(cancelado)} muted /></RevealItem>
        <RevealItem blur><Kpi icon={<TrendingDown size={16} />} label="Perdido (falta)" value={formatCurrency(perdidoFalta)} muted /></RevealItem>
        <RevealItem blur><Kpi icon={<Users size={16} />} label="Ticket médio" value={formatCurrency(ticket)} /></RevealItem>
        <RevealItem blur><Kpi icon={<TrendingUp size={16} />} label="Ocupação" value={`${ocupacao}%`} /></RevealItem>
      </RevealGroup>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Reveal>
          <Card>
            <SectionTitle>Faturamento realizado por dia</SectionTitle>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd8d5" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#8b8481' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8b8481' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 12, border: '1px solid #ecd3da', fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#96395a" radius={[6, 6, 0, 0]} animationDuration={900} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          </Reveal>

          <Reveal atraso={0.08}>
          <Card>
            <SectionTitle>Pagamentos pendentes</SectionTitle>
            {pagamentosPendentes.length === 0 ? (
              <EmptyState title="Nenhum pagamento pendente neste período" />
            ) : (
              <RevealGroup className="space-y-2" stagger={0.04}>
                {pagamentosPendentes.map((a) => {
                  const cliente = clientePorId(db, a.clienteId)
                  return (
                    <RevealItem key={a.id}>
                    <div className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-graphite-900">{cliente?.nome}</p>
                        <p className="text-xs text-graphite-400">{formatDateTime(a.inicio)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-graphite-700">{formatCurrency(a.valorTotal)}</span>
                        <StatusPagamentoBadge status="pendente" />
                      </div>
                    </div>
                    </RevealItem>
                  )
                })}
              </RevealGroup>
            )}
          </Card>
          </Reveal>
        </div>

        <div className="space-y-5">
          <Reveal direcao="right">
          <Card>
            <SectionTitle>Taxas do período</SectionTitle>
            <div className="space-y-3 text-sm">
              <BarraTaxa label="Confirmação" valor={confirmacao} cor="bg-success-500" />
              <BarraTaxa label="Falta" valor={falta} cor="bg-danger-500" />
              <BarraTaxa label="Cancelamento" valor={cancelamento} cor="bg-graphite-400" />
            </div>
          </Card>
          </Reveal>

          <Reveal direcao="right" atraso={0.08}>
          <Card>
            <SectionTitle>Serviços mais rentáveis</SectionTitle>
            {ranking.length === 0 ? (
              <EmptyState title="Sem atendimentos concluídos" />
            ) : (
              <div className="space-y-2">
                {ranking.slice(0, 6).map((r, i) => (
                  <div key={r.nome} className="flex items-center justify-between text-sm">
                    <span className="text-graphite-600">
                      {i + 1}. {r.nome} <span className="text-graphite-400">({r.quantidade}x)</span>
                    </span>
                    <span className="font-medium text-graphite-900">{formatCurrency(r.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </Reveal>

          <Reveal direcao="right" atraso={0.16}>
          <Card>
            <SectionTitle>Ranking de profissionais</SectionTitle>
            {rankingProf.length === 0 ? (
              <EmptyState title="Sem atendimentos concluídos" />
            ) : (
              <div className="space-y-2">
                {rankingProf.map((r) => (
                  <div key={r.nome} className="flex items-center justify-between text-sm">
                    <span className="text-graphite-600">
                      {r.nome} <span className="text-graphite-400">({r.quantidade}x)</span>
                    </span>
                    <span className="font-medium text-graphite-900">{formatCurrency(r.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, muted }: { icon: ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <Card className="!p-3.5">
      <div className="flex items-center gap-2 text-graphite-400">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`mt-1.5 text-base font-semibold sm:text-lg ${muted ? 'text-graphite-400' : 'text-graphite-900'}`}>
        {value}
      </p>
    </Card>
  )
}

function BarraTaxa({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-graphite-500">
        <span>{label}</span>
        <span className="font-medium text-graphite-700">{valor}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-graphite-100">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${valor}%` }} />
      </div>
    </div>
  )
}
