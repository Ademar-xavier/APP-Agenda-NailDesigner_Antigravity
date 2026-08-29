# Briefing para criação do app — Agenda Nail Designer

## Objetivo

Criar um aplicativo mobile-first para uma manicure / nail designer controlar agenda, clientes, confirmações, recorrência de manutenção e resultados financeiros. O app deve ser simples de usar no dia a dia, visualmente elegante e totalmente adaptado ao uso pelo celular.

O objetivo principal é reduzir faltas e horários ociosos, facilitar o agendamento pelo Instagram e WhatsApp, reter clientes para manutenções e acompanhar faturamento e ocupação da agenda.

## Público e perfis de acesso

### Administradora / nail designer

Controla agenda, serviços, clientes, pagamentos, regras de sinal, equipe, estoque e relatórios.

### Cliente

Acessa um link de agendamento, escolhe serviço, profissional, data e horário; confirma, cancela ou remarca o atendimento; visualiza inspirações e histórico quando habilitado.

### Profissional da equipe (opcional)

Visualiza sua própria agenda, consulta informações necessárias da cliente e marca o atendimento como concluído. Não deve ver dados financeiros globais, salvo autorização da administradora.

## Proposta de valor

- Agenda organizada por tempo real de cada serviço.
- Menos faltas com lembretes e confirmação automática pelo WhatsApp.
- Preenchimento rápido de horários cancelados por meio de lista de espera.
- Histórico visual de unhas, técnicas, preferências e fotos por cliente.
- Próxima manutenção sugerida automaticamente, aumentando a recorrência.
- Visão clara de faturamento, ocupação, cancelamentos e serviços mais rentáveis.

## Funcionalidades prioritárias — MVP

### 1. Agenda visual

- Visualizações: dia, semana e mês.
- Horários de funcionamento configuráveis por dia da semana.
- Bloqueio de horários pessoais, feriados, almoço e indisponibilidades.
- Duração configurável por serviço; o sistema calcula e bloqueia o intervalo correto.
- Cores por status: confirmado, pendente de confirmação, concluído, cancelado, falta e bloqueado.
- Criação manual de atendimento pela profissional.
- Busca rápida por nome ou telefone da cliente.
- Controle de encaixes apenas quando houver tempo suficiente.

### 2. Agendamento online

- Página pública acessada por link, pronta para colocar na bio do Instagram e no WhatsApp.
- Fluxo: escolher serviço → profissional (se aplicável) → data → horário → dados pessoais → confirmação.
- Mostrar somente horários vagos e válidos para a duração do serviço escolhido.
- Permitir seleção de mais de um serviço no mesmo horário, somando as durações.
- Exibir política de cancelamento e de sinal antes da confirmação.
- Gerar código de reserva e tela final com resumo do agendamento.

### 3. Clientes e histórico

Cadastro com:

- Nome, telefone/WhatsApp, aniversário e observações.
- Preferências: formato, tamanho, técnica, cores e estilo preferido.
- Restrições e alergias relevantes informadas pela própria cliente.
- Histórico de atendimentos, serviços, valores, pagamentos, faltas e cancelamentos.
- Fotos de antes/depois e inspirações vinculadas ao atendimento.
- Campo de observação interna da profissional.

### 4. Confirmações, lembretes e lista de espera

- Lembrete automático de agendamento configurável (sugestão: 24 horas antes).
- Mensagem com ações claras: **Confirmar**, **Cancelar** ou **Remarcar**.
- Fila de clientes interessados em um dia, período ou profissional específico.
- Ao cancelar um horário, sugerir automaticamente o encaixe aos clientes compatíveis da lista de espera.
- Painel “Clientes a confirmar hoje” e “Atendimentos sem confirmação”.
- Integração inicialmente simulada para WhatsApp; deixar a arquitetura pronta para integrar uma API oficial posteriormente.

### 5. Gestão de manutenção e recorrência

- Cada serviço pode ter um intervalo de manutenção sugerido: por exemplo, 15, 20 ou 30 dias.
- Ao concluir um atendimento, sugerir a próxima manutenção em uma data recomendada.
- Criar uma lista de clientes “em período de manutenção”.
- Permitir enviar convite de retorno pelo WhatsApp com um link de agendamento.
- Indicadores: clientes recorrentes, clientes inativos e taxa de retorno.

### 6. Pagamentos e sinal

- Configuração de sinal obrigatório por serviço ou por tipo de cliente.
- Registrar pagamento por Pix, dinheiro, cartão, transferência ou outro.
- Status: pendente, sinal pago, pago parcialmente, pago e estornado.
- Campo para chave Pix e instruções de pagamento.
- Política configurável para cancelamento tardio, falta e aproveitamento/perda do sinal.
- Não processar pagamentos reais no MVP; estruturar o sistema para integração futura.

### 7. Financeiro simples

- Faturamento realizado e previsto por dia, semana e mês.
- Valor por serviço, profissional e cliente.
- Comparativo de atendimentos concluídos, cancelados e faltas.
- Formas de pagamento utilizadas.
- Despesas simples opcionais: material, aluguel, transporte e outras categorias.
- Resultado estimado: receitas menos despesas registradas.

## Funcionalidades para fase 2

### Fidelidade e pacotes

- Programa de pontos ou carimbo digital, por exemplo: após 8 atendimentos, oferecer benefício definido pela administradora.
- Pacotes recorrentes: mão semanal, manutenção mensal, combo mão + pé.
- Saldo de sessões e validade do pacote.

### Controle de estoque e precificação

- Cadastro de materiais: esmaltes, gel, fibra, tips, lixas, luvas, descartáveis e outros.
- Estoque atual, mínimo e alerta de reposição.
- Baixa estimada de material por serviço.
- Cálculo orientativo de preço: custo estimado de material + tempo da profissional + margem desejada.
- Relatório de serviços mais rentáveis.

### Marketing e relacionamento

- Campanhas para aniversariantes, clientes inativas e manutenção vencida.
- Cupons de desconto e indicações.
- Galeria pública de trabalhos, com autorização da cliente.
- Link para Instagram e catálogo de serviços.

## Telas do aplicativo

### 1. Dashboard

Exibir de forma objetiva:

- Próximo atendimento e agenda do dia.
- Faturamento previsto hoje e no mês.
- Quantidade de atendimentos de hoje.
- Clientes aguardando confirmação.
- Horários disponíveis hoje.
- Clientes com manutenção recomendada.
- Cancelamentos e faltas recentes.

### 2. Agenda

- Calendário por dia, semana e mês.
- Cards de atendimento com nome, serviço, duração, valor e status.
- Botão flutuante “Novo agendamento”.
- Filtros por profissional, status e serviço.

### 3. Novo agendamento

- Cliente existente ou nova cliente.
- Um ou mais serviços.
- Profissional.
- Data e horário disponíveis.
- Valor, sinal e observações.
- Status inicial: pendente de confirmação.

### 4. Cliente

- Dados cadastrais e contato rápido por WhatsApp.
- Preferências e observações.
- Galeria de fotos e inspirações.
- Linha do tempo de atendimentos.
- Próxima manutenção sugerida.
- Resumo financeiro e histórico de faltas/cancelamentos.

### 5. Serviços

- Nome do serviço.
- Categoria: mão, pé, alongamento, manutenção, decoração, spa ou outra.
- Duração em minutos.
- Preço padrão.
- Necessita sinal? Valor ou percentual.
- Intervalo sugerido para manutenção.
- Material/custo estimado opcional.
- Serviço ativo/inativo.

### 6. Confirmações e lista de espera

- Abas: “A confirmar”, “Confirmados”, “Lista de espera” e “Cancelados”.
- Ações manuais de enviar lembrete, confirmar, cancelar e remarcar.
- Ao selecionar uma vaga cancelada, mostrar clientes compatíveis da fila.

### 7. Financeiro

- KPIs de faturamento previsto, realizado, ticket médio, faltas e ocupação.
- Gráfico de faturamento por período.
- Ranking de serviços e profissionais.
- Tabela de pagamentos pendentes.

### 8. Configurações

- Perfil do salão/profissional, logo, endereço e links sociais.
- Horários de trabalho e dias indisponíveis.
- Regras de cancelamento, sinal e lembretes.
- Modelos de mensagens para WhatsApp.
- Usuários/equipe e permissões.

## Regras de negócio essenciais

1. Nunca permitir sobreposição de horários para a mesma profissional.
2. Considerar a soma das durações quando houver vários serviços no mesmo atendimento.
3. Exibir no agendamento público apenas horários dentro do expediente e disponíveis.
4. Um atendimento só pode ser concluído após a data/hora marcada ou por ação manual da administradora.
5. Cancelamentos devem manter histórico, motivo, data e responsável pela ação.
6. A falta deve permanecer registrada no histórico da cliente.
7. O lembrete de manutenção é uma sugestão; a profissional pode alterar ou desativar por cliente/atendimento.
8. Valores de serviço registrados em um atendimento não devem mudar caso o preço padrão seja alterado depois.
9. Fotos e informações internas da cliente devem ser privadas; exigir consentimento para publicar imagens em galeria pública.
10. O financeiro deve separar faturamento previsto, realizado, cancelado e perdido por falta.

## Dados principais / modelo de dados

### Usuário

`id`, `nome`, `email`, `telefone`, `perfil`, `ativo`, `foto`

### Cliente

`id`, `nome`, `telefone`, `email`, `aniversario`, `observacoes`, `alergias`, `preferencias`, `consentimento_imagem`, `criado_em`

### Serviço

`id`, `nome`, `categoria`, `duracao_minutos`, `preco`, `sinal_tipo`, `sinal_valor`, `intervalo_manutencao_dias`, `custo_estimado`, `ativo`

### Agendamento

`id`, `cliente_id`, `profissional_id`, `inicio`, `fim`, `status`, `valor_total`, `valor_sinal`, `observacoes`, `origem`, `criado_em`

Status: `pendente`, `confirmado`, `concluido`, `cancelado`, `falta`, `bloqueado`.

### Item de agendamento

`id`, `agendamento_id`, `servico_id`, `nome_servico`, `duracao_minutos`, `preco_cobrado`

### Pagamento

`id`, `agendamento_id`, `tipo`, `valor`, `status`, `data_pagamento`, `comprovante_url`, `observacao`

### Foto/Inspiracao

`id`, `cliente_id`, `agendamento_id`, `tipo`, `url`, `legenda`, `consentimento_publico`

### Lista de espera

`id`, `cliente_id`, `servico_id`, `profissional_id`, `data_preferida`, `periodo_preferido`, `status`, `criado_em`

### Notificação

`id`, `cliente_id`, `agendamento_id`, `tipo`, `canal`, `mensagem`, `status_envio`, `enviado_em`, `respondido_em`

## Experiência e design

- Estilo feminino, moderno, sofisticado e clean; evitar aparência infantil ou excessivamente carregada.
- Interface pensada primeiro para celular; desktop deve ser responsivo para gestão.
- Paleta sugerida: off-white, rosa nude, terracota suave, vinho/ameixa como destaque e grafite para texto.
- Usar bastante espaço em branco, tipografia legível e botões grandes.
- Priorizar informações de ação imediata: próximo atendimento, confirmação pendente e horário disponível.
- Usar ícones simples e consistentes.
- A agenda deve ser muito rápida de ler, com cores de status acessíveis e legenda clara.
- Permitir tema claro e, se simples de implementar, modo escuro.

## Métricas e indicadores

- Faturamento previsto x realizado.
- Número de atendimentos concluídos.
- Taxa de ocupação da agenda.
- Ticket médio.
- Taxa de confirmação.
- Taxa de falta e cancelamento.
- Clientes que retornaram para manutenção.
- Clientes inativas há 30, 60 e 90 dias.
- Serviços mais vendidos e mais rentáveis.
- Horários/dias de maior demanda.

## Integrações desejadas

### Prioridade inicial

- WhatsApp: preparar ações e templates; no protótipo, usar links `wa.me` com texto preenchido.
- Pix: exibir instruções de pagamento e registrar manualmente o status do sinal.
- Instagram: link para perfil e link público de agendamento.

### Futuras

- API oficial do WhatsApp Business para mensagens automáticas.
- Gateway de pagamento/Pix para confirmação automática de sinal.
- Google Calendar para sincronização de agenda.
- Notificações push.

## Critérios de aceitação do MVP

O app estará pronto para teste quando permitir que a nail designer:

1. Cadastre serviços com duração, preço, sinal e intervalo de manutenção.
2. Cadastre clientes e visualize o histórico de atendimentos.
3. Crie, confirme, remarque, cancele e conclua agendamentos sem conflito de horário.
4. Compartilhe uma página pública de agendamento que mostre horários reais disponíveis.
5. Registre pagamentos e sinal manualmente.
6. Veja o dashboard diário e financeiro básico.
7. Identifique clientes a confirmar, em lista de espera e no período de manutenção.
8. Acione WhatsApp com mensagens prontas a partir do atendimento ou da ficha da cliente.

## Instruções diretas para o Antigravity

Crie uma aplicação web responsiva, mobile-first, em português do Brasil, com visual de produto pronto para uso e dados de demonstração realistas de uma nail designer. Não entregue somente telas estáticas: implemente os fluxos, estados, validações e interações.

Tecnologia sugerida:

- Front-end: React + TypeScript.
- UI: Tailwind CSS e componentes acessíveis.
- Persistência: banco de dados com autenticação (por exemplo, Supabase) ou uma camada local bem estruturada para protótipo demonstrável.
- Datas: armazenar em UTC e apresentar no fuso configurado do salão.
- Gráficos simples e leves no dashboard.

Implementar primeiro o MVP descrito acima. Criar uma área pública de agendamento separada da área autenticada da administradora. Adicionar dados de exemplo, incluindo clientes, serviços, agendamentos em diversos status, pagamentos e itens na lista de espera.

Criar os seguintes fluxos completos:

1. Administradora cadastra um serviço.
2. Cliente agenda pelo link público.
3. Administradora confirma e registra sinal.
4. Atendimento é concluído, com registro de pagamento e sugestão da próxima manutenção.
5. Cliente cancela e a vaga é oferecida à lista de espera.
6. Administradora consulta faturamento e indicadores.

Garantir boa experiência em celular. Usar textos reais em português, máscaras para telefone brasileiro e moeda em Real (R$). Toda mensagem de WhatsApp deve ser editável nas configurações. Incluir estados vazios, telas de carregamento, mensagens de sucesso/erro e confirmação antes de ações sensíveis, como cancelamento.

Não integrar APIs pagas nem enviar mensagens reais no protótipo. Simular as automações e disponibilizar botões que abrem o WhatsApp com a mensagem pronta.

