import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button, Field, Input, Select } from '../../components/ui/Primitives'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import type { CategoriaServico, Servico, SinalTipo } from '../../types'

const CATEGORIAS: { id: CategoriaServico; label: string }[] = [
  { id: 'mao', label: 'Mão' },
  { id: 'pe', label: 'Pé' },
  { id: 'alongamento', label: 'Alongamento' },
  { id: 'manutencao', label: 'Manutenção' },
  { id: 'decoracao', label: 'Decoração' },
  { id: 'spa', label: 'Spa' },
  { id: 'outra', label: 'Outra' },
]

export function ServicoFormModal({
  open,
  onClose,
  servicoExistente,
}: {
  open: boolean
  onClose: () => void
  servicoExistente?: Servico
}) {
  const { criarServico, atualizarServico } = useAppData()
  const { notificar } = useToast()

  const [nome, setNome] = useState(servicoExistente?.nome ?? '')
  const [categoria, setCategoria] = useState<CategoriaServico>(servicoExistente?.categoria ?? 'mao')
  const [duracao, setDuracao] = useState(servicoExistente?.duracaoMinutos ?? 60)
  const [preco, setPreco] = useState(servicoExistente?.preco ?? 0)
  const [sinalTipo, setSinalTipo] = useState<SinalTipo>(servicoExistente?.sinalTipo ?? 'nenhum')
  const [sinalValor, setSinalValor] = useState(servicoExistente?.sinalValor ?? 0)
  const [intervaloManutencao, setIntervaloManutencao] = useState(
    servicoExistente?.intervaloManutencaoDias?.toString() ?? '',
  )
  const [custoEstimado, setCustoEstimado] = useState(servicoExistente?.custoEstimado?.toString() ?? '')
  const [ativo, setAtivo] = useState(servicoExistente?.ativo ?? true)

  function salvar() {
    if (!nome.trim() || duracao <= 0 || preco < 0) {
      notificar('Preencha nome, duração e preço corretamente.', 'erro')
      return
    }
    const payload = {
      nome: nome.trim(),
      categoria,
      duracaoMinutos: duracao,
      preco,
      sinalTipo,
      sinalValor: sinalTipo === 'nenhum' ? 0 : sinalValor,
      intervaloManutencaoDias: intervaloManutencao ? Number(intervaloManutencao) : null,
      custoEstimado: custoEstimado ? Number(custoEstimado) : null,
      ativo,
    }
    if (servicoExistente) {
      atualizarServico(servicoExistente.id, payload)
      notificar('Serviço atualizado.')
    } else {
      criarServico(payload)
      notificar('Serviço cadastrado.')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={servicoExistente ? 'Editar serviço' : 'Novo serviço'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome do serviço" required>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Esmaltação em gel" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaServico)}>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duração (minutos)" required>
            <Input type="number" min={5} step={5} value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço padrão (R$)" required>
            <Input type="number" min={0} step={0.5} value={preco} onChange={(e) => setPreco(Number(e.target.value))} />
          </Field>
          <Field label="Custo de material estimado (R$)">
            <Input type="number" min={0} step={0.5} value={custoEstimado} onChange={(e) => setCustoEstimado(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exige sinal?">
            <Select value={sinalTipo} onChange={(e) => setSinalTipo(e.target.value as SinalTipo)}>
              <option value="nenhum">Não exige</option>
              <option value="valor_fixo">Valor fixo</option>
              <option value="percentual">Percentual</option>
            </Select>
          </Field>
          <Field label={sinalTipo === 'percentual' ? 'Sinal (%)' : 'Sinal (R$)'}>
            <Input
              type="number"
              min={0}
              step={sinalTipo === 'percentual' ? 1 : 0.5}
              value={sinalValor}
              disabled={sinalTipo === 'nenhum'}
              onChange={(e) => setSinalValor(Number(e.target.value))}
            />
          </Field>
        </div>
        <Field label="Intervalo sugerido para manutenção (dias)" hint="Deixe em branco se não houver manutenção prevista.">
          <Input
            type="number"
            min={0}
            value={intervaloManutencao}
            onChange={(e) => setIntervaloManutencao(e.target.value)}
            placeholder="Ex.: 20"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-graphite-600">
          <input type="checkbox" className="accent-plum-600" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Serviço ativo (disponível para agendamento)
        </label>
      </div>
    </Modal>
  )
}
