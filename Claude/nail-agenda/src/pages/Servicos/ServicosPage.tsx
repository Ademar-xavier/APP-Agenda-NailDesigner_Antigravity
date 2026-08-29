import { useState } from 'react'
import { Plus, Sparkles, Edit3, Clock3, Timer } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageHeader } from '../../components/layout/AppShell'
import { Button, Card, EmptyState, Switch } from '../../components/ui/Primitives'
import { RevealGroup, RevealItem } from '../../components/motion/Reveal'
import { ServicoFormModal } from './ServicoFormModal'
import { useAppData } from '../../context/AppDataContext'
import { formatCurrency, formatDuration } from '../../lib/format'
import type { Servico } from '../../types'

const CATEGORIA_LABEL: Record<string, string> = {
  mao: 'Mão',
  pe: 'Pé',
  alongamento: 'Alongamento',
  manutencao: 'Manutenção',
  decoracao: 'Decoração',
  spa: 'Spa',
  outra: 'Outra',
}

export function ServicosPage() {
  const { db, atualizarServico } = useAppData()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Servico | undefined>()

  const servicosOrdenados = [...db.servicos].sort((a, b) => Number(b.ativo) - Number(a.ativo))

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${db.servicos.filter((s) => s.ativo).length} ativos de ${db.servicos.length}`}
        action={
          <Button icon={<Plus size={16} />} onClick={() => { setEditando(undefined); setModalAberto(true) }}>
            Novo serviço
          </Button>
        }
      />

      {servicosOrdenados.length === 0 ? (
        <EmptyState icon={<Sparkles size={32} />} title="Nenhum serviço cadastrado" />
      ) : (
        <RevealGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {servicosOrdenados.map((s) => (
            <RevealItem key={s.id} blur>
            <motion.div animate={{ opacity: s.ativo ? 1 : 0.55 }} transition={{ duration: 0.25 }}>
            <Card>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="font-medium text-graphite-900">{s.nome}</p>
                  <span className="text-xs text-graphite-400">{CATEGORIA_LABEL[s.categoria]}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 8 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setEditando(s); setModalAberto(true) }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-graphite-400 hover:bg-graphite-50 hover:text-plum-600"
                >
                  <Edit3 size={15} />
                </motion.button>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-graphite-500">
                <span className="flex items-center gap-1">
                  <Clock3 size={13} /> {formatDuration(s.duracaoMinutos)}
                </span>
                {s.intervaloManutencaoDias && (
                  <span className="flex items-center gap-1">
                    <Timer size={13} /> a cada {s.intervaloManutencaoDias}d
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-semibold text-graphite-900">{formatCurrency(s.preco)}</p>
                {s.sinalTipo !== 'nenhum' && (
                  <span className="rounded-full bg-plum-50 px-2 py-1 text-xs font-medium text-plum-600">
                    Sinal {s.sinalTipo === 'percentual' ? `${s.sinalValor}%` : formatCurrency(s.sinalValor)}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-graphite-100 pt-3 text-xs text-graphite-500">
                <Switch
                  checked={s.ativo}
                  onChange={(ativo) => atualizarServico(s.id, { ativo })}
                  label="Serviço ativo"
                />
              </div>
            </Card>
            </motion.div>
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      <ServicoFormModal open={modalAberto} onClose={() => setModalAberto(false)} servicoExistente={editando} />
    </div>
  )
}
