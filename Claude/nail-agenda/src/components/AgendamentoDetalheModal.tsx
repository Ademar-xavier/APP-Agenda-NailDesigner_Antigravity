import { useMemo, useState } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  MessageCircle,
  UserX,
  XCircle,
  Wallet,
} from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button, Field, Select, Textarea, Input } from './ui/Primitives'
import { StatusAgendamentoBadge, StatusPagamentoBadge } from './StatusBadge'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { clientePorId } from '../lib/selectors'
import { sugerirProximaManutencao } from '../lib/businessRules'
import {
  formatCurrency,
  formatDateFull,
  formatDuration,
  formatTime,
  initials,
} from '../lib/format'
import { abrirWhatsApp, montarVariaveis, preencherTemplate } from '../lib/whatsapp'
import type { TipoPagamento } from '../types'

type Acao = null | 'cancelar' | 'concluir' | 'falta'

export function AgendamentoDetalheModal({
  agendamentoId,
  onClose,
}: {
  agendamentoId: string | null
  onClose: () => void
}) {
  const { db, confirmarAgendamento, cancelarAgendamento, marcarFalta, concluirAgendamento, registrarPagamento, registrarNotificacao } =
    useAppData()
  const { usuario } = useAuth()
  const { notificar } = useToast()

  const [acao, setAcao] = useState<Acao>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>('pix')
  const [valorPagamento, setValorPagamento] = useState(0)

  const agendamentoEncontrado = db.agendamentos.find((a) => a.id === agendamentoId)
  const cliente = clientePorId(db, agendamentoEncontrado?.clienteId ?? null)
  const pagamentos = db.pagamentos.filter((p) => p.agendamentoId === agendamentoId)
  const profissional = db.usuarios.find((u) => u.id === agendamentoEncontrado?.profissionalId)

  useMemo(() => {
    if (agendamentoEncontrado) setValorPagamento(agendamentoEncontrado.valorTotal)
  }, [agendamentoEncontrado])

  if (!agendamentoEncontrado) return null
  const agendamento = agendamentoEncontrado

  const duracao = agendamento.itens.reduce((acc, i) => acc + i.duracaoMinutos, 0)
  const jaTerminou = new Date(agendamento.fim) < new Date()
  const jaPago = pagamentos.some((p) => p.status === 'pago')

  function fechar() {
    setAcao(null)
    setMotivoCancelamento('')
    onClose()
  }

  function handleWhatsApp(tipo: 'confirmacao' | 'lembrete' | 'cancelamento') {
    if (!cliente) return
    const vars = montarVariaveis({ cliente, agendamento, config: db.configuracao })
    const mensagem = preencherTemplate(db.configuracao.modelosMensagem[tipo], vars)
    abrirWhatsApp(cliente.telefone, mensagem)
    registrarNotificacao({
      clienteId: cliente.id,
      agendamentoId: agendamento.id,
      tipo: tipo === 'confirmacao' ? 'confirmacao' : tipo === 'lembrete' ? 'lembrete' : 'outro',
      canal: 'whatsapp',
      mensagem,
      statusEnvio: 'enviado',
      enviadoEm: new Date().toISOString(),
    })
  }

  function handleConfirmar() {
    confirmarAgendamento(agendamento.id)
    notificar('Agendamento confirmado.')
  }

  function handleCancelar() {
    if (!motivoCancelamento.trim()) {
      notificar('Informe o motivo do cancelamento.', 'erro')
      return
    }
    cancelarAgendamento(agendamento.id, motivoCancelamento.trim(), usuario?.nome ?? 'Administradora')
    notificar('Agendamento cancelado. A vaga pode ser oferecida à lista de espera.')
    setAcao(null)
    setMotivoCancelamento('')
  }

  function handleFalta() {
    marcarFalta(agendamento.id)
    notificar('Falta registrada no histórico da cliente.', 'info')
    setAcao(null)
  }

  function handleConcluir() {
    const proxima = sugerirProximaManutencao(agendamento.itens, db.servicos, new Date(agendamento.inicio))
    concluirAgendamento(agendamento.id, { proximaManutencaoSugerida: proxima ?? null })
    if (valorPagamento > 0) {
      registrarPagamento({
        agendamentoId: agendamento.id,
        tipo: tipoPagamento,
        valor: valorPagamento,
        status: 'pago',
        dataPagamento: new Date().toISOString(),
      })
    }
    notificar('Atendimento concluído e pagamento registrado.')
    setAcao(null)
  }

  return (
    <Modal open onClose={fechar} title="Detalhes do agendamento" size="md">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nude-100 text-sm font-bold text-plum-700">
              {cliente ? initials(cliente.nome) : '?'}
            </div>
            <div>
              <p className="font-semibold text-graphite-900">{cliente?.nome ?? 'Cliente removida'}</p>
              <p className="text-xs text-graphite-400">{cliente?.telefone}</p>
            </div>
          </div>
          <StatusAgendamentoBadge status={agendamento.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-graphite-400">Data</p>
            <p className="font-medium text-graphite-800">{formatDateFull(agendamento.inicio)}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Horário</p>
            <p className="font-medium text-graphite-800">
              {formatTime(agendamento.inicio)} – {formatTime(agendamento.fim)} ({formatDuration(duracao)})
            </p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Profissional</p>
            <p className="font-medium text-graphite-800">{profissional?.nome}</p>
          </div>
          <div>
            <p className="text-xs text-graphite-400">Origem</p>
            <p className="font-medium capitalize text-graphite-800">{agendamento.origem.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="rounded-xl border border-graphite-100 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">
            Serviços
          </p>
          <div className="space-y-1.5">
            {agendamento.itens.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-graphite-700">{item.nomeServico}</span>
                <span className="font-medium text-graphite-900">{formatCurrency(item.precoCobrado)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-graphite-100 pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(agendamento.valorTotal)}</span>
          </div>
          {agendamento.valorSinal > 0 && (
            <div className="mt-1 flex justify-between text-xs text-graphite-500">
              <span>Sinal previsto</span>
              <span>{formatCurrency(agendamento.valorSinal)}</span>
            </div>
          )}
        </div>

        {agendamento.observacoes && (
          <div className="rounded-xl bg-nude-50 p-3 text-sm text-graphite-600">
            {agendamento.observacoes}
          </div>
        )}

        {agendamento.status === 'cancelado' && (
          <div className="rounded-xl bg-graphite-50 p-3 text-sm text-graphite-600">
            <p className="font-medium text-graphite-700">Motivo: {agendamento.motivoCancelamento}</p>
            <p className="text-xs text-graphite-400">
              Cancelado por {agendamento.canceladoPor}
              {agendamento.canceladoEm ? ` em ${formatDateFull(agendamento.canceladoEm)}` : ''}
            </p>
          </div>
        )}

        {pagamentos.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">
              Pagamentos
            </p>
            <div className="space-y-2">
              {pagamentos.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2 text-sm">
                  <span className="capitalize text-graphite-600">{p.tipo}</span>
                  <span className="font-medium text-graphite-900">{formatCurrency(p.valor)}</span>
                  <StatusPagamentoBadge status={p.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {agendamento.status !== 'bloqueado' && cliente && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={<MessageCircle size={14} />} onClick={() => handleWhatsApp('lembrete')}>
              Enviar lembrete
            </Button>
            {agendamento.status === 'pendente' && (
              <Button size="sm" variant="outline" icon={<MessageCircle size={14} />} onClick={() => handleWhatsApp('confirmacao')}>
                Pedir confirmação
              </Button>
            )}
          </div>
        )}

        {/* Ações de fluxo */}
        {acao === 'cancelar' && (
          <div className="space-y-3 rounded-xl border border-danger-200 bg-danger-50/50 p-3">
            <Field label="Motivo do cancelamento" required>
              <Textarea
                rows={2}
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex.: imprevisto pessoal, remarcação a pedido da cliente…"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAcao(null)}>
                Voltar
              </Button>
              <Button size="sm" variant="danger" onClick={handleCancelar}>
                Confirmar cancelamento
              </Button>
            </div>
          </div>
        )}

        {acao === 'concluir' && (
          <div className="space-y-3 rounded-xl border border-info-500/20 bg-info-50/60 p-3">
            {!jaTerminou && (
              <p className="text-xs text-warning-600">
                Este atendimento ainda não chegou ao horário final. Você pode concluir mesmo assim.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Forma de pagamento">
                <Select value={tipoPagamento} onChange={(e) => setTipoPagamento(e.target.value as TipoPagamento)}>
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="cartao">Cartão</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outro">Outro</option>
                </Select>
              </Field>
              <Field label="Valor recebido">
                <Input
                  type="number"
                  step="0.01"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAcao(null)}>
                Voltar
              </Button>
              <Button size="sm" onClick={handleConcluir}>
                Concluir e registrar
              </Button>
            </div>
          </div>
        )}

        {acao === 'falta' && (
          <div className="space-y-3 rounded-xl border border-danger-200 bg-danger-50/50 p-3">
            <p className="text-sm text-graphite-600">
              Confirma que a cliente não compareceu? Isso ficará registrado no histórico dela.
              {db.configuracao.perdeSinalNaFalta && agendamento.valorSinal > 0 && (
                <> O sinal será considerado perdido conforme a política configurada.</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAcao(null)}>
                Voltar
              </Button>
              <Button size="sm" variant="danger" onClick={handleFalta}>
                Registrar falta
              </Button>
            </div>
          </div>
        )}

        {!acao && agendamento.status !== 'bloqueado' && agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && agendamento.status !== 'falta' && (
          <div className="flex flex-wrap gap-2 border-t border-graphite-100 pt-4">
            {agendamento.status === 'pendente' && (
              <Button size="sm" icon={<CalendarCheck size={14} />} onClick={handleConfirmar}>
                Confirmar
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={<CheckCircle2 size={14} />} onClick={() => setAcao('concluir')}>
              Concluir
            </Button>
            <Button size="sm" variant="outline" icon={<UserX size={14} />} onClick={() => setAcao('falta')}>
              Marcar falta
            </Button>
            <Button size="sm" variant="ghost" className="text-danger-500 hover:bg-danger-50" icon={<XCircle size={14} />} onClick={() => setAcao('cancelar')}>
              Cancelar
            </Button>
          </div>
        )}

        {!jaPago && agendamento.status === 'confirmado' && !acao && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-600">
            <Wallet size={14} /> Sinal/pagamento ainda não registrado para este atendimento.
          </div>
        )}
      </div>
    </Modal>
  )
}
