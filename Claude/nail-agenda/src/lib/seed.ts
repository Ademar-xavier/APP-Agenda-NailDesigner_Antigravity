import { addDays, format, setHours, setMinutes, startOfDay, subDays } from 'date-fns'
import { v4 as uuid } from 'uuid'
import type {
  Agendamento,
  Cliente,
  ConfiguracaoSalao,
  Database,
  FotoInspiracao,
  ItemAgendamento,
  ListaEspera,
  Notificacao,
  Pagamento,
  Servico,
  Usuario,
} from '../types'
import { somaValor } from './businessRules'

function iso(date: Date): string {
  return date.toISOString()
}

function dataHora(base: Date, dias: number, hora: number, minuto = 0): Date {
  return setMinutes(setHours(startOfDay(addDays(base, dias)), hora), minuto)
}

export function gerarSeed(): Database {
  const hoje = new Date()

  // ---------- Usuários ----------
  const admin: Usuario = {
    id: 'user-admin',
    nome: 'Sheila Santos',
    email: '',
    telefone: '35997141856',
    perfil: 'administradora',
    ativo: true,
    corAgenda: '#96395a',
  }
  const profissional2: Usuario = {
    id: 'user-prof-2',
    nome: 'Lurdinha',
    email: '',
    telefone: '35991821220',
    perfil: 'profissional',
    ativo: true,
    corAgenda: '#c17048',
  }
  const usuarios = [admin, profissional2]

  // ---------- Serviços ----------
  const servicos: Servico[] = [
    {
      id: 'srv-manicure',
      nome: 'Manicure tradicional',
      categoria: 'mao',
      duracaoMinutos: 45,
      preco: 45,
      sinalTipo: 'nenhum',
      sinalValor: 0,
      intervaloManutencaoDias: 15,
      custoEstimado: 6,
      ativo: true,
      criadoEm: iso(subDays(hoje, 200)),
    },
    {
      id: 'srv-esmaltacao-gel',
      nome: 'Esmaltação em gel',
      categoria: 'mao',
      duracaoMinutos: 60,
      preco: 70,
      sinalTipo: 'percentual',
      sinalValor: 30,
      intervaloManutencaoDias: 20,
      custoEstimado: 12,
      ativo: true,
      criadoEm: iso(subDays(hoje, 200)),
    },
    {
      id: 'srv-alongamento-fibra',
      nome: 'Alongamento em fibra',
      categoria: 'alongamento',
      duracaoMinutos: 120,
      preco: 160,
      sinalTipo: 'valor_fixo',
      sinalValor: 50,
      intervaloManutencaoDias: 21,
      custoEstimado: 35,
      ativo: true,
      criadoEm: iso(subDays(hoje, 190)),
    },
    {
      id: 'srv-manutencao-alongamento',
      nome: 'Manutenção de alongamento',
      categoria: 'manutencao',
      duracaoMinutos: 90,
      preco: 110,
      sinalTipo: 'valor_fixo',
      sinalValor: 30,
      intervaloManutencaoDias: 21,
      custoEstimado: 20,
      ativo: true,
      criadoEm: iso(subDays(hoje, 190)),
    },
    {
      id: 'srv-pedicure',
      nome: 'Pedicure spa',
      categoria: 'pe',
      duracaoMinutos: 60,
      preco: 55,
      sinalTipo: 'nenhum',
      sinalValor: 0,
      intervaloManutencaoDias: 30,
      custoEstimado: 9,
      ativo: true,
      criadoEm: iso(subDays(hoje, 180)),
    },
    {
      id: 'srv-combo-mao-pe',
      nome: 'Combo mão + pé',
      categoria: 'spa',
      duracaoMinutos: 100,
      preco: 95,
      sinalTipo: 'percentual',
      sinalValor: 20,
      intervaloManutencaoDias: 20,
      custoEstimado: 15,
      ativo: true,
      criadoEm: iso(subDays(hoje, 170)),
    },
    {
      id: 'srv-decoracao',
      nome: 'Nail art / decoração',
      categoria: 'decoracao',
      duracaoMinutos: 30,
      preco: 25,
      sinalTipo: 'nenhum',
      sinalValor: 0,
      intervaloManutencaoDias: null,
      custoEstimado: 5,
      ativo: true,
      criadoEm: iso(subDays(hoje, 150)),
    },
    {
      id: 'srv-spa-pes',
      nome: 'Spa dos pés',
      categoria: 'spa',
      duracaoMinutos: 75,
      preco: 80,
      sinalTipo: 'nenhum',
      sinalValor: 0,
      intervaloManutencaoDias: 30,
      custoEstimado: 14,
      ativo: false,
      criadoEm: iso(subDays(hoje, 300)),
    },
  ]

  // ---------- Clientes ----------
  const clientesBase: Array<Omit<Cliente, 'id' | 'criadoEm'>> = [
    {
      nome: 'Ana Beatriz Souza',
      telefone: '11991234001',
      email: 'anabeatriz@gmail.com',
      aniversario: format(setMinutes(setHours(new Date(hoje.getFullYear(), 8, 2), 0), 0), 'yyyy-MM-dd'),
      preferencias: 'Formato amendoado, tons nude e vinho, técnica em gel',
      observacoes: 'Prefere horários pela manhã',
      alergias: '',
      consentimentoImagem: true,
    },
    {
      nome: 'Bruna Ferreira',
      telefone: '11991234002',
      email: 'bruna.ferreira@gmail.com',
      preferencias: 'Quadrado, cores vibrantes, adora nail art',
      observacoes: '',
      alergias: 'Alergia leve a determinados removedores com acetona',
      consentimentoImagem: true,
    },
    {
      nome: 'Camille Duarte',
      telefone: '11991234003',
      preferencias: 'Francesinha clássica, unhas curtas',
      observacoes: 'Cliente pontual, avisa com antecedência se atrasar',
      alergias: '',
      consentimentoImagem: false,
    },
    {
      nome: 'Débora Martins',
      telefone: '11991234004',
      email: 'debora.martins@outlook.com',
      preferencias: 'Alongamento em fibra, formato coffin',
      observacoes: 'Indicada pela cliente Ana Beatriz',
      alergias: '',
      consentimentoImagem: true,
    },
    {
      nome: 'Elaine Cristina',
      telefone: '11991234005',
      preferencias: 'Manicure simples, esmalte tradicional',
      observacoes: 'Já faltou uma vez, confirmar sempre por WhatsApp',
      alergias: '',
      consentimentoImagem: false,
    },
    {
      nome: 'Fernanda Lima',
      telefone: '11991234006',
      email: 'fe.lima@gmail.com',
      preferencias: 'Tons pastel, cutícula bem feita',
      observacoes: '',
      alergias: '',
      consentimentoImagem: true,
    },
    {
      nome: 'Gabriela Nunes',
      telefone: '11991234007',
      preferencias: 'Combo mão e pé mensal',
      observacoes: 'Cliente fiel, vem toda manutenção',
      alergias: '',
      consentimentoImagem: true,
    },
    {
      nome: 'Helena Prado',
      telefone: '11991234008',
      email: 'helena.prado@gmail.com',
      preferencias: 'Alongamento e decoração temática',
      observacoes: '',
      alergias: 'Sensibilidade a lixas muito ásperas',
      consentimentoImagem: true,
    },
    {
      nome: 'Isabela Rocha',
      telefone: '11991234009',
      preferencias: 'Pedicure spa quinzenal',
      observacoes: '',
      alergias: '',
      consentimentoImagem: false,
    },
    {
      nome: 'Juliana Castro',
      telefone: '11991234010',
      email: 'ju.castro@gmail.com',
      preferencias: 'Esmaltação em gel vermelho',
      observacoes: 'Trabalha em horário comercial, prefere fim de tarde',
      alergias: '',
      consentimentoImagem: true,
    },
    {
      nome: 'Larissa Gomes',
      telefone: '11991234011',
      preferencias: 'Nail art delicada',
      observacoes: 'Inativa há alguns meses',
      alergias: '',
      consentimentoImagem: true,
    },
    {
      nome: 'Mariana Teixeira',
      telefone: '11991234012',
      email: 'mari.teixeira@gmail.com',
      preferencias: 'Manutenção de alongamento a cada 3 semanas',
      observacoes: 'Cliente nova, veio por indicação do Instagram',
      alergias: '',
      consentimentoImagem: true,
    },
  ]

  const clientes: Cliente[] = clientesBase.map((c, i) => ({
    ...c,
    id: `cli-${i + 1}`,
    criadoEm: iso(subDays(hoje, 200 - i * 10)),
  }))

  const clientePorNome = (nome: string) => clientes.find((c) => c.nome === nome)!

  // ---------- Agendamentos, pagamentos, fotos ----------
  const agendamentos: Agendamento[] = []
  const pagamentos: Pagamento[] = []
  const fotos: FotoInspiracao[] = []

  function criarItens(servicoIds: string[]): ItemAgendamento[] {
    return servicoIds.map((sid) => {
      const s = servicos.find((x) => x.id === sid)!
      return {
        id: uuid(),
        servicoId: s.id,
        nomeServico: s.nome,
        duracaoMinutos: s.duracaoMinutos,
        precoCobrado: s.preco,
      }
    })
  }

  function addAgendamento(params: {
    clienteNome: string
    profissionalId: string
    dias: number
    hora: number
    minuto?: number
    servicoIds: string[]
    status: Agendamento['status']
    origem: Agendamento['origem']
    valorSinalPago?: boolean
    observacoes?: string
    proximaManutencao?: boolean
  }) {
    const cliente = clientePorNome(params.clienteNome)
    const itens = criarItens(params.servicoIds)
    const duracaoTotal = itens.reduce((a, i) => a + i.duracaoMinutos, 0)
    const inicio = dataHora(hoje, params.dias, params.hora, params.minuto ?? 0)
    const fim = new Date(inicio.getTime() + duracaoTotal * 60000)
    const valorTotal = somaValor(itens)

    let valorSinal = 0
    for (const item of itens) {
      const s = servicos.find((x) => x.id === item.servicoId)!
      if (s.sinalTipo === 'valor_fixo') valorSinal += s.sinalValor
      if (s.sinalTipo === 'percentual') valorSinal += (item.precoCobrado * s.sinalValor) / 100
    }
    valorSinal = Math.round(valorSinal * 100) / 100

    const agId = `ag-${agendamentos.length + 1}`
    const ag: Agendamento = {
      id: agId,
      clienteId: cliente.id,
      profissionalId: params.profissionalId,
      inicio: iso(inicio),
      fim: iso(fim),
      status: params.status,
      itens,
      valorTotal,
      valorSinal,
      observacoes: params.observacoes,
      origem: params.origem,
      codigoReserva: params.origem === 'publico' ? `NB-${agId.toUpperCase()}` : undefined,
      criadoEm: iso(subDays(inicio, 2)),
    }

    if (params.status === 'cancelado') {
      ag.motivoCancelamento = 'Imprevisto pessoal da cliente'
      ag.canceladoPor = cliente.nome
      ag.canceladoEm = iso(subDays(inicio, 1))
    }

    if (params.status === 'concluido' && params.proximaManutencao) {
      const intervalos = itens
        .map((i) => servicos.find((s) => s.id === i.servicoId)?.intervaloManutencaoDias)
        .filter((v): v is number => !!v)
      if (intervalos.length) {
        ag.proximaManutencaoSugerida = format(
          addDays(inicio, Math.min(...intervalos)),
          'yyyy-MM-dd',
        )
      }
    }

    agendamentos.push(ag)

    if (params.status === 'concluido' || params.valorSinalPago) {
      pagamentos.push({
        id: uuid(),
        agendamentoId: agId,
        tipo: params.status === 'concluido' ? 'pix' : 'pix',
        valor: params.status === 'concluido' ? valorTotal : valorSinal,
        status: params.status === 'concluido' ? 'pago' : 'sinal_pago',
        dataPagamento: iso(params.status === 'concluido' ? fim : subDays(inicio, 1)),
      })
    }

    return ag
  }

  // Passado: concluídos, uma falta e um cancelamento
  addAgendamento({
    clienteNome: 'Ana Beatriz Souza',
    profissionalId: admin.id,
    dias: -10,
    hora: 9,
    servicoIds: ['srv-esmaltacao-gel'],
    status: 'concluido',
    origem: 'publico',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Gabriela Nunes',
    profissionalId: admin.id,
    dias: -9,
    hora: 14,
    servicoIds: ['srv-combo-mao-pe'],
    status: 'concluido',
    origem: 'manual',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Débora Martins',
    profissionalId: profissional2.id,
    dias: -8,
    hora: 10,
    servicoIds: ['srv-alongamento-fibra'],
    status: 'concluido',
    origem: 'publico',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Elaine Cristina',
    profissionalId: admin.id,
    dias: -7,
    hora: 11,
    servicoIds: ['srv-manicure'],
    status: 'falta',
    origem: 'publico',
  })
  addAgendamento({
    clienteNome: 'Juliana Castro',
    profissionalId: admin.id,
    dias: -6,
    hora: 16,
    servicoIds: ['srv-esmaltacao-gel', 'srv-decoracao'],
    status: 'concluido',
    origem: 'publico',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Isabela Rocha',
    profissionalId: profissional2.id,
    dias: -5,
    hora: 9,
    servicoIds: ['srv-pedicure'],
    status: 'concluido',
    origem: 'manual',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Fernanda Lima',
    profissionalId: admin.id,
    dias: -4,
    hora: 13,
    servicoIds: ['srv-manicure', 'srv-decoracao'],
    status: 'cancelado',
    origem: 'publico',
  })
  addAgendamento({
    clienteNome: 'Mariana Teixeira',
    profissionalId: admin.id,
    dias: -3,
    hora: 15,
    servicoIds: ['srv-manutencao-alongamento'],
    status: 'concluido',
    origem: 'publico',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Helena Prado',
    profissionalId: profissional2.id,
    dias: -2,
    hora: 10,
    servicoIds: ['srv-alongamento-fibra', 'srv-decoracao'],
    status: 'concluido',
    origem: 'manual',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Camille Duarte',
    profissionalId: admin.id,
    dias: -1,
    hora: 9,
    servicoIds: ['srv-manicure'],
    status: 'concluido',
    origem: 'publico',
    proximaManutencao: true,
  })

  // Hoje: alguns já concluídos de manhã, pendentes/confirmados no restante do dia
  addAgendamento({
    clienteNome: 'Bruna Ferreira',
    profissionalId: admin.id,
    dias: 0,
    hora: 9,
    servicoIds: ['srv-esmaltacao-gel'],
    status: 'concluido',
    origem: 'publico',
    proximaManutencao: true,
  })
  addAgendamento({
    clienteNome: 'Ana Beatriz Souza',
    profissionalId: admin.id,
    dias: 0,
    hora: 14,
    servicoIds: ['srv-manicure', 'srv-decoracao'],
    status: 'confirmado',
    origem: 'publico',
    valorSinalPago: false,
    observacoes: 'Cliente pediu tom vinho desta vez',
  })
  addAgendamento({
    clienteNome: 'Gabriela Nunes',
    profissionalId: profissional2.id,
    dias: 0,
    hora: 15,
    servicoIds: ['srv-combo-mao-pe'],
    status: 'confirmado',
    origem: 'publico',
    valorSinalPago: true,
  })
  addAgendamento({
    clienteNome: 'Elaine Cristina',
    profissionalId: admin.id,
    dias: 0,
    hora: 17,
    servicoIds: ['srv-manicure'],
    status: 'pendente',
    origem: 'publico',
  })

  // Próximos dias: confirmados, pendentes, um bloqueio pessoal
  addAgendamento({
    clienteNome: 'Débora Martins',
    profissionalId: profissional2.id,
    dias: 1,
    hora: 10,
    servicoIds: ['srv-manutencao-alongamento'],
    status: 'confirmado',
    origem: 'publico',
    valorSinalPago: true,
  })
  addAgendamento({
    clienteNome: 'Juliana Castro',
    profissionalId: admin.id,
    dias: 1,
    hora: 17,
    servicoIds: ['srv-esmaltacao-gel'],
    status: 'pendente',
    origem: 'publico',
  })
  addAgendamento({
    clienteNome: 'Fernanda Lima',
    profissionalId: admin.id,
    dias: 2,
    hora: 11,
    servicoIds: ['srv-manicure', 'srv-decoracao'],
    status: 'pendente',
    origem: 'publico',
  })
  addAgendamento({
    clienteNome: 'Mariana Teixeira',
    profissionalId: admin.id,
    dias: 3,
    hora: 9,
    servicoIds: ['srv-manutencao-alongamento'],
    status: 'confirmado',
    origem: 'publico',
    valorSinalPago: true,
  })
  addAgendamento({
    clienteNome: 'Helena Prado',
    profissionalId: profissional2.id,
    dias: 4,
    hora: 13,
    servicoIds: ['srv-alongamento-fibra'],
    status: 'confirmado',
    origem: 'manual',
    valorSinalPago: true,
  })
  addAgendamento({
    clienteNome: 'Camille Duarte',
    profissionalId: admin.id,
    dias: 5,
    hora: 10,
    servicoIds: ['srv-manicure'],
    status: 'pendente',
    origem: 'publico',
  })

  // Bloqueio pessoal (dentista) na agenda da administradora
  {
    const inicio = dataHora(hoje, 2, 15, 30)
    const fim = dataHora(hoje, 2, 16, 30)
    agendamentos.push({
      id: `ag-${agendamentos.length + 1}`,
      clienteId: null,
      profissionalId: admin.id,
      inicio: iso(inicio),
      fim: iso(fim),
      status: 'bloqueado',
      itens: [],
      valorTotal: 0,
      valorSinal: 0,
      origem: 'manual',
      tituloBloqueio: 'Compromisso pessoal (dentista)',
      criadoEm: iso(subDays(inicio, 5)),
    })
  }

  // ---------- Fotos ----------
  fotos.push(
    {
      id: uuid(),
      clienteId: clientePorNome('Ana Beatriz Souza').id,
      tipo: 'inspiracao',
      url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
      legenda: 'Referência de tom vinho amendoado',
      consentimentoPublico: true,
      criadoEm: iso(subDays(hoje, 12)),
    },
    {
      id: uuid(),
      clienteId: clientePorNome('Bruna Ferreira').id,
      tipo: 'depois',
      url: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=600',
      legenda: 'Nail art floral quadrado',
      consentimentoPublico: true,
      criadoEm: iso(subDays(hoje, 3)),
    },
    {
      id: uuid(),
      clienteId: clientePorNome('Helena Prado').id,
      tipo: 'antes',
      url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600',
      legenda: 'Unha natural antes do alongamento',
      consentimentoPublico: false,
      criadoEm: iso(subDays(hoje, 2)),
    },
  )

  // ---------- Lista de espera ----------
  const listaEspera: ListaEspera[] = [
    {
      id: uuid(),
      clienteId: clientePorNome('Larissa Gomes').id,
      servicoId: 'srv-esmaltacao-gel',
      profissionalId: null,
      dataPreferida: format(addDays(hoje, 1), 'yyyy-MM-dd'),
      periodoPreferido: 'tarde',
      status: 'aguardando',
      criadoEm: iso(subDays(hoje, 2)),
    },
    {
      id: uuid(),
      clienteId: clientePorNome('Isabela Rocha').id,
      servicoId: 'srv-pedicure',
      profissionalId: profissional2.id,
      dataPreferida: format(addDays(hoje, 2), 'yyyy-MM-dd'),
      periodoPreferido: 'manha',
      status: 'aguardando',
      criadoEm: iso(subDays(hoje, 1)),
    },
    {
      id: uuid(),
      clienteId: clientePorNome('Camille Duarte').id,
      servicoId: 'srv-manicure',
      profissionalId: admin.id,
      dataPreferida: null,
      periodoPreferido: 'qualquer',
      status: 'aguardando',
      criadoEm: iso(hoje),
    },
  ]

  // ---------- Notificações ----------
  const notificacoes: Notificacao[] = [
    {
      id: uuid(),
      clienteId: clientePorNome('Ana Beatriz Souza').id,
      agendamentoId: agendamentos.find(
        (a) => a.clienteId === clientePorNome('Ana Beatriz Souza').id && a.status === 'confirmado',
      )?.id,
      tipo: 'lembrete',
      canal: 'whatsapp',
      mensagem: 'Lembrete enviado 24h antes do atendimento.',
      statusEnvio: 'enviado',
      enviadoEm: iso(subDays(hoje, 0)),
      criadoEm: iso(subDays(hoje, 0)),
    },
    {
      id: uuid(),
      clienteId: clientePorNome('Gabriela Nunes').id,
      tipo: 'manutencao',
      canal: 'whatsapp',
      mensagem: 'Convite de retorno para manutenção enviado.',
      statusEnvio: 'respondido',
      enviadoEm: iso(subDays(hoje, 1)),
      respondidoEm: iso(subDays(hoje, 1)),
      criadoEm: iso(subDays(hoje, 1)),
    },
  ]

  // ---------- Configuração ----------
  const horarioPadrao = {
    ativo: true,
    inicio: '09:00',
    fim: '19:00',
    pausaInicio: '12:30',
    pausaFim: '13:30',
  }

  const configuracao: ConfiguracaoSalao = {
    nomeSalao: 'Sheila Santos Nails Designer',
    nomeProfissionalPrincipal: 'Sheila Santos',
    endereco: '',
    instagram: '',
    linkPublico: 'https://agenda.exemplo.com/sheilasantosnails',
    fusoHorario: 'America/Sao_Paulo',
    horarios: {
      domingo: { ativo: false, inicio: '09:00', fim: '18:00' },
      segunda: { ...horarioPadrao },
      terca: { ...horarioPadrao },
      quarta: { ...horarioPadrao },
      quinta: { ...horarioPadrao },
      sexta: { ...horarioPadrao },
      sabado: { ativo: true, inicio: '09:00', fim: '16:00' },
    },
    politicaCancelamentoHoras: 12,
    politicaSinalPadraoPercentual: 30,
    perdeSinalNaFalta: true,
    lembreteHorasAntes: 24,
    modelosMensagem: {
      confirmacao:
        'Oi {{cliente}}! Seu horário de {{servico}} no {{salao}} está agendado para {{data}} às {{hora}}. Pode confirmar pra gente? 💅',
      lembrete:
        'Oi {{cliente}}, passando para lembrar do seu horário amanhã às {{hora}} para {{servico}}. Nos vemos lá! 😊',
      cancelamento:
        'Oi {{cliente}}, confirmamos o cancelamento do seu horário de {{data}} às {{hora}}. Quando quiser remarcar é só chamar por aqui!',
      manutencao:
        'Oi {{cliente}}! Já faz um tempinho desde seu último {{servico}}. Que tal agendar sua manutenção? Reserve pelo link: {{link}}',
      listaEspera:
        'Oi {{cliente}}! Abriu um horário em {{data}} às {{hora}} para {{servico}} no {{salao}}. Quer garantir sua vaga? Responda o mais rápido possível!',
    },
  }

  return {
    usuarios,
    clientes,
    servicos,
    agendamentos,
    pagamentos,
    fotos,
    listaEspera,
    notificacoes,
    configuracao,
  }
}
