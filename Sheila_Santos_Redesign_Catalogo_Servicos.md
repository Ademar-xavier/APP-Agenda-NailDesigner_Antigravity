# Redesign — Catálogo de serviços | Sheila Santos

## Objetivo de negócio

Transformar a página de catálogo em uma vitrine que ajude a cliente a decidir em poucos segundos e a iniciar o agendamento com segurança. A prioridade é **conversão para agendamento**, seguida de aumento do ticket médio por meio de extras e serviços complementares.

## Serviços e planos atuais — preservar no novo layout

O redesenho deve manter os dados e a lógica dos serviços existentes. Não substituir nomes, valores, durações, prazos de retorno ou benefícios por textos genéricos.

| Categoria | Serviço | Duração | Valor | Retorno/validade |
| --- | --- | ---: | ---: | --- |
| Alongamento | Alongamento em Molde de Papel | 120 min | R$ 180,00 | Retorno: 20 dias |
| Alongamento | Alongamento em Molde F1 | 120 min | R$ 180,00 | Retorno: 20 dias |
| Esmaltação em Gel | Banho em Gel | 110 min | R$ 80,00 | Retorno: 15 dias |
| Spa / Cuidado | Manicure + Pedicure | 60 min | R$ 80,00 | Retorno: 7 dias |
| Mão Simples | Manicure Tradicional | 60 min | R$ 40,00 | Retorno: 7 dias |
| Manutenção | Manutenção Molde de Papel | 110 min | R$ 140,00 | Retorno: 20 dias |

Os planos recorrentes devem permanecer como oferta de destaque, com mensalidade, sessões, prioridade e horário garantido claramente comparáveis:

| Plano | Inclui | Mensalidade | Validade |
| --- | --- | ---: | --- |
| Clube VIP Manicure Semanal | 4 atendimentos de Manicure Tradicional ou Mão Simples | R$ 150,00/mês | 30 dias |
| Clube VIP Pé & Mão Completo | 4 atendimentos de Pé e Mão | R$ 280,00/mês | 30 dias |
| Clube Manutenção de Alongamento | 2 manutenções mensais com esmaltação | R$ 190,00/mês | 30 dias |

Os dados acima representam os itens visíveis nas imagens; manter também os demais serviços já cadastrados no sistema, pois o catálogo informa 8 serviços disponíveis.

## Conceito visual

Uma experiência premium, feminina e contemporânea, com bastante espaço em branco, fotografia real de unhas e detalhes delicados. Deve parecer um estúdio de beleza organizado e acolhedor — nunca um e-commerce genérico.

**Direção de arte**

- Fundo principal: `#FFF9F8` (rosa quase branco)
- Superfícies: `#FFFFFF`
- Cor de marca/CTA: `#B85C78` (rosa queimado sofisticado)
- CTA em hover: `#98455F`
- Texto principal: `#2B2426`
- Texto secundário: `#756B6D`
- Destaque suave: `#F7E6EA`
- Linha/borda: `#EEDDE1`
- Fonte de títulos: `Playfair Display` ou `Cormorant Garamond`
- Fonte de interface: `Inter` ou `DM Sans`
- Ícones: Lucide, traço fino e consistente

Evitar excesso de rosa saturado, sombras pesadas, animações chamativas, carrosséis automáticos e cards com muitas bordas.

## Arquitetura da página

### 1. Cabeçalho fixo e compacto

No desktop: logo/nome à esquerda, links `Início`, `Serviços`, `Como funciona`, `Contato` ao centro/direita e botão primário `Agendar horário`.

No celular: nome/logo, ícone de menu e um botão fixo no rodapé para agendamento.

### 2. Hero de conversão

Layout em duas colunas no desktop; imagem vertical de manicure/unhas à direita. No celular, texto primeiro e foto abaixo.

**Selo:** `Atendimento com hora marcada`

**Título:** `Unhas impecáveis, no seu estilo.`

**Texto:** `Escolha seu serviço, veja o tempo estimado e encontre o melhor horário para você.`

**Ações:**

- Primária: `Ver serviços`
- Secundária: `Como funciona`

**Prova de confiança abaixo dos botões:**

`✦ Atendimento personalizado  ·  ✦ Materiais esterilizados  ·  ✦ Confirmação pelo WhatsApp`

### 3. Atalhos por necessidade

Uma linha de filtros em formato de chips, imediatamente após o hero:

`Todos` | `Primeira vez` | `Manutenção` | `Alongamento` | `Esmaltação` | `Extras`

Eles filtram os serviços sem recarregar a página. O chip ativo tem fundo rosa queimado e texto branco. Os demais são claros com borda discreta.

### 4. Catálogo de serviços — seção principal

**Título:** `Escolha o cuidado que combina com você`

**Subtítulo:** `Toque em um serviço para ver detalhes, duração e opções de personalização.`

Exibir categorias em blocos bem separados, nesta ordem de venda:

1. Mais procurados
2. Alongamentos
3. Manutenção
4. Esmaltação em gel
5. Manicure e cuidados
6. Clube VIP

Cada categoria possui uma grade de cards: 3 colunas no desktop, 2 no tablet e 1 no celular.

### 5. Card de serviço

Cada card deve conter:

- Foto real do resultado (proporção 4:3, cantos de 16 px)
- Tag opcional: `Mais escolhido`, `Ideal para primeira vez` ou `Novidade`
- Nome do serviço
- Descrição curta, em no máximo duas linhas
- Tempo estimado com ícone de relógio: `~ 1h30`
- Preço a partir de: `A partir de R$ 00,00`
- Botão: `Ver detalhes` (abre modal/drawer)

Ao passar o mouse no desktop, a imagem sobe suavemente 4 px e o card ganha uma sombra muito sutil. Todo o card deve ser clicável, sem esconder dados no hover.

### 6. Detalhe do serviço — drawer no celular, modal no desktop

Não enviar a cliente a outra página. Ao selecionar um serviço, abrir um painel de decisão com:

- Foto maior
- Nome, preço, duração e texto explicativo
- `O que está incluso`
- `Antes de agendar` (ex.: necessidade de remoção, condição para manutenção)
- Extras compatíveis, em seleção simples: nail art, remoção, spa das mãos etc.
- Resumo do pedido atualizado: serviço + extras + duração + valor estimado
- CTA destacado: `Continuar para horários`

No rodapé do modal, incluir texto discreto: `O valor final pode variar conforme avaliação e personalização.`

### 7. Clube VIP — proposta de recorrência mais persuasiva

O Clube VIP precisa deixar de parecer apenas mais três cards no final da página. Criar uma seção própria logo após os serviços de manutenção e antes dos extras.

**Título:** `Seu cuidado em dia. Seu horário garantido.`

**Texto:** `Escolha um plano, economize no mês e tenha prioridade para reservar.`

Usar os três planos atuais em cards comparáveis. O plano mais aderente deve receber o selo `Mais escolhido` somente se isso for verdadeiro; caso contrário, usar `Plano recomendado` com critério claro, como “para quem faz manutenção de alongamento todo mês”.

Nos cards, ordenar a informação nesta sequência: para quem é → sessões incluídas → benefício de prioridade/horário garantido → mensalidade → botão `Quero fazer parte do VIP`. Exibir também o valor por sessão quando aplicável, calculado de forma transparente, sem prometer desconto inexistente.

### 8. Bloco de venda cruzada

Depois do catálogo:

**Título:** `Deixe seu momento ainda mais especial`

Três cards horizontais e objetivos: `Nail art`, `Spa das mãos`, `Remoção segura`.

Cada card deve mostrar preço adicional e botão `Adicionar ao atendimento`. Quando um serviço já estiver escolhido, o botão deve atualizar o resumo do pedido.

### 9. Como funciona

Três passos numerados, simples e visuais:

1. `Escolha` — selecione o serviço e os extras.
2. `Agende` — escolha dia e horário disponíveis.
3. `Confirme` — receba a confirmação pelo WhatsApp.

### 10. Prova social e confiança

Inserir uma faixa suave com avaliações reais, quando disponíveis. Enquanto não houver integração, usar a estrutura abaixo sem inventar notas ou depoimentos:

- Foto/monograma da profissional
- `Atendimento pensado para você se sentir bonita e tranquila.`
- Itens de confiança concretos cadastráveis pelo salão: localização, política de atrasos, formas de pagamento e higienização.

### 11. CTA final e rodapé

Bloco de fundo rosa queimado, texto claro:

**Título:** `Pronta para reservar seu horário?`

**Texto:** `Escolha seu serviço agora e encontre um horário que funcione para você.`

Botão claro: `Agendar meu horário`

Rodapé minimalista com Instagram, WhatsApp, endereço/atendimento (se houver), política de cancelamento e direitos reservados.

## Wireframe funcional

```text
[ Logo Sheila Santos ]  Início  Serviços  Como funciona        [Agendar]

  [Atendimento com hora marcada]
  Unhas impecáveis, no seu estilo.             [foto resultado]
  Escolha seu serviço, veja o tempo...
  [Ver serviços]  [Como funciona]
  Atendimento personalizado · Materiais esterilizados · WhatsApp

 [Todos] [Primeira vez] [Manutenção] [Alongamento] [Esmaltação] [Extras]

 Escolha o cuidado que combina com você
 Mais procurados                                  [Ver todos]
 [foto] Serviço  | ~ 1h30 | A partir de R$...  [foto] Serviço  [foto] Serviço

 Alongamentos
 [foto] Serviço  | ~ 2h00 | A partir de R$...  [foto] Serviço  [foto] Serviço

 Clube VIP: seu cuidado em dia. seu horário garantido.
 [Manicure Semanal R$150] [Pé & Mão R$280] [Manutenção Alongamento R$190]

 Deixe seu momento ainda mais especial
 [Nail art +R$] [Spa das mãos +R$] [Remoção segura +R$]

 Como funciona:  1 Escolha  →  2 Agende  →  3 Confirme

 Pronta para reservar seu horário?                         [Agendar meu horário]
```

## Regras de UX e conversão

1. Sempre exibir **preço e duração antes do clique**. Isso reduz abandono e mensagens repetidas no WhatsApp.
2. O botão de agendamento deve existir no header, no detalhe do serviço, após o catálogo e fixo no rodapé do celular.
3. Ao escolher o primeiro serviço, preservar a escolha visualmente em um mini-resumo fixo: `1 serviço selecionado · Ver resumo`.
4. Não pedir cadastro antes de a cliente escolher serviço e horário.
5. Usar linguagem simples e direta: `Continuar para horários`, não `Prosseguir`; `Adicionar ao atendimento`, não `Adicionar ao carrinho`.
6. Serviços indisponíveis não devem desaparecer: exibir `Próximo horário em…` ou opção de lista de espera.
7. Garantir toque mínimo de 44 px, contraste adequado e navegação por teclado.
8. Carregar imagens em WebP/AVIF, com lazy loading; a imagem do hero é prioridade de carregamento.

## Microinterações

- Chips filtram com transição de 150–200 ms.
- Contador do resumo atualiza sem interromper a navegação.
- Botão muda para `Adicionado ✓` por 1 segundo após selecionar extra.
- Modal/drawer abre preservando foco e fecha por botão visível e tecla Esc.
- Respeitar `prefers-reduced-motion`.

## Prompt pronto para o Antigravity

> Redesenhe a landing page de catálogo de serviços do salão Sheila Santos mantendo as funcionalidades já existentes de catálogo e agendamento. O objetivo principal é aumentar agendamentos e ticket médio, com uma experiência mobile-first, premium, clara e rápida. Não crie dados fictícios: preserve os serviços, preços, fotos, horários, integrações e links existentes; se uma informação não existir, deixe a estrutura pronta para cadastro.
>
> Direção visual: salão de manicure premium, feminino e contemporâneo. Fundo `#FFF9F8`, cards brancos, rosa queimado `#B85C78` como CTA, texto `#2B2426`, bordas `#EEDDE1`. Títulos em Playfair Display/Cormorant Garamond e interface em Inter/DM Sans. Use ícones Lucide. Evite gradientes fortes, excesso de rosa, carrosséis automáticos e sombras pesadas.
>
> Preserve expressamente os serviços atuais, seus valores, duração e prazo de retorno: Alongamento em Molde de Papel (120 min, R$180, retorno 20 dias); Alongamento em Molde F1 (120 min, R$180, retorno 20 dias); Banho em Gel (110 min, R$80, retorno 15 dias); Manicure + Pedicure (60 min, R$80, retorno 7 dias); Manicure Tradicional (60 min, R$40, retorno 7 dias); Manutenção Molde de Papel (110 min, R$140, retorno 20 dias), além dos demais itens cadastrados. Preserve também os planos: Clube VIP Manicure Semanal (4 atendimentos, R$150/mês); Clube VIP Pé & Mão Completo (4 atendimentos, R$280/mês); Clube Manutenção de Alongamento (2 manutenções com esmaltação, R$190/mês), todos com validade de 30 dias.
>
> Estruture a página em: header fixo com CTA; hero com selo “Atendimento com hora marcada”, título “Unhas impecáveis, no seu estilo.”, texto e foto; chips de filtro (Todos, Primeira vez, Manutenção, Alongamento, Esmaltação em Gel, Mão Simples, Spa / Cuidado e Clube VIP); catálogo por categorias; cards com foto, tag, nome, descrição curta, duração, preço e botão “Ver detalhes”; modal no desktop e drawer no celular com detalhes, inclusões, observações, extras compatíveis e resumo do pedido; seção Clube VIP comparativa; seção de venda cruzada; “Como funciona” em 3 passos; bloco de confiança; CTA final e rodapé.
>
> Em cada card, preço e duração devem estar visíveis sem clique. Ao selecionar serviço/extras, exiba um mini-resumo fixo e permita continuar diretamente para os horários. No celular, crie botão fixo no rodapé “Agendar horário”. Garanta componentes acessíveis, alvos de toque de 44 px, performance com imagens WebP/AVIF e lazy loading, animações discretas de até 200 ms e suporte a `prefers-reduced-motion`.
>
> Entregue a implementação responsiva usando os componentes e framework já presentes no projeto. Preserve o fluxo de agendamento atual, faça as mudanças somente no layout/UX e valide desktop, tablet e celular antes de publicar no GitHub e Vercel.

## Critérios de aceite antes da publicação

- A cliente entende em até 5 segundos que é possível escolher o serviço e agendar.
- Todos os serviços exibem preço e duração.
- O fluxo serviço → extras → horário funciona sem perder as escolhas.
- O CTA de agendamento está acessível em todas as partes importantes da página, especialmente no celular.
- Nenhum conteúdo, integração ou link de produção atual foi removido.
- Visual validado em 360 px, 768 px e 1440 px de largura.
- Sem erro de console, sem layout quebrado e com imagens otimizadas.
