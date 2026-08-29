import { useState } from 'react'
import { Copy, Plus, RotateCcw, Save, ShieldCheck, UserPlus } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '../../components/layout/AppShell'
import { Button, Card, Field, Input, SectionTitle, Switch, Tabs, Textarea } from '../../components/ui/Primitives'
import { Reveal, RevealGroup, RevealItem } from '../../components/motion/Reveal'
import { Modal } from '../../components/ui/Modal'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import { initials, maskPhoneBR } from '../../lib/format'
import type { ConfiguracaoSalao, HorarioDia, Perfil } from '../../types'

const DIAS: { key: keyof ConfiguracaoSalao['horarios']; label: string }[] = [
  { key: 'segunda', label: 'Segunda' },
  { key: 'terca', label: 'Terça' },
  { key: 'quarta', label: 'Quarta' },
  { key: 'quinta', label: 'Quinta' },
  { key: 'sexta', label: 'Sexta' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

type Aba = 'perfil' | 'horarios' | 'regras' | 'mensagens' | 'equipe'

export function ConfiguracoesPage() {
  const { db, atualizarConfiguracao, resetarDados } = useAppData()
  const { notificar } = useToast()
  const [aba, setAba] = useState<Aba>('perfil')
  const cfg = db.configuracao

  const [nomeSalao, setNomeSalao] = useState(cfg.nomeSalao)
  const [instagram, setInstagram] = useState(cfg.instagram ?? '')
  const [endereco, setEndereco] = useState(cfg.endereco ?? '')
  const [linkPublico, setLinkPublico] = useState(cfg.linkPublico)

  function salvarPerfil() {
    atualizarConfiguracao({ nomeSalao, instagram, endereco, linkPublico })
    notificar('Perfil atualizado.')
  }

  function copiarLink() {
    navigator.clipboard?.writeText(cfg.linkPublico)
    notificar('Link copiado para a área de transferência.')
  }

  return (
    <div>
      <PageHeader title="Configurações" />
      <Tabs
        tabs={[
          { id: 'perfil', label: 'Perfil' },
          { id: 'horarios', label: 'Horários' },
          { id: 'regras', label: 'Regras' },
          { id: 'mensagens', label: 'Mensagens' },
          { id: 'equipe', label: 'Equipe' },
        ]}
        active={aba}
        onChange={(id) => setAba(id as Aba)}
      />

      <div className="mt-4 max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={aba}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }}
          >
            {aba === 'perfil' && (
              <Card className="space-y-4">
                <SectionTitle>Perfil do salão</SectionTitle>
                <Field label="Nome do salão / profissional">
                  <Input value={nomeSalao} onChange={(e) => setNomeSalao(e.target.value)} />
                </Field>
                <Field label="Endereço">
                  <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
                </Field>
                <Field label="Instagram">
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seuinstagram" />
                </Field>
                <Field label="Link público de agendamento" hint="Compartilhe na bio do Instagram e no WhatsApp.">
                  <div className="flex gap-2">
                    <Input value={linkPublico} onChange={(e) => setLinkPublico(e.target.value)} />
                    <Button variant="outline" size="icon" onClick={copiarLink}>
                      <Copy size={16} />
                    </Button>
                  </div>
                </Field>
                <Button icon={<Save size={16} />} onClick={salvarPerfil}>
                  Salvar alterações
                </Button>
              </Card>
            )}

            {aba === 'horarios' && <HorariosForm />}

            {aba === 'regras' && <RegrasForm />}

            {aba === 'mensagens' && <MensagensForm />}

            {aba === 'equipe' && <EquipeForm />}
          </motion.div>
        </AnimatePresence>

        <Reveal atraso={0.1}>
        <Card className="mt-6 border-danger-200 bg-danger-50/40">
          <SectionTitle>Zona de demonstração</SectionTitle>
          <p className="mb-3 text-sm text-graphite-600">
            Restaure os dados de exemplo originais deste protótipo (clientes, agenda, financeiro).
          </p>
          <Button
            variant="danger"
            size="sm"
            icon={<RotateCcw size={14} />}
            onClick={() => {
              resetarDados()
              notificar('Dados de demonstração restaurados.', 'info')
            }}
          >
            Restaurar dados de demonstração
          </Button>
        </Card>
        </Reveal>
      </div>
    </div>
  )
}

function HorariosForm() {
  const { db, atualizarConfiguracao } = useAppData()
  const { notificar } = useToast()
  const [horarios, setHorarios] = useState(db.configuracao.horarios)

  function atualizarDia(dia: keyof ConfiguracaoSalao['horarios'], patch: Partial<HorarioDia>) {
    setHorarios((prev) => ({ ...prev, [dia]: { ...prev[dia], ...patch } }))
  }

  function salvar() {
    atualizarConfiguracao({ horarios })
    notificar('Horários de funcionamento atualizados.')
  }

  return (
    <Card className="space-y-3">
      <SectionTitle>Horários de funcionamento</SectionTitle>
      <RevealGroup stagger={0.04}>
      {DIAS.map(({ key, label }) => {
        const h = horarios[key]
        return (
          <RevealItem key={key}>
          <div className="flex flex-wrap items-center gap-3 border-b border-graphite-50 py-2 last:border-0">
            <label className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium text-graphite-700">
              <input
                type="checkbox"
                className="accent-plum-600"
                checked={h.ativo}
                onChange={(e) => atualizarDia(key, { ativo: e.target.checked })}
              />
              {label}
            </label>
            {h.ativo && (
              <>
                <Input type="time" className="w-28" value={h.inicio} onChange={(e) => atualizarDia(key, { inicio: e.target.value })} />
                <span className="text-graphite-300">–</span>
                <Input type="time" className="w-28" value={h.fim} onChange={(e) => atualizarDia(key, { fim: e.target.value })} />
                <span className="ml-2 text-xs text-graphite-400">Pausa:</span>
                <Input
                  type="time"
                  className="w-24"
                  value={h.pausaInicio ?? ''}
                  onChange={(e) => atualizarDia(key, { pausaInicio: e.target.value || undefined })}
                />
                <span className="text-graphite-300">–</span>
                <Input
                  type="time"
                  className="w-24"
                  value={h.pausaFim ?? ''}
                  onChange={(e) => atualizarDia(key, { pausaFim: e.target.value || undefined })}
                />
              </>
            )}
          </div>
          </RevealItem>
        )
      })}
      </RevealGroup>
      <Button icon={<Save size={16} />} onClick={salvar}>
        Salvar horários
      </Button>
    </Card>
  )
}

function RegrasForm() {
  const { db, atualizarConfiguracao } = useAppData()
  const { notificar } = useToast()
  const cfg = db.configuracao
  const [cancelamentoHoras, setCancelamentoHoras] = useState(cfg.politicaCancelamentoHoras)
  const [sinalPadrao, setSinalPadrao] = useState(cfg.politicaSinalPadraoPercentual)
  const [perdeSinal, setPerdeSinal] = useState(cfg.perdeSinalNaFalta)
  const [lembreteHoras, setLembreteHoras] = useState(cfg.lembreteHorasAntes)

  function salvar() {
    atualizarConfiguracao({
      politicaCancelamentoHoras: cancelamentoHoras,
      politicaSinalPadraoPercentual: sinalPadrao,
      perdeSinalNaFalta: perdeSinal,
      lembreteHorasAntes: lembreteHoras,
    })
    notificar('Regras atualizadas.')
  }

  return (
    <Card className="space-y-4">
      <SectionTitle>Regras de cancelamento, sinal e lembretes</SectionTitle>
      <Field label="Cancelamento sem custo até (horas antes)">
        <Input type="number" min={0} value={cancelamentoHoras} onChange={(e) => setCancelamentoHoras(Number(e.target.value))} />
      </Field>
      <Field label="Sinal padrão sugerido (%)" hint="Usado apenas como referência ao cadastrar novos serviços.">
        <Input type="number" min={0} max={100} value={sinalPadrao} onChange={(e) => setSinalPadrao(Number(e.target.value))} />
      </Field>
      <Field label="Lembrete enviado (horas antes do atendimento)">
        <Input type="number" min={1} value={lembreteHoras} onChange={(e) => setLembreteHoras(Number(e.target.value))} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-graphite-600">
        <input type="checkbox" className="accent-plum-600" checked={perdeSinal} onChange={(e) => setPerdeSinal(e.target.checked)} />
        Cliente perde o sinal em caso de falta
      </label>
      <Button icon={<Save size={16} />} onClick={salvar}>
        Salvar regras
      </Button>
    </Card>
  )
}

const MODELOS: { key: keyof ConfiguracaoSalao['modelosMensagem']; label: string }[] = [
  { key: 'confirmacao', label: 'Pedido de confirmação' },
  { key: 'lembrete', label: 'Lembrete de atendimento' },
  { key: 'cancelamento', label: 'Confirmação de cancelamento' },
  { key: 'manutencao', label: 'Convite de manutenção' },
  { key: 'listaEspera', label: 'Vaga disponível (lista de espera)' },
]

function MensagensForm() {
  const { db, atualizarConfiguracao } = useAppData()
  const { notificar } = useToast()
  const [modelos, setModelos] = useState(db.configuracao.modelosMensagem)

  function salvar() {
    atualizarConfiguracao({ modelosMensagem: modelos })
    notificar('Modelos de mensagem atualizados.')
  }

  return (
    <Card className="space-y-4">
      <SectionTitle>Modelos de mensagem para WhatsApp</SectionTitle>
      <p className="-mt-2 text-xs text-graphite-400">
        Use variáveis como {'{{cliente}}'}, {'{{servico}}'}, {'{{data}}'}, {'{{hora}}'}, {'{{salao}}'} e {'{{link}}'}.
      </p>
      {MODELOS.map(({ key, label }) => (
        <Field key={key} label={label}>
          <Textarea
            rows={2}
            value={modelos[key]}
            onChange={(e) => setModelos((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </Field>
      ))}
      <Button icon={<Save size={16} />} onClick={salvar}>
        Salvar modelos
      </Button>
    </Card>
  )
}

function EquipeForm() {
  const { db, atualizarUsuario, criarUsuario } = useAppData()
  const { notificar } = useToast()
  const [modalAberto, setModalAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [perfil, setPerfil] = useState<Perfil>('profissional')

  function adicionar() {
    if (!nome.trim()) {
      notificar('Informe o nome da profissional.', 'erro')
      return
    }
    criarUsuario({
      nome: nome.trim(),
      email: '',
      telefone: telefone.replace(/\D/g, ''),
      perfil,
      ativo: true,
      corAgenda: '#b8664a',
    })
    notificar('Profissional adicionada à equipe.')
    setModalAberto(false)
    setNome('')
    setTelefone('')
  }

  return (
    <Card className="space-y-3">
      <SectionTitle
        action={
          <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setModalAberto(true)}>
            Adicionar
          </Button>
        }
      >
        Usuários e permissões
      </SectionTitle>
      <RevealGroup className="space-y-2" stagger={0.06}>
        {db.usuarios.map((u) => (
          <RevealItem key={u.id}>
          <div className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nude-100 text-xs font-bold text-plum-700">
                {initials(u.nome)}
              </div>
              <div>
                <p className="text-sm font-medium text-graphite-900">{u.nome}</p>
                <p className="flex items-center gap-1 text-xs capitalize text-graphite-400">
                  {u.perfil === 'administradora' && <ShieldCheck size={12} />}
                  {u.perfil}
                  {u.perfil === 'profissional' && ' · sem acesso a dados financeiros globais'}
                </p>
              </div>
            </div>
            <Switch
              checked={u.ativo}
              onChange={(ativo) => atualizarUsuario(u.id, { ativo })}
              label={<span className="text-xs text-graphite-500">Ativo</span>}
            />
          </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <Modal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        title="Adicionar profissional"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button icon={<Plus size={16} />} onClick={adicionar}>
              Adicionar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={telefone} onChange={(e) => setTelefone(maskPhoneBR(e.target.value))} />
          </Field>
          <Field label="Perfil de acesso">
            <select
              className="w-full rounded-xl border border-graphite-200 px-3.5 py-2.5 text-sm"
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as Perfil)}
            >
              <option value="profissional">Profissional da equipe</option>
              <option value="administradora">Administradora</option>
            </select>
          </Field>
        </div>
      </Modal>
    </Card>
  )
}
