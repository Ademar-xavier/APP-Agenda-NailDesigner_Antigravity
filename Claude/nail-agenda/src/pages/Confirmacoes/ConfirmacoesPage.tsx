import { useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import { BellRing, CalendarClock, MessageCircle, Send, UserCheck, Users2, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '../../components/layout/AppShell'
import { Button, Card, EmptyState, Tabs } from '../../components/ui/Primitives'
import { RevealGroup, RevealItem } from '../../components/motion/Reveal'
import { AgendamentoDetalheModal } from '../../components/AgendamentoDetalheModal'
import { RemarcarModal } from './RemarcarModal'
import { StatusListaEsperaBadge } from '../../components/StatusBadge'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import { clientePorId, servicoPorId } from '../../lib/selectors'
import { formatDate, formatDateTime, initials } from '../../lib/format'
import { abrirWhatsApp, montarVariaveis, preencherTemplate } from '../../lib/whatsapp'
import type { Agendamento } from '../../types'

type Aba = 'a_confirmar' | 'confirmados' | 'lista_espera' | 'cancelados'

export function ConfirmacoesPage() {
  const { db, atualizarListaEspera } = useAppData()
  const { notificar } = useToast()
  const [aba, setAba] = useState<Aba>('a_confirmar')
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [remarcando, setRemarcando] = useState<Agendamento | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const agora = new Date()

  const aConfirmar = db.agendamentos
    .filter((a) => a.status === 'pendente' && new Date(a.inicio) > agora)
    .sort((a, b) => +parseISO(a.inicio) - +parseISO(b.inicio))

  const confirmados = db.agendamentos
    .filter((a) => a.status === 'confirmado' && new Date(a.inicio) > agora)
    .sort((a, b) => +parseISO(a.inicio) - +parseISO(b.inicio))

  const cancelados = db.agendamentos
    .filter((a) => a.status === 'cancelado')
    .sort((a, b) => +parseISO(b.inicio) - +parseISO(a.inicio))

  const listaEspera = [...db.listaEspera].sort((a, b) => +parseISO(b.criadoEm) - +parseISO(a.criadoEm))

  function enviarLembrete(a: Agendamento) {
    const cliente = clientePorId(db, a.clienteId)
    if (!cliente) return
    const vars = montarVariaveis({ cliente, agendamento: a, config: db.configuracao })
    abrirWhatsApp(cliente.telefone, preencherTemplate(db.configuracao.modelosMensagem.lembrete, vars))
    notificar('Lembrete aberto no WhatsApp.')
  }

  function pedirConfirmacao(a: Agendamento) {
    const cliente = clientePorId(db, a.clienteId)
    if (!cliente) return
    const vars = montarVariaveis({ cliente, agendamento: a, config: db.configuracao })
    abrirWhatsApp(cliente.telefone, preencherTemplate(db.configuracao.modelosMensagem.confirmacao, vars))
    notificar('Mensagem de confirmação aberta no WhatsApp.')
  }

  function notificarFila(entradaId: string, clienteTelefone: string, mensagem: string) {
    abrirWhatsApp(clienteTelefone, mensagem)
    atualizarListaEspera(entradaId, { status: 'notificado' })
    notificar('Cliente notificada da vaga.')
  }

  return (
    <div>
      <PageHeader title="Confirmações e lista de espera" />

      <Tabs
        tabs={[
          { id: 'a_confirmar', label: 'A confirmar', count: aConfirmar.length },
          { id: 'confirmados', label: 'Confirmados', count: confirmados.length },
          { id: 'lista_espera', label: 'Lista de espera', count: listaEspera.filter((l) => l.status === 'aguardando').length },
          { id: 'cancelados', label: 'Cancelados', count: cancelados.length },
        ]}
        active={aba}
        onChange={(id) => setAba(id as Aba)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={aba}
          className="mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
        {aba === 'a_confirmar' &&
          (aConfirmar.length === 0 ? (
            <EmptyState icon={<BellRing size={32} />} title="Nada pendente" description="Todos os agendamentos futuros já foram confirmados." />
          ) : (
            <RevealGroup className="space-y-2" stagger={0.05}>
            {aConfirmar.map((a) => {
              const cliente = clientePorId(db, a.clienteId)
              return (
                <RevealItem key={a.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => setDetalheId(a.id)} className="flex flex-1 items-center gap-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-50 text-xs font-bold text-warning-600">
                      {cliente ? initials(cliente.nome) : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-graphite-900">{cliente?.nome}</p>
                      <p className="text-xs text-graphite-400">{formatDateTime(a.inicio)}</p>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" icon={<MessageCircle size={14} />} onClick={() => pedirConfirmacao(a)}>
                      Enviar lembrete
                    </Button>
                    <Button size="sm" variant="secondary" icon={<UserCheck size={14} />} onClick={() => setDetalheId(a.id)}>
                      Ver detalhes
                    </Button>
                  </div>
                </Card>
                </RevealItem>
              )
            })}
            </RevealGroup>
          ))}

        {aba === 'confirmados' &&
          (confirmados.length === 0 ? (
            <EmptyState icon={<UserCheck size={32} />} title="Nenhum atendimento confirmado no momento" />
          ) : (
            <RevealGroup className="space-y-2" stagger={0.05}>
            {confirmados.map((a) => {
              const cliente = clientePorId(db, a.clienteId)
              return (
                <RevealItem key={a.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => setDetalheId(a.id)} className="flex flex-1 items-center gap-3 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-xs font-bold text-success-600">
                      {cliente ? initials(cliente.nome) : '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-graphite-900">{cliente?.nome}</p>
                      <p className="text-xs text-graphite-400">{formatDateTime(a.inicio)}</p>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" icon={<MessageCircle size={14} />} onClick={() => enviarLembrete(a)}>
                      Lembrete
                    </Button>
                    <Button size="sm" variant="ghost" icon={<CalendarClock size={14} />} onClick={() => setRemarcando(a)}>
                      Remarcar
                    </Button>
                  </div>
                </Card>
                </RevealItem>
              )
            })}
            </RevealGroup>
          ))}

        {aba === 'lista_espera' &&
          (listaEspera.length === 0 ? (
            <EmptyState icon={<Users2 size={32} />} title="Lista de espera vazia" />
          ) : (
            <RevealGroup className="space-y-2" stagger={0.05}>
            {listaEspera.map((l) => {
              const cliente = db.clientes.find((c) => c.id === l.clienteId)
              const servico = servicoPorId(db, l.servicoId)
              if (!cliente || !servico) return null
              const mensagem = preencherTemplate(db.configuracao.modelosMensagem.listaEspera, {
                cliente: cliente.nome,
                servico: servico.nome,
                salao: db.configuracao.nomeSalao,
                data: l.dataPreferida ? formatDate(l.dataPreferida + 'T00:00:00') : 'a combinar',
                hora: '',
                link: db.configuracao.linkPublico,
              })
              return (
                <RevealItem key={l.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nude-100 text-xs font-bold text-plum-700">
                      {initials(cliente.nome)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-graphite-900">{cliente.nome}</p>
                      <p className="text-xs text-graphite-400">
                        {servico.nome} · {l.dataPreferida ? formatDate(l.dataPreferida + 'T00:00:00') : 'qualquer data'} ·{' '}
                        {l.periodoPreferido}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusListaEsperaBadge status={l.status} />
                    {l.status === 'aguardando' && (
                      <Button size="sm" icon={<Send size={14} />} onClick={() => notificarFila(l.id, cliente.telefone, mensagem)}>
                        Notificar vaga
                      </Button>
                    )}
                  </div>
                </Card>
                </RevealItem>
              )
            })}
            </RevealGroup>
          ))}

        {aba === 'cancelados' &&
          (cancelados.length === 0 ? (
            <EmptyState icon={<XCircle size={32} />} title="Nenhum cancelamento registrado" />
          ) : (
            <RevealGroup className="space-y-2" stagger={0.05}>
            {cancelados.map((a) => {
              const cliente = clientePorId(db, a.clienteId)
              const compatíveis = listaEspera.filter(
                (l) =>
                  l.status === 'aguardando' &&
                  a.itens.some((i) => i.servicoId === l.servicoId) &&
                  (!l.profissionalId || l.profissionalId === a.profissionalId),
              )
              return (
                <RevealItem key={a.id}>
                <Card>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-graphite-900">{cliente?.nome}</p>
                      <p className="text-xs text-graphite-400">
                        {formatDateTime(a.inicio)} · {a.motivoCancelamento}
                      </p>
                    </div>
                    {compatíveis.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandido(expandido === a.id ? null : a.id)}
                      >
                        {compatíveis.length} da fila compatível(is)
                      </Button>
                    )}
                  </div>
                  <AnimatePresence>
                    {expandido === a.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                      <div className="mt-3 space-y-2 border-t border-graphite-100 pt-3">
                        {compatíveis.map((l) => {
                          const clienteFila = db.clientes.find((c) => c.id === l.clienteId)
                          if (!clienteFila) return null
                          const vars = montarVariaveis({ cliente: clienteFila, agendamento: a, config: db.configuracao })
                          const mensagem = preencherTemplate(db.configuracao.modelosMensagem.listaEspera, vars)
                          return (
                            <div key={l.id} className="flex items-center justify-between rounded-xl bg-nude-50 px-3 py-2">
                              <span className="text-sm text-graphite-700">{clienteFila.nome}</span>
                              <Button size="sm" icon={<Send size={13} />} onClick={() => notificarFila(l.id, clienteFila.telefone, mensagem)}>
                                Oferecer vaga
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
                </RevealItem>
              )
            })}
            </RevealGroup>
          ))}
        </motion.div>
      </AnimatePresence>

      {detalheId && <AgendamentoDetalheModal agendamentoId={detalheId} onClose={() => setDetalheId(null)} />}
      {remarcando && <RemarcarModal agendamento={remarcando} onClose={() => setRemarcando(null)} />}
    </div>
  )
}
