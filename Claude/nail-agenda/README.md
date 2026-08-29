# Agenda Nail Designer — protótipo (Claude)

Aplicativo web responsivo, mobile-first, para uma nail designer controlar agenda, clientes, confirmações, recorrência de manutenção e financeiro. Construído a partir do briefing `naildesigner-app-briefing-antigravity.md`, para comparação com a versão gerada pelo Antigravity.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- React Router 7
- Recharts (gráfico do financeiro)
- Framer Motion (parallax, transições entre etapas e micro-interações da página pública)
- date-fns (datas em pt-BR)
- Persistência local via `localStorage` (sem backend) — dados de demonstração são gerados automaticamente no primeiro acesso

Não há backend nem envio real de mensagens: os botões de WhatsApp abrem links `wa.me` com a mensagem pré-preenchida, como pedido no briefing.

## Como rodar

```bash
npm install
npm run dev
```

Acesse o endereço mostrado no terminal (geralmente `http://localhost:5173`).

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Acessos de demonstração

Na tela de login, escolha um dos dois perfis já cadastrados (não há senha — é um protótipo):

- **Sheila Santos** — administradora (acesso completo: agenda, clientes, financeiro, configurações)
- **Lurdinha** — profissional da equipe

A página pública de agendamento (o link que iria na bio do Instagram) fica em `/agendar`, sem necessidade de login.

## Estrutura do projeto

```
src/
  types/           modelo de dados (Cliente, Servico, Agendamento, Pagamento, ListaEspera, Notificacao, ConfiguracaoSalao...)
  lib/
    businessRules.ts  regras de negócio puras (sobreposição de horário, cálculo de sinal, sugestão de manutenção, geração de horários livres)
    selectors.ts       consultas derivadas do banco (KPIs, dashboard, financeiro)
    seed.ts            dados de demonstração realistas
    storage.ts         camada de persistência em localStorage
    whatsapp.ts        montagem de links wa.me a partir dos modelos configuráveis
  context/           estado global (dados do app, autenticação simulada, toasts)
  components/        UI reutilizável (botões, modais, badges de status, shell de navegação)
  pages/
    Dashboard, Agenda, Clientes, Servicos, Confirmacoes, Financeiro, Configuracoes, Public/AgendamentoPublicoPage
```

## Regras de negócio implementadas

1. Nunca permite sobreposição de horário para a mesma profissional.
2. Soma as durações quando há múltiplos serviços no mesmo atendimento.
3. A agenda pública só mostra horários dentro do expediente configurado e realmente livres.
4. Um atendimento pode ser concluído a qualquer momento pela administradora (com aviso se ainda não chegou ao horário final).
5. Cancelamentos guardam motivo, responsável e data.
6. Faltas permanecem registradas no histórico da cliente.
7. A sugestão de próxima manutenção é editável/removível por atendimento.
8. O valor cobrado em um atendimento fica congelado no momento da criação — não muda se o preço padrão do serviço for alterado depois.
9. Fotos exigem consentimento explícito para aparecer em galeria pública.
10. O financeiro separa faturamento previsto, realizado, cancelado e perdido por falta.

Um script de verificação rápida dessas regras está em `scripts/test-business-rules.mjs` (rode com `npx tsx scripts/test-business-rules.mjs`).

## Resetar os dados de demonstração

Em **Configurações → Zona de demonstração**, há um botão para restaurar os dados originais a qualquer momento (útil depois de testar os fluxos e "bagunçar" a agenda).
