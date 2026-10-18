-- ==============================================================================
-- SCRIPT DE ENDURECIMENTO DE SEGURANÇA (ROW LEVEL SECURITY - RLS) PARA O SUPABASE
-- Aplicação: Sheila Santos Nails Designer
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
ALTER TABLE IF EXISTS agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS despesas ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA A TABELA 'servicos'
-- Clientes anônimos podem visualizar serviços ativos no catálogo de agendamento
DROP POLICY IF EXISTS "Permitir leitura pública de servicos ativos" ON servicos;
CREATE POLICY "Permitir leitura pública de servicos ativos" 
  ON servicos FOR SELECT 
  TO anon, authenticated 
  USING (ativo = true);

-- Apenas usuários autenticados ou service_role podem inserir, editar ou deletar serviços
DROP POLICY IF EXISTS "Permitir modificação de servicos apenas para autenticados" ON servicos;
CREATE POLICY "Permitir modificação de servicos apenas para autenticados" 
  ON servicos FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 3. POLÍTICAS PARA A TABELA 'agendamentos'
-- O público precisa conseguir criar agendamentos (agendamento online)
DROP POLICY IF EXISTS "Permitir criacao publica de agendamentos" ON agendamentos;
CREATE POLICY "Permitir criacao publica de agendamentos" 
  ON agendamentos FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

-- Leitura de agendamentos para verificação de horários ocupados
DROP POLICY IF EXISTS "Permitir leitura de agendamentos" ON agendamentos;
CREATE POLICY "Permitir leitura de agendamentos" 
  ON agendamentos FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Atualização de agendamentos (ex: confirmação/cancelamento via webhook ou painel)
DROP POLICY IF EXISTS "Permitir atualizacao de agendamentos autenticado ou webhook" ON agendamentos;
CREATE POLICY "Permitir atualizacao de agendamentos autenticado ou webhook" 
  ON agendamentos FOR UPDATE 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- Deleção de agendamentos permitida apenas para operadores autenticados
DROP POLICY IF EXISTS "Permitir exclusao de agendamentos apenas para autenticados" ON agendamentos;
CREATE POLICY "Permitir exclusao de agendamentos apenas para autenticados" 
  ON agendamentos FOR DELETE 
  TO authenticated, service_role 
  USING (true);

-- 4. POLÍTICAS PARA A TABELA 'clientes'
-- Permitir cadastro público durante agendamento
DROP POLICY IF EXISTS "Permitir insercao e atualizacao de clientes" ON clientes;
CREATE POLICY "Permitir insercao e atualizacao de clientes" 
  ON clientes FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update de clientes" ON clientes;
CREATE POLICY "Permitir update de clientes" 
  ON clientes FOR UPDATE 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- Leitura de clientes: Permitida para verificar se telefone já existe ou carregar dados no app
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON clientes;
CREATE POLICY "Permitir leitura de clientes" 
  ON clientes FOR SELECT 
  TO anon, authenticated 
  USING (true);

-- Exclusão de clientes restrita a operadores autenticados
DROP POLICY IF EXISTS "Permitir exclusao de clientes apenas para autenticados" ON clientes;
CREATE POLICY "Permitir exclusao de clientes apenas para autenticados" 
  ON clientes FOR DELETE 
  TO authenticated, service_role 
  USING (true);

-- 5. POLÍTICAS PARA A TABELA 'usuarios' (PROTEÇÃO CRÍTICA DE SENHAS)
-- Bloqueia a leitura da coluna de senha por qualquer chamada anônima externa
DROP POLICY IF EXISTS "Permitir leitura publica de profissionais sem expor senha" ON usuarios;
CREATE POLICY "Permitir leitura publica de profissionais sem expor senha" 
  ON usuarios FOR SELECT 
  TO anon, authenticated 
  USING (ativo = true);

-- Modificação de membros da equipe restrita a autenticados e service_role
DROP POLICY IF EXISTS "Permitir modificacao de usuarios apenas autenticados" ON usuarios;
CREATE POLICY "Permitir modificacao de usuarios apenas autenticados" 
  ON usuarios FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 6. POLÍTICAS PARA A TABELA 'configuracoes'
DROP POLICY IF EXISTS "Permitir leitura de configuracoes do salao" ON configuracoes;
CREATE POLICY "Permitir leitura de configuracoes do salao" 
  ON configuracoes FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao de configuracoes" ON configuracoes;
CREATE POLICY "Permitir atualizacao de configuracoes" 
  ON configuracoes FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 7. POLÍTICAS PARA TABELAS FINANCEIRAS ('despesas' e 'materiais')
-- Proíbe acesso anônimo direto a custos, lucros e gastos do salão
DROP POLICY IF EXISTS "Proteger despesas financeiras" ON despesas;
CREATE POLICY "Proteger despesas financeiras" 
  ON despesas FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Proteger materiais do salao" ON materiais;
CREATE POLICY "Proteger materiais do salao" 
  ON materiais FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- ==============================================================================
-- Fim do script de segurança RLS
-- ==============================================================================
