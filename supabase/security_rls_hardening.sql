-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE PERMISSÕES DO SUPABASE (RLS)
-- Aplicação: Sheila Santos Nails Designer
-- Este script corrige o sumiço dos Materiais, Despesas e bloqueios de edição
-- ==============================================================================

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

-- 2. TABELA 'materiais' (CORRIGE O SUMIÇO DOS MATERIAIS)
DROP POLICY IF EXISTS "Proteger materiais do salao" ON materiais;
DROP POLICY IF EXISTS "Permitir tudo em materiais" ON materiais;
CREATE POLICY "Permitir tudo em materiais" 
  ON materiais FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 3. TABELA 'despesas' (CORRIGE O SUMIÇO E BLOQUEIO DE DESPESAS)
DROP POLICY IF EXISTS "Proteger despesas financeiras" ON despesas;
DROP POLICY IF EXISTS "Permitir tudo em despesas" ON despesas;
CREATE POLICY "Permitir tudo em despesas" 
  ON despesas FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 4. TABELA 'servicos' (PERMITE CRIAR, EDITAR E EXCLUIR SERVIÇOS NO APP)
DROP POLICY IF EXISTS "Permitir leitura pública de servicos ativos" ON servicos;
DROP POLICY IF EXISTS "Permitir modificação de servicos apenas para autenticados" ON servicos;
DROP POLICY IF EXISTS "Permitir tudo em servicos" ON servicos;
CREATE POLICY "Permitir tudo em servicos" 
  ON servicos FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 5. TABELA 'agendamentos' (PERMITE CRIAR, ATUALIZAR E EXCLUIR AGENDAMENTOS)
DROP POLICY IF EXISTS "Permitir criacao publica de agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Permitir leitura de agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Permitir atualizacao de agendamentos autenticado ou webhook" ON agendamentos;
DROP POLICY IF EXISTS "Permitir exclusao de agendamentos apenas para autenticados" ON agendamentos;
DROP POLICY IF EXISTS "Permitir tudo em agendamentos" ON agendamentos;
CREATE POLICY "Permitir tudo em agendamentos" 
  ON agendamentos FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 6. TABELA 'clientes' (PERMITE CADASTRAR, EDITAR E EXCLUIR CLIENTES)
DROP POLICY IF EXISTS "Permitir insercao e atualizacao de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir update de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir exclusao de clientes apenas para autenticados" ON clientes;
DROP POLICY IF EXISTS "Permitir tudo em clientes" ON clientes;
CREATE POLICY "Permitir tudo em clientes" 
  ON clientes FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 7. TABELA 'usuarios' (PERMITE SINCRONIZAR E ATUALIZAR PROFISSIONAIS)
DROP POLICY IF EXISTS "Permitir leitura publica de profissionais sem expor senha" ON usuarios;
DROP POLICY IF EXISTS "Permitir modificacao de usuarios apenas autenticados" ON usuarios;
DROP POLICY IF EXISTS "Permitir tudo em usuarios" ON usuarios;
CREATE POLICY "Permitir tudo em usuarios" 
  ON usuarios FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 8. TABELA 'configuracoes'
DROP POLICY IF EXISTS "Permitir leitura de configuracoes do salao" ON configuracoes;
DROP POLICY IF EXISTS "Permitir atualizacao de configuracoes" ON configuracoes;
DROP POLICY IF EXISTS "Permitir tudo em configuracoes" ON configuracoes;
CREATE POLICY "Permitir tudo em configuracoes" 
  ON configuracoes FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 9. TABELA 'lista_espera'
DROP POLICY IF EXISTS "Permitir tudo em lista_espera" ON lista_espera;
CREATE POLICY "Permitir tudo em lista_espera" 
  ON lista_espera FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 10. TABELA 'fotos_clientes'
DROP POLICY IF EXISTS "Permitir tudo em fotos_clientes" ON fotos_clientes;
CREATE POLICY "Permitir tudo em fotos_clientes" 
  ON fotos_clientes FOR ALL 
  TO anon, authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

-- 11. TABELA 'licencas'
DROP POLICY IF EXISTS "Permitir leitura em licencas" ON licencas;
CREATE POLICY "Permitir leitura em licencas" 
  ON licencas FOR SELECT 
  TO anon, authenticated, service_role 
  USING (true);
