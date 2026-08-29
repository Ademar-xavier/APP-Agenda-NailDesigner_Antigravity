import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Modal } from '../../components/ui/Modal'
import { Button, Field, Input } from '../../components/ui/Primitives'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import { horariosDisponiveisNoDia, somaDuracao } from '../../lib/businessRules'
import { formatTime } from '../../lib/format'
import type { Agendamento } from '../../types'

export function RemarcarModal({
  agendamento,
  onClose,
}: {
  agendamento: Agendamento | null
  onClose: () => void
}) {
  const { db, atualizarAgendamento } = useAppData()
  const { notificar } = useToast()
  const [data, setData] = useState(
    agendamento ? format(new Date(agendamento.inicio), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
  )
  const [horario, setHorario] = useState<string | null>(null)

  const duracao = agendamento ? somaDuracao(agendamento.itens) : 0

  const horariosDisponiveis = useMemo(() => {
    if (!agendamento) return []
    return horariosDisponiveisNoDia({
      data: new Date(`${data}T00:00:00`),
      duracaoTotalMinutos: duracao,
      profissionalId: agendamento.profissionalId,
      config: db.configuracao,
      agendamentos: db.agendamentos.filter((a) => a.id !== agendamento.id),
      agora: new Date(),
    })
  }, [agendamento, data, duracao, db.configuracao, db.agendamentos])

  if (!agendamento) return null

  function confirmar() {
    if (!horario || !agendamento) return
    const inicio = new Date(horario)
    const fim = new Date(inicio.getTime() + duracao * 60000)
    atualizarAgendamento(agendamento.id, {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      status: 'pendente',
    })
    notificar('Agendamento remarcado com sucesso.')
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Remarcar agendamento"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!horario}>
            Remarcar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nova data">
          <Input type="date" value={data} onChange={(e) => { setData(e.target.value); setHorario(null) }} />
        </Field>
        <Field label="Horário disponível">
          {horariosDisponiveis.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {horariosDisponiveis.map((h) => (
                <button
                  key={h.toISOString()}
                  onClick={() => setHorario(h.toISOString())}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${horario === h.toISOString() ? 'border-plum-500 bg-plum-600 text-white' : 'border-graphite-200 text-graphite-600'}`}
                >
                  {formatTime(h.toISOString())}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-graphite-400">Nenhum horário livre nesse dia.</p>
          )}
        </Field>
      </div>
    </Modal>
  )
}
