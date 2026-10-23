-- ==============================================================================
-- SAAS MULTI-TENANT & GESTÃO DE SALÕES (ANTIGRAVITY AGENDA)
-- Isolamento 100% de dados por salão e suporte a novos compradores
-- ==============================================================================

-- 1. ADICIONAR COLUNA salao_id EM TODAS AS TABELAS (com default 'salao_sheila')
-- Garante que todos os dados históricos continuam pertencendo exclusivamente à Sheila
ALTER TABLE IF EXISTS agendamentos ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS clientes ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS servicos ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS materiais ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS despesas ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS usuarios ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS configuracoes ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS lista_espera ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS fotos_clientes ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';

-- 2. GARANTIR QUE NENHUM REGISTRO ANTIGO FIQUE COM salao_id NULO
UPDATE agendamentos SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE clientes SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE servicos SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE materiais SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE despesas SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE usuarios SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE configuracoes SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE lista_espera SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;
UPDATE fotos_clientes SET salao_id = 'salao_sheila' WHERE salao_id IS NULL;

-- 3. EXPANDIR TABELA 'licencas' PARA GESTÃO COMPLETA DE SALÕES CLIENTES DO ADEMAR
ALTER TABLE IF EXISTS licencas ADD COLUMN IF NOT EXISTS salao_id TEXT DEFAULT 'salao_sheila';
ALTER TABLE IF EXISTS licencas ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT 'sheila';
ALTER TABLE IF EXISTS licencas ADD COLUMN IF NOT EXISTS email_proprietaria TEXT;
ALTER TABLE IF EXISTS licencas ADD COLUMN IF NOT EXISTS observacoes TEXT;

UPDATE licencas SET salao_id = 'salao_sheila', slug = 'sheila' WHERE chave LIKE 'SHEILA%' AND salao_id IS NULL;
UPDATE licencas SET salao_id = 'superadmin', slug = 'superadmin' WHERE chave LIKE 'ADEMAR%' AND salao_id IS NULL;

-- 4. ÍNDICES DE PERFORMANCE PARA MULTI-TENANCY RÁPIDO
CREATE INDEX IF NOT EXISTS idx_agendamentos_salao ON agendamentos(salao_id);
CREATE INDEX IF NOT EXISTS idx_clientes_salao ON clientes(salao_id);
CREATE INDEX IF NOT EXISTS idx_servicos_salao ON servicos(salao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_salao ON usuarios(salao_id);
CREATE INDEX IF NOT EXISTS idx_licencas_chave ON licencas(chave);
CREATE INDEX IF NOT EXISTS idx_licencas_salao ON licencas(salao_id);

-- 5. RECARREGAR O CACHE DO SCHEMA POSTGREST
NOTIFY pgrst, 'reload schema';
