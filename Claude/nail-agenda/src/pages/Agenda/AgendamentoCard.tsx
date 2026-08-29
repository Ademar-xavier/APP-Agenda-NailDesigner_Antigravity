import { Ban, Lock } from 'lucide-react'
import type { Agendamento } from '../../types'
import { useAppData } from '../../context/AppDataContext'
import { clientePorId } from '../../lib/selectors'
import { formatCurrency, formatTime, initials } from '../../lib/format'
import { StatusAgendamentoBadge } from '../../components/StatusBadge'

const corBorda: Record<Agendamento['status'], string> = {
  pendente: 'border-l-warning-500',
  confirmado: 'border-l-success-500',
  concluido: 'border-l-info-500',
  cancelado: 'border-l-graphite-300',
  falta: 'border-l-danger-500',
  bloqueado: 'border-l-graphite-400',
}

export function AgendamentoCard({
  agendamento,
  onClick,
  compact,
}: {
  agendamento: Agendamento
  onClick: () => void
  compact?: boolean
}) {
  const { db } = useAppData()

  if (agendamento.status === 'bloqueado') {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border border-l-4 bg-graphite-50 px-3 py-2.5 text-left ${corBorda.bloqueado}`}
      >
        <Lock size={16} className="shrink-0 text-graphite-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-graphite-600">
            {agendamento.tituloBloqueio ?? 'Horário bloqueado'}
          </p>
          <p className="text-xs text-graphite-400">
            {formatTime(agendamento.inicio)} – {formatTime(agendamento.fim)}
          </p>
        </div>
      </button>
    )
  }

  const cliente = clientePorId(db, agendamento.clienteId)

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border border-l-4 bg-white px-3 py-2.5 text-left shadow-sm transition-shadow hover:shadow-md ${corBorda[agendamento.status]}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-nude-100 text-xs font-bold text-plum-700">
        {cliente ? initials(cliente.nome) : <Ban size={14} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-graphite-900">
            {cliente?.nome ?? 'Cliente removida'}
          </p>
          {!compact && <StatusAgendamentoBadge status={agendamento.status} />}
        </div>
        <p className="truncate text-xs text-graphite-400">
          {agendamento.itens.map((i) => i.nomeServico).join(', ')}
        </p>
        <p className="mt-0.5 text-xs font-medium text-graphite-500">
          {formatTime(agendamento.inicio)} – {formatTime(agendamento.fim)} ·{' '}
          {formatCurrency(agendamento.valorTotal)}
        </p>
      </div>
      {compact && <StatusAgendamentoBadge status={agendamento.status} />}
    </button>
  )
}
