import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { parseISO } from 'date-fns'
import {
  ArrowLeft,
  Cake,
  Camera,
  Edit3,
  Image as ImageIcon,
  MessageCircle,
  Phone,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../../components/layout/AppShell'
import { Button, Card, EmptyState, Field, Input, Select, SectionTitle, Textarea } from '../../components/ui/Primitives'
import { Modal } from '../../components/ui/Modal'
import { StatusAgendamentoBadge } from '../../components/StatusBadge'
import { AgendamentoDetalheModal } from '../../components/AgendamentoDetalheModal'
import { ClienteFormModal } from './ClienteFormModal'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import { formatCurrency, formatDate, formatDateFull, initials, maskPhoneBR } from '../../lib/format'
import { abrirWhatsApp } from '../../lib/whatsapp'
import type { FotoInspiracao } from '../../types'

export function ClienteDetalhePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, adicionarFoto } = useAppData()
  const { notificar } = useToast()

  const [editando, setEditando] = useState(false)
  const [modalFoto, setModalFoto] = useState(false)
  const [detalheAgendamentoId, setDetalheAgendamentoId] = useState<string | null>(null)

  const cliente = db.clientes.find((c) => c.id === id)

  const atendimentos = useMemo(
    () =>
      db.agendamentos
        .filter((a) => a.clienteId === id)
        .sort((a, b) => +parseISO(b.inicio) - +parseISO(a.inicio)),
    [db.agendamentos, id],
  )

  const fotos = useMemo(() => db.fotos.filter((f) => f.clienteId === id), [db.fotos, id])

  const resumoFinanceiro = useMemo(() => {
    const concluidos = atendimentos.filter((a) => a.status === 'concluido')
    const total = concluidos.reduce((acc, a) => acc + a.valorTotal, 0)
    const faltas = atendimentos.filter((a) => a.status === 'falta').length
    const cancelamentos = atendimentos.filter((a) => a.status === 'cancelado').length
    return { total, atendimentosConcluidos: concluidos.length, faltas, cancelamentos }
  }, [atendimentos])

  const proximaManutencao = atendimentos.find(
    (a) => a.status === 'concluido' && a.proximaManutencaoSugerida,
  )?.proximaManutencaoSugerida

  if (!cliente) {
    return (
      <EmptyState
        icon={<ShieldAlert size={32} />}
        title="Cliente não encontrada"
        action={
          <Button size="sm" onClick={() => navigate('/clientes')}>
            Voltar para clientes
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/clientes')}
        className="mb-3 flex items-center gap-1 text-sm font-medium text-graphite-500 hover:text-graphite-700"
      >
        <ArrowLeft size={16} /> Clientes
      </button>

      <PageHeader
        title={cliente.nome}
        subtitle={maskPhoneBR(cliente.telefone)}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<MessageCircle size={14} />}
              onClick={() => abrirWhatsApp(cliente.telefone, `Oi ${cliente.nome.split(' ')[0]}! `)}
            >
              WhatsApp
            </Button>
            <Button variant="secondary" size="sm" icon={<Edit3 size={14} />} onClick={() => setEditando(true)}>
              Editar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Linha do tempo */}
          <Card>
            <SectionTitle>Linha do tempo de atendimentos</SectionTitle>
            {atendimentos.length === 0 ? (
              <EmptyState title="Nenhum atendimento registrado ainda" />
            ) : (
              <div className="space-y-2">
                {atendimentos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setDetalheAgendamentoId(a.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-graphite-100 px-3 py-2.5 text-left hover:bg-graphite-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-graphite-900">
                        {a.itens.map((i) => i.nomeServico).join(', ') || 'Bloqueio'}
                      </p>
                      <p className="text-xs text-graphite-400">{formatDateFull(a.inicio)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-graphite-700">
                        {formatCurrency(a.valorTotal)}
                      </span>
                      <StatusAgendamentoBadge status={a.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Galeria */}
          <Card>
            <SectionTitle
              action={
                <Button size="sm" variant="outline" icon={<Camera size={14} />} onClick={() => setModalFoto(true)}>
                  Adicionar foto
                </Button>
              }
            >
              Galeria de fotos e inspirações
            </SectionTitle>
            {fotos.length === 0 ? (
              <EmptyState icon={<ImageIcon size={28} />} title="Nenhuma foto adicionada" />
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {fotos.map((f) => (
                  <FotoThumb key={f.id} foto={f} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Resumo financeiro */}
          <Card>
            <SectionTitle>Resumo</SectionTitle>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-graphite-400">Total gasto</p>
                <p className="font-semibold text-graphite-900">{formatCurrency(resumoFinanceiro.total)}</p>
              </div>
              <div>
                <p className="text-xs text-graphite-400">Atendimentos</p>
                <p className="font-semibold text-graphite-900">{resumoFinanceiro.atendimentosConcluidos}</p>
              </div>
              <div>
                <p className="text-xs text-graphite-400">Faltas</p>
                <p className="font-semibold text-danger-500">{resumoFinanceiro.faltas}</p>
              </div>
              <div>
                <p className="text-xs text-graphite-400">Cancelamentos</p>
                <p className="font-semibold text-graphite-500">{resumoFinanceiro.cancelamentos}</p>
              </div>
            </div>
            {proximaManutencao && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-terracotta-50 px-3 py-2 text-xs text-terracotta-500">
                <Sparkles size={14} />
                Próxima manutenção sugerida: {formatDate(proximaManutencao + 'T00:00:00', "dd 'de' MMMM")}
              </div>
            )}
          </Card>

          {/* Dados */}
          <Card>
            <SectionTitle>Dados e preferências</SectionTitle>
            <div className="space-y-3 text-sm">
              <InfoRow icon={<Phone size={14} />} label="Telefone" value={maskPhoneBR(cliente.telefone)} />
              {cliente.email && <InfoRow label="E-mail" value={cliente.email} />}
              {cliente.aniversario && (
                <InfoRow
                  icon={<Cake size={14} />}
                  label="Aniversário"
                  value={formatDate(cliente.aniversario + 'T00:00:00', "dd 'de' MMMM")}
                />
              )}
              {cliente.preferencias && <InfoRow label="Preferências" value={cliente.preferencias} />}
              {cliente.alergias && (
                <InfoRow label="Alergias / restrições" value={cliente.alergias} destaque />
              )}
              {cliente.observacoes && (
                <InfoRow label="Observações internas" value={cliente.observacoes} />
              )}
              <InfoRow
                label="Uso de imagem"
                value={cliente.consentimentoImagem ? 'Autorizado' : 'Não autorizado'}
              />
            </div>
          </Card>
        </div>
      </div>

      <ClienteFormModal
        open={editando}
        onClose={() => setEditando(false)}
        clienteExistente={cliente}
      />

      <NovaFotoModal
        open={modalFoto}
        onClose={() => setModalFoto(false)}
        onSalvar={(dados) => {
          adicionarFoto({ clienteId: cliente.id, ...dados })
          notificar('Foto adicionada ao perfil da cliente.')
          setModalFoto(false)
        }}
      />

      {detalheAgendamentoId && (
        <AgendamentoDetalheModal
          agendamentoId={detalheAgendamentoId}
          onClose={() => setDetalheAgendamentoId(null)}
        />
      )}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  destaque,
}: {
  icon?: ReactNode
  label: string
  value: string
  destaque?: boolean
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-graphite-400">
        {icon}
        {label}
      </p>
      <p className={`mt-0.5 ${destaque ? 'font-medium text-danger-500' : 'text-graphite-700'}`}>{value}</p>
    </div>
  )
}

function FotoThumb({ foto }: { foto: FotoInspiracao }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl bg-graphite-100">
      <img src={foto.url} alt={foto.legenda ?? ''} className="h-full w-full object-cover" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
        <p className="truncate text-[10px] text-white capitalize">{foto.tipo}</p>
      </div>
      {!foto.consentimentoPublico && (
        <span className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-graphite-500">
          Privada
        </span>
      )}
    </div>
  )
}

function NovaFotoModal({
  open,
  onClose,
  onSalvar,
}: {
  open: boolean
  onClose: () => void
  onSalvar: (dados: Omit<FotoInspiracao, 'id' | 'clienteId' | 'criadoEm'>) => void
}) {
  const [url, setUrl] = useState('')
  const [tipo, setTipo] = useState<FotoInspiracao['tipo']>('inspiracao')
  const [legenda, setLegenda] = useState('')
  const [consentimento, setConsentimento] = useState(false)

  function salvar() {
    if (!url.trim()) return
    onSalvar({ url: url.trim(), tipo, legenda: legenda.trim() || undefined, consentimentoPublico: consentimento })
    setUrl('')
    setLegenda('')
    setConsentimento(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar foto"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!url.trim()}>
            Adicionar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="URL da imagem" hint="No protótipo, use um link de imagem existente.">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as FotoInspiracao['tipo'])}>
            <option value="antes">Antes</option>
            <option value="depois">Depois</option>
            <option value="inspiracao">Inspiração</option>
          </Select>
        </Field>
        <Field label="Legenda">
          <Textarea rows={2} value={legenda} onChange={(e) => setLegenda(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-graphite-600">
          <input
            type="checkbox"
            className="accent-plum-600"
            checked={consentimento}
            onChange={(e) => setConsentimento(e.target.checked)}
          />
          Autorizado para galeria pública
        </label>
      </div>
    </Modal>
  )
}
