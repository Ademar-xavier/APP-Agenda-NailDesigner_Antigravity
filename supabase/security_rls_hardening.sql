-- ==============================================================================
-- BLINDAGEM COMPLETA DE SEGURANÇA SUPABASE (SUPABASE AUTH + RLS)
-- Aplicação: Sheila Santos Nails Designer
-- Padrão: OWASP Top 10 / Proteção de APIs e Dados Sensíveis
-- ==============================================================================

-- ==============================================================================
-- 0. GARANTIR PERMISSÕES DO SCHEMA PUBLIC E RECARREGAR POSTGREST CACHE
-- Resolve o erro PGRST002 (Could not query the database for the schema cache)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO authenticator, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticator, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticator, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticator, anon, authenticated, service_role;

ALTER ROLE authenticator RESET pgrst.db_schemas;
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- Garantir colunas adicionais para sincronização 100% perfeita entre App e Supabase
ALTER TABLE IF EXISTS servicos ADD COLUMN IF NOT EXISTS is_pacote BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS servicos ADD COLUMN IF NOT EXISTS itens_combo TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS servicos ADD COLUMN IF NOT EXISTS retorno_dias INTEGER DEFAULT 20;

ALTER TABLE IF EXISTS materiais ADD COLUMN IF NOT EXISTS custo_por_uso NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS clientes ADD COLUMN IF NOT EXISTS sexo TEXT DEFAULT 'feminino';

ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS servicos_habilitados TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS chave_pix TEXT;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS usar_pix_proprio BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS especialidade TEXT DEFAULT 'Nail Designer';
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS horario_almoco_ativo BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS horario_almoco_inicio TEXT DEFAULT '12:00';
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS horario_almoco_fim TEXT DEFAULT '13:00';

ALTER TABLE IF EXISTS agendamentos ADD COLUMN IF NOT EXISTS pago_com_clube BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS agendamentos ADD COLUMN IF NOT EXISTS plano_id TEXT;
ALTER TABLE IF EXISTS agendamentos ADD COLUMN IF NOT EXISTS recorrencia_grupo_id TEXT;
ALTER TABLE IF EXISTS agendamentos ADD COLUMN IF NOT EXISTS recorrencia_tipo TEXT;
ALTER TABLE IF EXISTS agendamentos ADD COLUMN IF NOT EXISTS recorrencia_posicao TEXT;

NOTIFY pgrst, 'reload schema';

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE IF EXISTS agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fotos_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS licencas ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. TABELA 'materiais' (BLINDADA - APENAS USUÁRIOS AUTENTICADOS)
-- Visitantes anônimos NÃO conseguem ver custos, rendimento ou insumos do salão.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir tudo em materiais" ON materiais;
DROP POLICY IF EXISTS "Proteger materiais do salao" ON materiais;
DROP POLICY IF EXISTS "Acesso total a materiais apenas para autenticados" ON materiais;

CREATE POLICY "Acesso total a materiais apenas para autenticados" 
  ON materiais FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 3. TABELA 'despesas' (BLINDADA - APENAS USUÁRIOS AUTENTICADOS)
-- Visitantes anônimos NÃO têm acesso ao fluxo de caixa, contas ou faturamento.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir tudo em despesas" ON despesas;
DROP POLICY IF EXISTS "Proteger despesas financeiras" ON despesas;
DROP POLICY IF EXISTS "Acesso total a despesas apenas para autenticados" ON despesas;

CREATE POLICY "Acesso total a despesas apenas para autenticados" 
  ON despesas FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 4. TABELA 'fotos_clientes' (BLINDADA - APENAS USUÁRIOS AUTENTICADOS)
-- Fotos de fichas de anamnese e histórico protegidas contra acesso público não autorizado.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir tudo em fotos_clientes" ON fotos_clientes;
DROP POLICY IF EXISTS "Acesso a fotos apenas para autenticados" ON fotos_clientes;

CREATE POLICY "Acesso a fotos apenas para autenticados" 
  ON fotos_clientes FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 5. TABELA 'servicos' (LEITURA PÚBLICA DE ATIVOS / GESTÃO APENAS AUTENTICADA)
-- Clientes podem ver apenas serviços ativos no catálogo; Sheila tem controle total.
-- Proteção rigorosa contra alteração de preços ou exclusão por usuários anônimos.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir leitura pública de servicos ativos" ON servicos;
DROP POLICY IF EXISTS "Permitir modificação de servicos apenas para autenticados" ON servicos;
DROP POLICY IF EXISTS "Permitir tudo em servicos" ON servicos;
DROP POLICY IF EXISTS "Acesso total a servicos apenas para autenticados" ON servicos;
DROP POLICY IF EXISTS "Permitir modificacao de servicos" ON servicos;

CREATE POLICY "Permitir leitura pública de servicos ativos" 
  ON servicos FOR SELECT 
  TO anon, authenticated, service_role 
  USING (ativo = true);

CREATE POLICY "Acesso total a servicos apenas para autenticados" 
  ON servicos FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 6. TABELA 'usuarios' (LEITURA DA EQUIPE ATIVA / GESTÃO AUTENTICADA)
-- Clientes escolhem a profissional ativa no agendamento; Sheila gerencia a equipe.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir leitura publica de profissionais sem expor senha" ON usuarios;
DROP POLICY IF EXISTS "Permitir modificacao de usuarios apenas autenticados" ON usuarios;
DROP POLICY IF EXISTS "Permitir tudo em usuarios" ON usuarios;
DROP POLICY IF EXISTS "Permitir leitura de equipe ativa para agendamento" ON usuarios;
DROP POLICY IF EXISTS "Acesso total a usuarios apenas para autenticados" ON usuarios;

CREATE POLICY "Permitir leitura de equipe ativa para agendamento" 
  ON usuarios FOR SELECT 
  TO anon, authenticated, service_role 
  USING (ativo = true);

CREATE POLICY "Acesso total a usuarios apenas para autenticados" 
  ON usuarios FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 7. TABELA 'configuracoes' (LEITURA PÚBLICA / ALTERAÇÃO AUTENTICADA)
-- Clientes carregam nome e regras do salão; alterações restritas a autenticados.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir leitura de configuracoes do salao" ON configuracoes;
DROP POLICY IF EXISTS "Permitir atualizacao de configuracoes" ON configuracoes;
DROP POLICY IF EXISTS "Permitir tudo em configuracoes" ON configuracoes;
DROP POLICY IF EXISTS "Permitir leitura pública de configurações" ON configuracoes;
DROP POLICY IF EXISTS "Permitir modificação de configurações apenas para autenticados" ON configuracoes;

CREATE POLICY "Permitir leitura pública de configurações" 
  ON configuracoes FOR SELECT 
  TO anon, authenticated, service_role 
  USING (true);

CREATE POLICY "Permitir modificação de configurações apenas para autenticados" 
  ON configuracoes FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 8. TABELA 'clientes' (CADASTRO E CONSULTA PÚBLICA / EXCLUSÃO APENAS ADMIN)
-- Clientes criam e atualizam seu cadastro ao agendar; ninguém deleta sem login.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir insercao e atualizacao de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir update de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir exclusao de clientes apenas para autenticados" ON clientes;
DROP POLICY IF EXISTS "Permitir tudo em clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir consulta de clientes para agendamento" ON clientes;
DROP POLICY IF EXISTS "Permitir cadastro e atualizacao de clientes no agendamento" ON clientes;
DROP POLICY IF EXISTS "Permitir atualizacao cadastral de clientes" ON clientes;
DROP POLICY IF EXISTS "Exclusao de clientes apenas para autenticados" ON clientes;

CREATE POLICY "Permitir consulta de clientes para agendamento" 
  ON clientes FOR SELECT 
  TO anon, authenticated, service_role 
  USING (true);

CREATE POLICY "Permitir cadastro e atualizacao de clientes no agendamento" 
  ON clientes FOR INSERT 
  TO anon, authenticated, service_role 
  WITH CHECK (true);

CREATE POLICY "Permitir atualizacao cadastral de clientes" 
  ON clientes FOR UPDATE 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Exclusao de clientes apenas para autenticados" 
  ON clientes FOR DELETE 
  TO authenticated, service_role 
  USING (true);

-- ==============================================================================
-- 9. TABELA 'agendamentos' (CRIAÇÃO E CONFIRMAÇÃO PÚBLICA / EXCLUSÃO APENAS ADMIN)
-- Clientes agendam e confirmam; exclusão protegida para usuários autenticados.
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir criacao publica de agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Permitir leitura de agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Permitir atualizacao de agendamentos autenticado ou webhook" ON agendamentos;
DROP POLICY IF EXISTS "Permitir exclusao de agendamentos apenas para autenticados" ON agendamentos;
DROP POLICY IF EXISTS "Permitir tudo em agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Permitir criacao de agendamentos por clientes" ON agendamentos;
DROP POLICY IF EXISTS "Permitir confirmacao e cancelamento de agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Exclusao de agendamentos apenas para autenticados" ON agendamentos;

CREATE POLICY "Permitir criacao de agendamentos por clientes" 
  ON agendamentos FOR INSERT 
  TO anon, authenticated, service_role 
  WITH CHECK (true);

CREATE POLICY "Permitir leitura de agendamentos" 
  ON agendamentos FOR SELECT 
  TO anon, authenticated, service_role 
  USING (true);

CREATE POLICY "Permitir confirmacao e cancelamento de agendamentos" 
  ON agendamentos FOR UPDATE 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Exclusao de agendamentos apenas para autenticados" 
  ON agendamentos FOR DELETE 
  TO authenticated, service_role 
  USING (true);

-- ==============================================================================
-- 10. TABELA 'lista_espera' (INCLUSÃO PÚBLICA / ATENDIMENTO E GESTÃO ADMIN)
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir tudo em lista_espera" ON lista_espera;
DROP POLICY IF EXISTS "Permitir cadastro na lista de espera" ON lista_espera;
DROP POLICY IF EXISTS "Gestao da lista de espera apenas para autenticados" ON lista_espera;

CREATE POLICY "Permitir cadastro na lista de espera" 
  ON lista_espera FOR INSERT 
  TO anon, authenticated, service_role 
  WITH CHECK (true);

CREATE POLICY "Gestao da lista de espera apenas para autenticados" 
  ON lista_espera FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- 11. TABELA 'licencas' (LEITURA PÚBLICA DA VALIDADE)
-- ==============================================================================
DROP POLICY IF EXISTS "Permitir leitura em licencas" ON licencas;

CREATE POLICY "Permitir leitura em licencas" 
  ON licencas FOR SELECT 
  TO anon, authenticated, service_role 
  USING (true);
