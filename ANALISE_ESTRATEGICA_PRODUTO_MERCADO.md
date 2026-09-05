# 📊 Análise Estratégica, Técnica e Comercial de Produto (SaaS de Beleza & Agendamento)

> **Documento Consultivo Executivo**  
> **Áreas de Análise:** Engenharia de Software · Engenharia de Hardware e Dispositivos · Estratégia Comercial e Modelo de Negócios (SaaS)  
> **Benchmark de Mercado:** Trinks, Avec/BelezaSoft, Fresha, Booksy, AppBeleza, AppBarber  

---

## 1. Resumo Executivo

O projeto atual possui diferenciais competitivos raros e valiosos no cenário brasileiro:
1. **Cobrança e trava de sinal via Pix** com cálculo inteligente e política de devolução integrada.
2. **Integração com a API Oficial da Meta (Cloud API)** com fallback e notificações sonoras/visuais.
3. **Lista de espera ativa com conversão direta** em agendamento.
4. **Interface fluida, responsiva e moderna** (React + Tailwind) que funciona tanto em desktop quanto como PWA/Android.

Para transformar este produto em um **SaaS comercial de alta escala e alta lucratividade**, existem lacunas técnicas (multi-tenancy, IndexedDB), de hardware (impressoras térmicas, maquininhas SmartPOS) e comerciais (ficha de anamnese digital com assinatura, comissões da Lei do Salão-Parceiro e venda de produtos de balcão).

Este documento detalha o diagnóstico completo e apresenta o roadmap estratégico para execução futura.

---

## 2. Visão da Engenharia de Software
*(Arquitetura, Escalabilidade, Confiabilidade e Nuvem)*

```
                       ARQUITETURA DE DADOS RECOMENDADA
                      
 [ Clientes / Salões ] ──────────► [ Cloudflare CDN / Vercel ]
                                             │
                                     [ React 19 Frontend ]
                                     ├── IndexedDB (Cache Local)
                                     └── Sync Queue (Fila Offline)
                                             │
                                  [ Supabase PostgreSQL ]
                                     ├── Row Level Security (RLS)
                                     ├── salao_id em todas tabelas
                                     └── Webhooks Meta Cloud API
```

### 2.1. Arquitetura Multi-Tenant com Row Level Security (RLS)
* **Diagnóstico Atual**: O banco Supabase hoje trabalha em torno de uma instância única (`id = 'salao_principal'`).
* **Objetivo de Escala**: Permitir que centenas de salões comprem e utilizem a mesma infraestrutura em nuvem, pagando mensalidade, sem que um salão jamais tenha acesso aos dados do outro.
* **Plano de Implementação**:
  - Adicionar o campo `salao_id: UUID` em todas as tabelas: `clientes`, `agendamentos`, `servicos`, `usuarios`, `configuracoes`, `materiais`, `transacoes` e `lista_espera`.
  - Criar políticas de segurança nativas no PostgreSQL (**Row Level Security - RLS**):
    ```sql
    CREATE POLICY salao_isolation_policy ON agendamentos
      FOR ALL
      USING (salao_id = current_setting('app.current_salao_id')::uuid);
    ```
  - Cada requisição é autenticada e isolada dinamicamente pelo domínio do salão (ex: `studiobella.agenda.app`) ou login da conta.

### 2.2. Migração de Persistência: `localStorage` ➔ `IndexedDB`
* **Diagnóstico Atual**: O `localStorage` é síncrono e possui limite rígido de ~5MB por domínio.
* **Risco**: Com o crescimento da base de clientes, histórico de agendamentos e fotos de procedimentos em base64, o `localStorage` pode estourar a cota e travar o app nos aparelhos das profissionais.
* **Plano de Implementação**:
  - Utilizar **IndexedDB** (via biblioteca leve como `idb-keyval` ou `Dexie.js`).
  - **Capacidade**: Armazena gigabytes de dados com suporte a índices de busca ultra-rápidos.
  - **Assíncrono**: Não bloqueia a thread de renderização da interface, garantindo 60 FPS constantes.

### 2.3. Fila Offline Real com Auto-Retry (`SyncQueue`)
* **Diagnóstico Atual**: Se a profissional perder a conexão 4G/Wi-Fi temporariamente, operações na nuvem podem falhar.
* **Plano de Implementação**:
  - Criar um gerenciador de fila offline: toda mutação (criar agendamento, dar baixa em sinal) grava no IndexedDB primeiro e adiciona à fila de sincronização.
  - Listener `window.addEventListener('online', processarFila)` descarrega as requisições em lote assim que o sinal retornar.

---

## 3. Visão da Engenharia de Hardware & Dispositivos
*(Operação de Bancada, Periféricos, Bateria e Usabilidade em Loja)*

No dia a dia de um salão de estética, a profissional trabalha com luvas, pó químico em suspensão na mesa, celular com bateria oscilante e telas expostas por horas seguidas.

### 3.1. Suporte a Impressoras Térmicas de Recibos (ESC/POS 58mm e 80mm)
* **Por que os salões exigem?**: Manicures e recepções adoram imprimir a "Comandinha de Atendimento" para colocar na bancada com os procedimentos contratados, ou entregar o comprovante físico de pagamento à cliente.
* **Implementação Técnica**:
  - **No Desktop**: Formatação CSS com `@media print { width: 58mm; font-family: monospace; }` com disparo direto via `window.print()`.
  - **No Celular/Tablet Android**: Plugin Capacitor Bluetooth ESC/POS para conexão direta com impressoras portáteis Bluetooth (Mini Printers térmicas de R$ 120,00 no Mercado Livre).

### 3.2. Integração com Maquininhas SmartPOS (Stone / PagBank / Mercado Pago)
* **Diagnóstico Atual**: Pagamento presencial é digitado manualmente na maquininha avulsa.
* **Implementação Técnica**:
  - **Deep Link de Pagamento**: O app pode chamar o aplicativo da Stone ou Mercado Pago instalado na mesma máquina POS Android via Deep Link (`intent://`), enviando o valor do procedimento e ID da transação. Ao aprovar, o app recebe o retorno automático de `"Pago"`.
  - **QR Code Pix Dinâmico na Tela**: Geração de QR Code Pix com valor exato na tela do balcão, com webhook de baixa instantânea.

### 3.3. Modo Display de Recepção & Screen Wake Lock API
* **Problema**: Ao deixar um tablet no balcão para as clientes verem a agenda ou se cadastrarem, a tela apaga após 1 ou 2 minutos de inatividade do Android/iPad.
* **Implementação Técnica**:
  - Ativar a **Screen Wake Lock API**:
    ```ts
    const wakeLock = await navigator.wakeLock.request('screen');
    ```
  - Mantém a tela da recepção 100% ativa durante o expediente comercial, sem desligar.
  - Desativa animações contínuas desnecessárias para evitar aquecimento térmico do tablet e economizar bateria.

---

## 4. Visão Comercial, Vendas e Modelo de Negócios (SaaS)
*(Como transformar o produto no líder de mercado no Brasil)*

### 4.1. Matriz Comparativa: Sua Aplicação vs Players Nacionais e Globais

| Recurso / Funcionalidade | Sua Aplicação | Trinks | Avec | Fresha | Booksy |
|---|:---:|:---:|:---:|:---:|:---:|
| **Cobrança de Sinal Pix com Trava de Horário** | ⭐ **Excelente** | ⚠️ Parcial | ⚠️ Parcial | ❌ Apenas cartão | ❌ Apenas cartão |
| **Robô Meta WhatsApp API Oficial** | ⭐ **Excelente** | ❌ Paga SMS/Robô | ❌ Não oficial | ❌ Cobra SMS | ❌ Cobra SMS |
| **Lista de Espera com Conversão em 1 Toque** | ⭐ **Excelente** | ⚠️ Básico | ⚠️ Básico | ⚠️ Básico | ❌ Não tem |
| **Ficha de Anamnese Digital com Assinatura Touch** | ❌ *Pendente* | ⭐ Forte | ⭐ Forte | ❌ Não tem | ❌ Não tem |
| **Divisão e Comissões (Lei do Salão-Parceiro)** | ⚠️ *Parcial* | ⭐ Forte | ⭐ Forte | ⚠️ Parcial | ⚠️ Parcial |
| **Comanda / Venda de Produtos no Balcão (PDV)** | ❌ *Pendente* | ⭐ Forte | ⭐ Forte | ⭐ Forte | ⭐ Forte |
| **CRM de Resgate ("Clientes Sumidas")** | ❌ *Pendente* | ⚠️ Básico | ⭐ Forte | ⚠️ Básico | ⚠️ Básico |
| **Clube de Assinatura Recorrente de Unhas** | ❌ *Pendente* | ⚠️ Básico | ⭐ Forte | ❌ Não tem | ❌ Não tem |

---

### 4.2. Os 4 Recursos de Maior Impacto Comercial para Venda

#### 1. Ficha de Anamnese Digital com Assinatura na Tela
* **Por que vende muito?**: É o maior argumento de venda contra processos jurídicos. Nail Designers precisam saber se a cliente tem diabetes, alergia a monômero/gel, micose ou unhas roídas.
* **Como funciona**: No primeiro agendamento, a cliente preenche uma anamnese rápida no celular e assina com o dedo na tela. O termo fica salvo em PDF/histórico da cliente para sempre.
* **Impacto**: Aumenta o valor percebido do software de imediato.

#### 2. Comanda de Atendimento & Venda de Produtos (PDV de Balcão)
* **Por que vende muito?**: Salões aumentam seu lucro vendendo produtos (esmaltes, óleos secantes, cremes hidratantes, kits pós-alongamento).
* **Como funciona**: No momento de concluir o agendamento, o sistema permite adicionar itens do estoque na mesma conta da cliente (ex: *Alongamento R$ 150 + Óleo de Cutícula R$ 25 = Total R$ 175*), dando baixa automática no estoque e gerando recibo único.

#### 3. Gestão Completa da Lei do Salão-Parceiro (Comissões Automáticas)
* **Por que vende muito?**: Todo salão com mais de uma profissional precisa calcular comissões semanais ou quinzenais. Fazer isso na mão ou no caderno consome horas da dona do salão.
* **Como funciona**: Campo de `% de Comissão` no cadastro de cada membro da equipe. Ao final do período, gera o relatório com 1 clique: *"Lurdinha produziu R$ 3.000,00 -> Salão fica com R$ 1.500,00 e Lurdinha recebe R$ 1.500,00 líquido"*.

#### 4. CRM de "Clientes Sumidas" (Aumento Imediato de Receita do Salão)
* **Por que vende muito?**: Procedimentos de unhas exigem manutenção a cada 20 a 25 dias. Quem não volta em 30 dias está "sumida".
* **Como funciona**: O app filtra automaticamente clientes com último atendimento há mais de 28 dias e exibe botão: *"Enviar mensagem de resgate no WhatsApp"*. Em softwares de mercado, essa função recupera até **22% das clientes inativas**.

---

## 5. Estratégia de Precificação e Venda

```
                                  ESTRUTURA DE PLANOS SAAS
                                  
   ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
   │    PLANO BÁSICO      │      │      PLANO PRO       │      │     PLANO PRIME      │
   │      (Solo)          │      │   (Equipe & Gestão)  │      │     (Escala Total)   │
   ├──────────────────────┤      ├──────────────────────┤      ├──────────────────────┤
   │ • R$ 49,90 / mês     │      │ • R$ 89,90 / mês     │      │ • R$ 149,90 / mês    │
   │ • 1 Profissional     │      │ • Até 5 Profissionais│      │ • Profissionais Ilim.│
   │ • Agendamento Online │      │ • Divisão Salão Parc.│      │ • Anamnese Digital   │
   │ • Trava de Sinal Pix │      │ • Gestão de Estoque  │      │ • CRM de Clientes    │
   │ • WhatsApp Meta      │      │ • PDV de Produtos    │      │ • Suporte VIP        │
   └──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

### Projeção de Faturamento Recorrente (MRR):
* **50 clientes no Plano Pro (R$ 89,90)** = **R$ 4.495,00 / mês recorrente**
* **100 clientes no Plano Pro (R$ 89,90)** = **R$ 8.990,00 / mês recorrente**
* **250 clientes na média de R$ 99,00** = **R$ 24.750,00 / mês recorrente**

---

## 6. Roadmap Sugerido de Implementação (Passo a Passo)

```
 [ Fase 1: Prontidão Comercial ]
   ├── Ficha de Anamnese Digital com Assinatura Touch
   ├── Cálculo de Comissões por Profissional (Lei Salão-Parceiro)
   └── CRM de Resgate de Clientes Sumidas
           │
           ▼
 [ Fase 2: Hardware & PDV ]
   ├── Comanda com Venda de Produtos e baixa em estoque
   ├── Impressão Térmica de Recibos/Comandas (58mm / 80mm)
   └── Modo Wake Lock para tablets de balcão
           │
           ▼
 [ Fase 3: Escala Massiva Multi-Tenant ]
   ├── RLS (Row Level Security) nativo no PostgreSQL
   ├── Migração para IndexedDB (Dexie.js)
   └── Painel Master para criar novos salões em 1 clique
```

---

> *Documento gerado para planejamento estratégico e comercial do software Beauty Gestão & Agenda Pro.*
