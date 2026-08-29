import type { StatusAgendamento, StatusListaEspera, StatusPagamento } from '../types'

const statusAgendamentoConfig: Record<StatusAgendamento, { label: string; classes: string }> = {
  pendente: { label: 'Pendente', classes: 'bg-warning-50 text-warning-600' },
  confirmado: { label: 'Confirmado', classes: 'bg-success-50 text-success-600' },
  concluido: { label: 'Concluído', classes: 'bg-info-50 text-info-500' },
  cancelado: { label: 'Cancelado', classes: 'bg-graphite-100 text-graphite-500' },
  falta: { label: 'Falta', classes: 'bg-danger-50 text-danger-600' },
  bloqueado: { label: 'Bloqueado', classes: 'bg-graphite-200 text-graphite-600' },
}

export function StatusAgendamentoBadge({ status }: { status: StatusAgendamento }) {
  const cfg = statusAgendamentoConfig[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  )
}

const statusPagamentoConfig: Record<StatusPagamento, { label: string; classes: string }> = {
  pendente: { label: 'Pendente', classes: 'bg-warning-50 text-warning-600' },
  sinal_pago: { label: 'Sinal pago', classes: 'bg-info-50 text-info-500' },
  pago_parcial: { label: 'Pago parcial', classes: 'bg-warning-50 text-warning-600' },
  pago: { label: 'Pago', classes: 'bg-success-50 text-success-600' },
  estornado: { label: 'Estornado', classes: 'bg-graphite-100 text-graphite-500' },
}

export function StatusPagamentoBadge({ status }: { status: StatusPagamento }) {
  const cfg = statusPagamentoConfig[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  )
}

const statusListaEsperaConfig: Record<StatusListaEspera, { label: string; classes: string }> = {
  aguardando: { label: 'Aguardando', classes: 'bg-warning-50 text-warning-600' },
  notificado: { label: 'Notificado', classes: 'bg-info-50 text-info-500' },
  convertido: { label: 'Convertido', classes: 'bg-success-50 text-success-600' },
  expirado: { label: 'Expirado', classes: 'bg-graphite-100 text-graphite-500' },
}

export function StatusListaEsperaBadge({ status }: { status: StatusListaEspera }) {
  const cfg = statusListaEsperaConfig[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  )
}
