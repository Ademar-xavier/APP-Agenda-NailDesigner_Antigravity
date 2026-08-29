import type { Agendamento, Cliente, ConfiguracaoSalao, Servico } from '../types'
import { formatCurrency, formatDate, formatTime, onlyDigits } from './format'

/** Substitui variáveis {{cliente}}, {{servico}}, {{data}}, {{hora}}, {{salao}}, {{link}} etc. */
export function preencherTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => vars[key] ?? '')
}

export function montarVariaveis(params: {
  cliente?: Cliente
  agendamento?: Agendamento
  servicos?: Servico[]
  config: ConfiguracaoSalao
}): Record<string, string> {
  const { cliente, agendamento, servicos, config } = params
  const nomesServicos =
    agendamento?.itens.map((i) => i.nomeServico).join(', ') ??
    servicos?.map((s) => s.nome).join(', ') ??
    ''
  return {
    cliente: cliente?.nome ?? '',
    servico: nomesServicos,
    data: agendamento ? formatDate(agendamento.inicio, "dd/MM") : '',
    hora: agendamento ? formatTime(agendamento.inicio) : '',
    salao: config.nomeSalao,
    profissional: config.nomeProfissionalPrincipal,
    valor: agendamento ? formatCurrency(agendamento.valorTotal) : '',
    sinal: agendamento ? formatCurrency(agendamento.valorSinal) : '',
    link: config.linkPublico,
    codigo: agendamento?.codigoReserva ?? '',
  }
}

/** Gera um link wa.me com a mensagem pré-preenchida (URL-encoded). */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  const numero = onlyDigits(telefone)
  const numeroComPais = numero.startsWith('55') ? numero : `55${numero}`
  return `https://wa.me/${numeroComPais}?text=${encodeURIComponent(mensagem)}`
}

export function abrirWhatsApp(telefone: string, mensagem: string) {
  window.open(linkWhatsApp(telefone, mensagem), '_blank', 'noopener,noreferrer')
}
