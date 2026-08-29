import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button, Field, Input, Textarea } from '../../components/ui/Primitives'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../../context/ToastContext'
import { maskPhoneBR, onlyDigits } from '../../lib/format'
import type { Cliente } from '../../types'

export function ClienteFormModal({
  open,
  onClose,
  clienteExistente,
  onSalvo,
}: {
  open: boolean
  onClose: () => void
  clienteExistente?: Cliente
  onSalvo?: (cliente: Cliente) => void
}) {
  const { criarCliente, atualizarCliente } = useAppData()
  const { notificar } = useToast()

  const [nome, setNome] = useState(clienteExistente?.nome ?? '')
  const [telefone, setTelefone] = useState(
    clienteExistente ? maskPhoneBR(clienteExistente.telefone) : '',
  )
  const [email, setEmail] = useState(clienteExistente?.email ?? '')
  const [aniversario, setAniversario] = useState(clienteExistente?.aniversario ?? '')
  const [preferencias, setPreferencias] = useState(clienteExistente?.preferencias ?? '')
  const [alergias, setAlergias] = useState(clienteExistente?.alergias ?? '')
  const [observacoes, setObservacoes] = useState(clienteExistente?.observacoes ?? '')
  const [consentimento, setConsentimento] = useState(clienteExistente?.consentimentoImagem ?? false)

  function handleSalvar() {
    if (!nome.trim() || onlyDigits(telefone).length < 10) {
      notificar('Preencha nome e um telefone válido.', 'erro')
      return
    }
    const payload = {
      nome: nome.trim(),
      telefone: onlyDigits(telefone),
      email: email.trim() || undefined,
      aniversario: aniversario || undefined,
      preferencias: preferencias.trim() || undefined,
      alergias: alergias.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      consentimentoImagem: consentimento,
    }
    if (clienteExistente) {
      atualizarCliente(clienteExistente.id, payload)
      notificar('Dados da cliente atualizados.')
      onSalvo?.({ ...clienteExistente, ...payload })
    } else {
      const nova = criarCliente(payload)
      notificar('Cliente cadastrada com sucesso.')
      onSalvo?.(nova)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={clienteExistente ? 'Editar cliente' : 'Nova cliente'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>Salvar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome completo" required>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da cliente" />
          </Field>
          <Field label="WhatsApp / telefone" required>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(maskPhoneBR(e.target.value))}
              placeholder="(11) 91234-5678"
            />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="opcional" />
          </Field>
          <Field label="Aniversário">
            <Input type="date" value={aniversario} onChange={(e) => setAniversario(e.target.value)} />
          </Field>
        </div>
        <Field label="Preferências" hint="Formato, tamanho, técnica, cores e estilo preferido.">
          <Textarea rows={2} value={preferencias} onChange={(e) => setPreferencias(e.target.value)} />
        </Field>
        <Field label="Alergias e restrições">
          <Textarea rows={2} value={alergias} onChange={(e) => setAlergias(e.target.value)} />
        </Field>
        <Field label="Observações internas" hint="Visível apenas para a equipe.">
          <Textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-graphite-600">
          <input
            type="checkbox"
            className="accent-plum-600"
            checked={consentimento}
            onChange={(e) => setConsentimento(e.target.checked)}
          />
          Cliente autoriza uso de fotos em galeria pública
        </label>
      </div>
    </Modal>
  )
}
