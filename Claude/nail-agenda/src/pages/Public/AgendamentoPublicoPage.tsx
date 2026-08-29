import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Instagram,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { Button, Field, Input } from '../../components/ui/Primitives'
import { horariosDisponiveisNoDia, itensDeServicos, somaValor } from '../../lib/businessRules'
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
  gerarCodigoReserva,
  maskPhoneBR,
  onlyDigits,
} from '../../lib/format'
import { HeroSection } from './HeroSection'
import { ComoFuncionaSection } from './ComoFuncionaSection'

type Etapa = 1 | 2 | 3 | 4 | 5

const DIAS_VISIVEIS = 21

const transicaoEtapa = {
  initial: { opacity: 0, x: 24, filter: 'blur(4px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -24, filter: 'blur(4px)' },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
}

export function AgendamentoPublicoPage() {
  const { db, criarCliente, criarAgendamento } = useAppData()
  const navigate = useNavigate()
  const cfg = db.configuracao
  const reduzMovimento = useReducedMotion()

  const wizardRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const headerShadowProgress = useTransform(scrollY, [0, 80], [0, 1])
  const headerBoxShadow = useTransform(
    headerShadowProgress,
    [0, 1],
    ['0 1px 0 rgba(0,0,0,0)', '0 8px 24px -12px rgba(150,57,90,0.25)'],
  )

  const [etapa, setEtapa] = useState<Etapa>(1)
  const [servicoIds, setServicoIds] = useState<string[]>([])
  const [profissionalId, setProfissionalId] = useState<string>('')
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState<Date | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [aceite, setAceite] = useState(false)
  const [reserva, setReserva] = useState<{ codigo: string; agendamentoId: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const servicosAtivos = db.servicos.filter((s) => s.ativo)
  const servicosSelecionados = servicosAtivos.filter((s) => servicoIds.includes(s.id))
  const itens = useMemo(() => itensDeServicos(servicosSelecionados), [servicosSelecionados])
  const duracaoTotal = itens.reduce((acc, i) => acc + i.duracaoMinutos, 0)
  const valorTotal = somaValor(itens)
  const valorSinal = useMemo(() => {
    let total = 0
    for (const item of itens) {
      const s = servicosAtivos.find((x) => x.id === item.servicoId)
      if (!s || s.sinalTipo === 'nenhum') continue
      total += s.sinalTipo === 'valor_fixo' ? s.sinalValor : (item.precoCobrado * s.sinalValor) / 100
    }
    return Math.round(total * 100) / 100
  }, [itens, servicosAtivos])

  const profissionaisAtivos = db.usuarios.filter((u) => u.ativo)

  const diasVisiveis = useMemo(
    () => Array.from({ length: DIAS_VISIVEIS }, (_, i) => addDays(new Date(), i)),
    [],
  )

  const horariosDoDia = useMemo(() => {
    if (!diaSelecionado || !profissionalId || duracaoTotal === 0) return []
    return horariosDisponiveisNoDia({
      data: diaSelecionado,
      duracaoTotalMinutos: duracaoTotal,
      profissionalId,
      config: cfg,
      agendamentos: db.agendamentos,
    })
  }, [diaSelecionado, profissionalId, duracaoTotal, cfg, db.agendamentos])

  function toggleServico(id: string) {
    setServicoIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function irPara(proxima: Etapa) {
    setEtapa(proxima)
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollParaWizard() {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function confirmarReserva() {
    if (!horarioSelecionado || !nome.trim() || onlyDigits(telefone).length < 10 || !aceite) return
    setEnviando(true)

    let cliente = db.clientes.find((c) => onlyDigits(c.telefone) === onlyDigits(telefone))
    if (!cliente) {
      cliente = criarCliente({
        nome: nome.trim(),
        telefone: onlyDigits(telefone),
        consentimentoImagem: false,
      })
    }

    const fim = new Date(horarioSelecionado.getTime() + duracaoTotal * 60000)
    const codigo = gerarCodigoReserva()

    const resultado = criarAgendamento({
      clienteId: cliente.id,
      profissionalId,
      inicio: horarioSelecionado.toISOString(),
      fim: fim.toISOString(),
      status: 'pendente',
      itens,
      valorTotal,
      valorSinal,
      origem: 'publico',
      codigoReserva: codigo,
    })

    setEnviando(false)

    if (!resultado.ok) {
      alert(resultado.motivo)
      return
    }

    setReserva({ codigo, agendamentoId: resultado.agendamento.id })
    irPara(5)
  }

  return (
    <div className="min-h-dvh bg-cream">
      <motion.header
        ref={headerRef}
        style={{ boxShadow: headerBoxShadow }}
        className="sticky top-0 z-30 border-b border-graphite-200/60 bg-white/80 px-4 py-4 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={reduzMovimento ? undefined : { rotate: 12, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum-600 text-white"
            >
              <Sparkles size={18} />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-graphite-900">{cfg.nomeSalao}</p>
              {cfg.instagram && (
                <p className="flex items-center gap-1 text-xs text-graphite-400">
                  <Instagram size={11} /> {cfg.instagram}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/login')} className="text-xs font-medium text-plum-600 hover:underline">
            Sou profissional
          </button>
        </div>
      </motion.header>

      <HeroSection cfg={cfg} onAgendar={scrollParaWizard} />

      <ComoFuncionaSection />

      <div ref={wizardRef} className="scroll-mt-20 bg-gradient-to-b from-nude-50/60 via-cream to-cream">
        <main className="mx-auto max-w-lg px-4 py-12 sm:py-16">
          {etapa < 5 && (
            <div className="mb-6 flex items-center gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-graphite-200">
                  <motion.div
                    className="h-full rounded-full bg-plum-500"
                    initial={false}
                    animate={{ scaleX: n <= etapa ? 1 : 0 }}
                    style={{ transformOrigin: 'left' }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {etapa === 1 && (
              <motion.div key="etapa-1" {...transicaoEtapa}>
                <h1 className="text-lg font-semibold text-graphite-900">Escolha o serviço</h1>
                <p className="mb-4 text-sm text-graphite-400">Você pode selecionar mais de um.</p>
                <div className="space-y-2">
                  {servicosAtivos.map((s) => (
                    <motion.label
                      key={s.id}
                      whileHover={reduzMovimento ? undefined : { scale: 1.015, y: -1 }}
                      whileTap={reduzMovimento ? undefined : { scale: 0.99 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors ${servicoIds.includes(s.id) ? 'border-plum-400 ring-2 ring-plum-100' : 'border-graphite-100 hover:border-plum-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="accent-plum-600" checked={servicoIds.includes(s.id)} onChange={() => toggleServico(s.id)} />
                        <div>
                          <p className="text-sm font-medium text-graphite-900">{s.nome}</p>
                          <p className="text-xs text-graphite-400">{formatDuration(s.duracaoMinutos)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-graphite-800">{formatCurrency(s.preco)}</span>
                    </motion.label>
                  ))}
                </div>
                <BotaoContinuar disabled={servicoIds.length === 0} onClick={() => irPara(2)} />
              </motion.div>
            )}

            {etapa === 2 && (
              <motion.div key="etapa-2" {...transicaoEtapa}>
                <VoltarBtn onClick={() => irPara(1)} />
                <h1 className="text-lg font-semibold text-graphite-900">Escolha a profissional</h1>
                <p className="mb-4 text-sm text-graphite-400">Duração total: {formatDuration(duracaoTotal)}</p>
                <div className="space-y-2">
                  {profissionaisAtivos.map((u) => (
                    <motion.label
                      key={u.id}
                      whileHover={reduzMovimento ? undefined : { scale: 1.015, y: -1 }}
                      whileTap={reduzMovimento ? undefined : { scale: 0.99 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors ${profissionalId === u.id ? 'border-plum-400 ring-2 ring-plum-100' : 'border-graphite-100 hover:border-plum-200'}`}
                    >
                      <input
                        type="radio"
                        name="profissional"
                        className="accent-plum-600"
                        checked={profissionalId === u.id}
                        onChange={() => setProfissionalId(u.id)}
                      />
                      <span className="text-sm font-medium text-graphite-900">{u.nome}</span>
                    </motion.label>
                  ))}
                </div>
                <BotaoContinuar disabled={!profissionalId} onClick={() => irPara(3)} />
              </motion.div>
            )}

            {etapa === 3 && (
              <motion.div key="etapa-3" {...transicaoEtapa}>
                <VoltarBtn onClick={() => irPara(2)} />
                <h1 className="text-lg font-semibold text-graphite-900">Escolha data e horário</h1>
                <p className="mb-4 text-sm text-graphite-400">Mostrando apenas horários realmente disponíveis.</p>

                <div className="scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-1">
                  {diasVisiveis.map((dia) => {
                    const ativo = diaSelecionado && isSameDay(dia, diaSelecionado)
                    return (
                      <motion.button
                        key={dia.toISOString()}
                        whileHover={reduzMovimento ? undefined : { scale: 1.06 }}
                        whileTap={reduzMovimento ? undefined : { scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                        onClick={() => {
                          setDiaSelecionado(dia)
                          setHorarioSelecionado(null)
                        }}
                        className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 text-xs font-medium ${ativo ? 'border-plum-500 bg-plum-600 text-white shadow-md shadow-plum-600/30' : 'border-graphite-200 bg-white text-graphite-600'}`}
                      >
                        <span className="uppercase">{format(dia, 'EEE', { locale: ptBR })}</span>
                        <span className="text-base font-semibold">{format(dia, 'dd')}</span>
                      </motion.button>
                    )
                  })}
                </div>

                {diaSelecionado && (
                  <div>
                    {horariosDoDia.length === 0 ? (
                      <p className="rounded-xl bg-white p-4 text-center text-sm text-graphite-400 shadow-sm">
                        Sem horários livres neste dia. Tente outra data.
                      </p>
                    ) : (
                      <motion.div
                        className="grid grid-cols-4 gap-2"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
                      >
                        {horariosDoDia.map((h) => (
                          <motion.button
                            key={h.toISOString()}
                            variants={{
                              hidden: { opacity: 0, y: 6 },
                              visible: { opacity: 1, y: 0 },
                            }}
                            whileHover={reduzMovimento ? undefined : { scale: 1.06 }}
                            whileTap={reduzMovimento ? undefined : { scale: 0.94 }}
                            onClick={() => setHorarioSelecionado(h)}
                            className={`rounded-xl border py-2 text-sm font-medium ${horarioSelecionado?.getTime() === h.getTime() ? 'border-plum-500 bg-plum-600 text-white shadow-md shadow-plum-600/30' : 'border-graphite-200 bg-white text-graphite-700 hover:border-plum-300'}`}
                          >
                            {format(h, 'HH:mm')}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                <BotaoContinuar disabled={!horarioSelecionado} onClick={() => irPara(4)} />
              </motion.div>
            )}

            {etapa === 4 && (
              <motion.div key="etapa-4" {...transicaoEtapa}>
                <VoltarBtn onClick={() => irPara(3)} />
                <h1 className="text-lg font-semibold text-graphite-900">Seus dados</h1>
                <p className="mb-4 text-sm text-graphite-400">Para confirmarmos seu horário.</p>

                <div className="space-y-3">
                  <Field label="Nome completo" required>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                  </Field>
                  <Field label="WhatsApp" required>
                    <Input value={telefone} onChange={(e) => setTelefone(maskPhoneBR(e.target.value))} placeholder="(11) 91234-5678" />
                  </Field>
                </div>

                <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">Resumo</p>
                  <ResumoAgendamento
                    servicos={servicosSelecionados.map((s) => s.nome)}
                    data={diaSelecionado}
                    hora={horarioSelecionado}
                    valorTotal={valorTotal}
                    valorSinal={valorSinal}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-xs text-warning-700">
                  <p className="mb-1 font-semibold">Política de cancelamento e sinal</p>
                  <p>
                    Cancelamentos com menos de {cfg.politicaCancelamentoHoras}h de antecedência
                    {cfg.perdeSinalNaFalta ? ' ou faltas' : ''} podem resultar na perda do sinal pago.
                    {valorSinal > 0 && ` Um sinal de ${formatCurrency(valorSinal)} poderá ser solicitado para confirmar sua vaga.`}
                  </p>
                </div>

                <label className="mt-4 flex items-start gap-2 text-sm text-graphite-600">
                  <input type="checkbox" className="mt-0.5 accent-plum-600" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
                  Li e concordo com a política de cancelamento e sinal.
                </label>

                <motion.div
                  whileHover={reduzMovimento || !(nome.trim() && onlyDigits(telefone).length >= 10 && aceite) ? undefined : { scale: 1.02 }}
                  whileTap={reduzMovimento ? undefined : { scale: 0.98 }}
                  className="mt-5"
                >
                  <Button
                    className="w-full"
                    size="lg"
                    icon={<CalendarCheck size={16} />}
                    loading={enviando}
                    disabled={!nome.trim() || onlyDigits(telefone).length < 10 || !aceite}
                    onClick={confirmarReserva}
                  >
                    Confirmar agendamento
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {etapa === 5 && reserva && (
              <motion.div
                key="etapa-5"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600"
                >
                  <CheckCircle2 size={32} />
                </motion.div>
                <h1 className="text-xl font-semibold text-graphite-900">Solicitação enviada!</h1>
                <p className="mt-1 max-w-xs text-sm text-graphite-500">
                  Seu horário está reservado e aguarda confirmação de {cfg.nomeProfissionalPrincipal}.
                </p>

                <div className="mt-5 w-full rounded-2xl bg-white p-4 text-left shadow-sm">
                  <p className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-graphite-400">
                      Código da reserva
                    </span>
                    <span className="rounded-lg bg-plum-50 px-2 py-1 font-mono text-sm font-bold text-plum-700">
                      {reserva.codigo}
                    </span>
                  </p>
                  <ResumoAgendamento
                    servicos={servicosSelecionados.map((s) => s.nome)}
                    data={diaSelecionado}
                    hora={horarioSelecionado}
                    valorTotal={valorTotal}
                    valorSinal={valorSinal}
                  />
                </div>

                {cfg.endereco && (
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-graphite-400">
                    <MapPin size={13} /> {cfg.endereco}
                  </p>
                )}

                <Button className="mt-6 w-full" variant="outline" onClick={() => navigate('/agendar')}>
                  Fazer novo agendamento
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function BotaoContinuar({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const reduzMovimento = useReducedMotion()
  return (
    <motion.div
      whileHover={reduzMovimento || disabled ? undefined : { scale: 1.02 }}
      whileTap={reduzMovimento || disabled ? undefined : { scale: 0.98 }}
      className="mt-5"
    >
      <Button className="w-full" size="lg" disabled={disabled} onClick={onClick}>
        Continuar
      </Button>
    </motion.div>
  )
}

function VoltarBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-3 flex items-center gap-1 text-sm font-medium text-graphite-400 hover:text-graphite-600">
      <ChevronLeft size={16} /> Voltar
    </button>
  )
}

function ResumoAgendamento({
  servicos,
  data,
  hora,
  valorTotal,
  valorSinal,
}: {
  servicos: string[]
  data: Date | null
  hora: Date | null
  valorTotal: number
  valorSinal: number
}) {
  return (
    <div className="space-y-1.5 text-sm">
      {servicos.map((s) => (
        <div key={s} className="flex items-center gap-2 text-graphite-700">
          <Check size={14} className="text-success-500" /> {s}
        </div>
      ))}
      {data && hora && (
        <div className="flex items-center gap-2 pt-1 text-graphite-500">
          <Clock3 size={14} /> {formatDate(data.toISOString(), "dd 'de' MMMM")} às {formatTime(hora.toISOString())}
        </div>
      )}
      <div className="flex justify-between border-t border-graphite-100 pt-2 font-semibold text-graphite-900">
        <span>Total</span>
        <span>{formatCurrency(valorTotal)}</span>
      </div>
      {valorSinal > 0 && (
        <div className="flex justify-between text-xs text-graphite-400">
          <span>Sinal</span>
          <span>{formatCurrency(valorSinal)}</span>
        </div>
      )}
    </div>
  )
}
