import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { Plus, Search, Users, MessageCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '../../components/layout/AppShell'
import { Button, Card, EmptyState, Input } from '../../components/ui/Primitives'
import { ClienteFormModal } from './ClienteFormModal'
import { useAppData } from '../../context/AppDataContext'
import { formatRelative, initials, onlyDigits } from '../../lib/format'
import { abrirWhatsApp } from '../../lib/whatsapp'

export function ClientesPage() {
  const { db } = useAppData()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const lista = [...db.clientes].sort((a, b) => a.nome.localeCompare(b.nome))
    if (!termo) return lista
    return lista.filter(
      (c) => c.nome.toLowerCase().includes(termo) || onlyDigits(c.telefone).includes(onlyDigits(termo)),
    )
  }, [db.clientes, busca])

  function ultimoAtendimento(clienteId: string) {
    const atendimentos = db.agendamentos
      .filter((a) => a.clienteId === clienteId && a.status === 'concluido')
      .sort((a, b) => +parseISO(b.inicio) - +parseISO(a.inicio))
    return atendimentos[0]
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${db.clientes.length} cadastradas`}
        action={
          <Button icon={<Plus size={16} />} onClick={() => setModalAberto(true)}>
            Nova cliente
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {clientesFiltrados.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="Nenhuma cliente encontrada"
          description="Tente outro termo de busca ou cadastre uma nova cliente."
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {clientesFiltrados.map((c) => {
              const ultimo = ultimoAtendimento(c.id)
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                >
                  <Card onClick={() => navigate(`/clientes/${c.id}`)} className="flex h-full flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nude-100 text-sm font-bold text-plum-700">
                        {initials(c.nome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-graphite-900">{c.nome}</p>
                        <p className="text-xs text-graphite-400">
                          {ultimo ? `Último atendimento ${formatRelative(ultimo.inicio)}` : 'Sem atendimentos concluídos'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirWhatsApp(c.telefone, `Oi ${c.nome.split(' ')[0]}! `)
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-success-600 hover:bg-success-50"
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                    {c.preferencias && (
                      <p className="line-clamp-2 text-xs text-graphite-500">{c.preferencias}</p>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <ClienteFormModal open={modalAberto} onClose={() => setModalAberto(false)} />
    </div>
  )
}
