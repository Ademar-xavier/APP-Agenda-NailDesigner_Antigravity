import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Plus, UserPlus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button, Field, Input, Select, Textarea } from '../../components/ui/Primitives'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import { horariosDisponiveisNoDia, itensDeServicos, somaValor } from '../../lib/businessRules'
import { formatCurrency, formatTime, maskPhoneBR, onlyDigits } from '../../lib/format'

export function NovoAgendamentoModal({
  open,
  onClose,
  dataInicial,
  profissionalInicial,
}: {
  open: boolean
  onClose: () => void
  dataInicial: Date
  profissionalInicial?: string
}) {
  const { db, criarCliente, criarAgendamento } = useAppData()
  const { notificar } = useToast()

  const [modoCliente, setModoCliente] = useState<'existente' | 'nova'>('existente')
  const [clienteId, setClienteId] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [profissionalId, setProfissionalId] = useState(profissionalInicial ?? db.usuarios[0]?.id ?? '')
  const [servicoIds, setServicoIds] = useState<string[]>([])
  const [data, setData] = useState(format(dataInicial, 'yyyy-MM-dd'))
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  const servicosAtivos = db.servicos.filter((s) => s.ativo)
  const servicosSelecionados = servicosAtivos.filter((s) => servicoIds.includes(s.id))
  const itens = useMemo(() => itensDeServicos(servicosSelecionados), [servicosSelecionados])
  const duracaoTotal = itens.reduce((acc, i) => acc + i.duracaoMinutos, 0)
  const valorTotal = somaValor(itens)

  const horariosDisponiveis = useMemo(() => {
    if (!profissionalId || duracaoTotal === 0) return []
    return horariosDisponiveisNoDia({
      data: new Date(`${data}T00:00:00`),
      duracaoTotalMinutos: duracaoTotal,
      profissionalId,
      config: db.configuracao,
      agendamentos: db.agendamentos,
    })
  }, [profissionalId, duracaoTotal, data, db.configuracao, db.agendamentos])

  function toggleServico(id: string) {
    setServicoIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    setHorarioSelecionado(null)
  }

  function resetar() {
    setModoCliente('existente')
    setClienteId('')
    setNovoNome('')
    setNovoTelefone('')
    setServicoIds([])
    setHorarioSelecionado(null)
    setObservacoes('')
  }

  function handleClose() {
    resetar()
    onClose()
  }

  async function handleSalvar() {
    if (!horarioSelecionado || itens.length === 0) return

    let clienteFinalId = clienteId
    if (modoCliente === 'nova') {
      if (!novoNome.trim() || !onlyDigits(novoTelefone)) {
        notificar('Preencha nome e telefone da nova cliente.', 'erro')
        return
      }
      const nova = criarCliente({
        nome: novoNome.trim(),
        telefone: onlyDigits(novoTelefone),
        consentimentoImagem: false,
      })
      clienteFinalId = nova.id
    }

    if (!clienteFinalId) {
      notificar('Selecione uma cliente.', 'erro')
      return
    }

    setSalvando(true)
    const inicio = new Date(horarioSelecionado)
    const fim = new Date(inicio.getTime() + duracaoTotal * 60000)

    const resultado = criarAgendamento({
      clienteId: clienteFinalId,
      profissionalId,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: 'pendente',
      itens,
      valorTotal,
      valorSinal: 0,
      observacoes: observacoes.trim() || undefined,
      origem: 'manual',
    })

    setSalvando(false)

    if (!resultado.ok) {
      notificar(resultado.motivo, 'erro')
      return
    }

    notificar('Agendamento criado com sucesso.')
    handleClose()
  }

  const podeSalvar =
    itens.length > 0 &&
    !!horarioSelecionado &&
    (modoCliente === 'existente' ? !!clienteId : novoNome.trim().length > 1)

  return (
    <Modal open={open} onClose={handleClose} title="Novo agendamento" size="lg" footer={
      <>
        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!podeSalvar} loading={salvando} icon={<Plus size={16} />}>
          Criar agendamento
        </Button>
      </>
    }>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex gap-2">
            <button
              onClick={() => setModoCliente('existente')}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${modoCliente === 'existente' ? 'border-plum-400 bg-plum-50 text-plum-700' : 'border-graphite-200 text-graphite-500'}`}
            >
              Cliente existente
            </button>
            <button
              onClick={() => setModoCliente('nova')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium ${modoCliente === 'nova' ? 'border-plum-400 bg-plum-50 text-plum-700' : 'border-graphite-200 text-graphite-500'}`}
            >
              <UserPlus size={14} /> Nova cliente
            </button>
          </div>
          {modoCliente === 'existente' ? (
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecione a cliente…</option>
              {db.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input placeholder="Nome completo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              <Input
                placeholder="(11) 91234-5678"
                value={novoTelefone}
                onChange={(e) => setNovoTelefone(maskPhoneBR(e.target.value))}
              />
            </div>
          )}
        </div>

        <Field label="Profissional">
          <Select value={profissionalId} onChange={(e) => { setProfissionalId(e.target.value); setHorarioSelecionado(null) }}>
            {db.usuarios.filter((u) => u.ativo).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Serviços" hint="Selecione um ou mais — as durações são somadas.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {servicosAtivos.map((s) => (
              <label
                key={s.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${servicoIds.includes(s.id) ? 'border-plum-400 bg-plum-50' : 'border-graphite-200'}`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={servicoIds.includes(s.id)}
                    onChange={() => toggleServico(s.id)}
                    className="accent-plum-600"
                  />
                  {s.nome}
                </span>
                <span className="text-xs text-graphite-400">{formatCurrency(s.preco)}</span>
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => { setData(e.target.value); setHorarioSelecionado(null) }} />
          </Field>
          <Field label="Duração total">
            <Input disabled value={duracaoTotal ? `${duracaoTotal} minutos` : '—'} />
          </Field>
        </div>

        <Field label="Horário" hint={horariosDisponiveis.length === 0 ? 'Selecione os serviços e uma data para ver horários livres.' : undefined}>
          {horariosDisponiveis.length > 0 ? (
            <div className="scrollbar-none flex flex-wrap gap-2">
              {horariosDisponiveis.map((h) => (
                <button
                  key={h.toISOString()}
                  onClick={() => setHorarioSelecionado(h.toISOString())}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${horarioSelecionado === h.toISOString() ? 'border-plum-500 bg-plum-600 text-white' : 'border-graphite-200 text-graphite-600 hover:border-plum-300'}`}
                >
                  {formatTime(h.toISOString())}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-graphite-400">Nenhum horário disponível para essa combinação.</p>
          )}
        </Field>

        <Field label="Observações">
          <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Preferências, alertas, pedidos especiais…" />
        </Field>

        {itens.length > 0 && (
          <div className="rounded-xl bg-nude-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-graphite-500">Valor total</span>
              <span className="font-semibold text-graphite-900">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
