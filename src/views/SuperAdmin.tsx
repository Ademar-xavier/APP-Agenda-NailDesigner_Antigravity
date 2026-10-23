import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Store, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Calendar, 
  RefreshCw, 
  MessageCircle, 
  Trash2, 
  TrendingUp,
  Clock,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { SalaoLicenca } from '../types';
import { verificarColunaMultiTenantExiste } from '../services/supabase';
import { 
  listarSaloesLicencas, 
  cadastrarNovoSalao, 
  alternarStatusLicenca, 
  renovarLicencaDias, 
  excluirLicenca,
  atualizarLicencaCompleta
} from '../services/superAdminService';

const SQL_MIGRATION_SCRIPT = `-- ==============================================================================
-- SAAS MULTI-TENANT & GESTÃO DE SALÕES (ANTIGRAVITY AGENDA)
-- Isolamento 100% de dados por salão e suporte a novos compradores
-- ==============================================================================

-- 1. ADICIONAR COLUNA salao_id EM TODAS AS TABELAS (com default 'salao_sheila')
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
NOTIFY pgrst, 'reload schema';`;

export const SuperAdmin: React.FC<{ onVoltar?: () => void }> = ({ onVoltar }) => {
  // Autenticação Mestra
  const [autenticado, setAutenticado] = useState<boolean>(() => {
    return sessionStorage.getItem('superadmin_auth') === 'true';
  });
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  // Status Multi-Tenant do Banco Supabase
  const [migrationAtiva, setMigrationAtiva] = useState<boolean>(true);
  const [modalSqlAberto, setModalSqlAberto] = useState(false);
  const [sqlCopiado, setSqlCopiado] = useState(false);

  const [saloes, setSaloes] = useState<SalaoLicenca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'bloqueado' | 'vencido'>('todos');

  // Modal Novo Salão
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoNomeSalao, setNovoNomeSalao] = useState('');
  const [novoProprietaria, setNovoProprietaria] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoTipo, setNovoTipo] = useState<'mensal' | 'vitalicio' | 'teste'>('mensal');
  const [novoValor, setNovoValor] = useState('97,00');
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  // Modal Sucesso WhatsApp
  const [modalSucessoAberto, setModalSucessoAberto] = useState(false);
  const [mensagemSucessoWhats, setMensagemSucessoWhats] = useState('');
  const [telefoneWhatsDestino, setTelefoneWhatsDestino] = useState('');

  // Feedbacks
  const [chaveCopiadaId, setChaveCopiadaId] = useState<string | null>(null);
  const [textoCopiado, setTextoCopiado] = useState(false);

  // Modal Editar Licença Completa
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [licencaEditando, setLicencaEditando] = useState<SalaoLicenca | null>(null);
  const [editChave, setEditChave] = useState('');
  const [editTitular, setEditTitular] = useState('');
  const [editTipo, setEditTipo] = useState<'mensal' | 'vitalicio' | 'teste'>('mensal');
  const [editStatus, setEditStatus] = useState<'ativo' | 'bloqueado'>('ativo');
  const [editExpiracao, setEditExpiracao] = useState('');
  const [editValorMensal, setEditValorMensal] = useState('97,00');
  const [editTelefone, setEditTelefone] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const abrirModalEditar = (s: SalaoLicenca) => {
    setLicencaEditando(s);
    setEditChave(s.chave || '');
    setEditTitular(s.titular || '');
    setEditTipo((s.tipo as any) || 'mensal');
    setEditStatus((s.status as any) || 'ativo');
    setEditExpiracao(s.data_expiracao ? s.data_expiracao.split('T')[0] : '');
    setEditValorMensal(s.valor_mensalidade ? s.valor_mensalidade.toFixed(2).replace('.', ',') : '97,00');
    setEditTelefone(s.telefone || '');
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licencaEditando) return;
    setSalvandoEdicao(true);
    const expDate = editTipo === 'vitalicio' ? null : (editExpiracao ? new Date(`${editExpiracao}T23:59:59`).toISOString() : null);
    const valNum = Number(editValorMensal.replace(/\./g, '').replace(',', '.')) || 97;

    const ok = await atualizarLicencaCompleta(licencaEditando.id, {
      chave: editChave,
      titular: editTitular,
      tipo: editTipo,
      status: editStatus,
      data_expiracao: expDate,
      valor_mensalidade: valNum,
      telefone: editTelefone.replace(/\D/g, '')
    });

    if (ok) {
      setSaloes(prev => prev.map(item => item.id === licencaEditando.id ? {
        ...item,
        chave: editChave.trim().toUpperCase(),
        titular: editTitular,
        tipo: editTipo,
        status: editStatus,
        data_expiracao: expDate,
        valor_mensalidade: valNum,
        telefone: editTelefone.replace(/\D/g, '')
      } : item));
      setModalEditarAberto(false);
      setLicencaEditando(null);
    } else {
      alert('Erro ao atualizar licença no Supabase.');
    }
    setSalvandoEdicao(false);
  };

  const handleAutenticar = (e: React.FormEvent) => {
    e.preventDefault();
    const MASTER_PWD = (import.meta.env.VITE_ADMIN_PASSWORD || 'alicelara0108').trim();
    const digitada = senhaInput.trim();
    if (digitada === MASTER_PWD || digitada === 'ademar2026') {
      setAutenticado(true);
      sessionStorage.setItem('superadmin_auth', 'true');
    } else {
      setErroSenha('Senha mestra incorreta. Tente novamente.');
    }
  };

  const carregarDados = async () => {
    setCarregando(true);
    const dados = await listarSaloesLicencas();
    setSaloes(dados);
    setCarregando(false);
  };

  useEffect(() => {
    if (autenticado) {
      carregarDados();
      verificarColunaMultiTenantExiste().then((existe) => {
        setMigrationAtiva(existe);
      });
    }
  }, [autenticado]);

  const handleCopiarChave = (id: string, chave: string) => {
    navigator.clipboard.writeText(chave);
    setChaveCopiadaId(id);
    setTimeout(() => setChaveCopiadaId(null), 2500);
  };

  const handleAlternarStatus = async (s: SalaoLicenca) => {
    const novo = s.status === 'ativo' ? 'bloqueado' : 'ativo';
    const conf = window.confirm(`Deseja realmente ${novo === 'bloqueado' ? 'BLOQUEAR' : 'ATIVAR'} o salão "${s.titular}"?`);
    if (!conf) return;

    const ok = await alternarStatusLicenca(s.id, novo);
    if (ok) {
      setSaloes(prev => prev.map(item => item.id === s.id ? { ...item, status: novo } : item));
    } else {
      alert('Erro ao atualizar status na nuvem.');
    }
  };

  const handleRenovar30Dias = async (s: SalaoLicenca) => {
    const conf = window.confirm(`Deseja adicionar +30 DIAS na assinatura de "${s.titular}"?`);
    if (!conf) return;

    const res = await renovarLicencaDias(s.id, 30);
    if (res.sucesso) {
      setSaloes(prev => prev.map(item => item.id === s.id ? { ...item, status: 'ativo', data_expiracao: res.novaExpiracao || item.data_expiracao } : item));
      alert(`✅ Licença renovada com sucesso até ${res.novaExpiracao ? new Date(res.novaExpiracao).toLocaleDateString('pt-BR') : ''}!`);
    } else {
      alert('Erro ao renovar licença na nuvem.');
    }
  };

  const handleExcluir = async (s: SalaoLicenca) => {
    if (s.chave.includes('SHEILA') || s.chave.includes('ADEMAR')) {
      alert('Esta licença mestre não pode ser excluída.');
      return;
    }
    const conf = window.confirm(`Atenção: deseja EXCLUIR definitivamente o registro de "${s.titular}"?`);
    if (!conf) return;

    const ok = await excluirLicenca(s.id);
    if (ok) {
      setSaloes(prev => prev.filter(item => item.id !== s.id));
    }
  };

  const handleSalvarNovoSalao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNomeSalao || !novoProprietaria) {
      alert('Preencha o nome do salão e da proprietária.');
      return;
    }

    setSalvandoNovo(true);
    const valNum = parseFloat(novoValor.replace(/\./g, '').replace(',', '.')) || 97;

    const res = await cadastrarNovoSalao({
      nomeSalao: novoNomeSalao,
      proprietaria: novoProprietaria,
      telefone: novoTelefone,
      email: novoEmail,
      tipo: novoTipo,
      valorMensalidade: valNum
    });

    setSalvandoNovo(false);

    if (res.sucesso && res.licenca) {
      setSaloes(prev => [res.licenca!, ...prev]);
      setModalNovoAberto(false);
      setMensagemSucessoWhats(res.textoWhatsApp || '');
      setTelefoneWhatsDestino(novoTelefone.replace(/\D/g, ''));
      setModalSucessoAberto(true);

      // Limpa formulário
      setNovoNomeSalao('');
      setNovoProprietaria('');
      setNovoTelefone('');
      setNovoEmail('');
      setNovoTipo('mensal');
      setNovoValor('97,00');
    } else {
      alert(res.mensagem || 'Falha ao cadastrar salão.');
    }
  };

  // Cálculos de Métricas
  const totalSaloes = saloes.length;
  const saloesAtivos = saloes.filter(s => {
    if (s.status !== 'ativo') return false;
    if (s.data_expiracao && new Date(s.data_expiracao) < new Date()) return false;
    return true;
  }).length;

  const saloesInadimplentes = totalSaloes - saloesAtivos;
  const mrrEstimado = saloes
    .filter(s => s.status === 'ativo' && s.tipo === 'mensal')
    .reduce((acc, s) => acc + (s.valor_mensalidade || 97), 0);

  // Filtro e Busca
  const saloesFiltrados = saloes.filter(s => {
    const isVencido = s.data_expiracao && new Date(s.data_expiracao) < new Date();
    if (filtroStatus === 'ativo' && (s.status !== 'ativo' || isVencido)) return false;
    if (filtroStatus === 'bloqueado' && s.status !== 'bloqueado') return false;
    if (filtroStatus === 'vencido' && !isVencido) return false;

    if (busca) {
      const b = busca.toLowerCase();
      return (
        s.titular?.toLowerCase().includes(b) ||
        s.chave?.toLowerCase().includes(b) ||
        s.telefone?.includes(b) ||
        s.slug?.toLowerCase().includes(b)
      );
    }
    return true;
  });

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20 shadow-inner">
            <ShieldCheck size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Painel Super Admin SaaS</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Área restrita de controle mestre de salões, assinaturas e licenças comerciais. Digite a senha mestra para desbloquear.
            </p>
          </div>

          <form onSubmit={handleAutenticar} className="space-y-4">
            <div>
              <input
                type="password"
                autoFocus
                placeholder="Senha mestra..."
                value={senhaInput}
                onChange={(e) => { setSenhaInput(e.target.value); setErroSenha(''); }}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-sm text-center tracking-widest text-white placeholder-slate-500 focus:outline-hidden transition-colors"
              />
              {erroSenha && <p className="text-xs text-rose-400 mt-2 font-medium">{erroSenha}</p>}
            </div>

            <div className="flex gap-2">
              {onVoltar && (
                <button
                  type="button"
                  onClick={onVoltar}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Voltar
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                Entrar no Painel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Banner de Aviso de Configuração do Banco (se ainda não rodou a migration) */}
        {!migrationAtiva && (
          <div className="bg-amber-950/70 border border-amber-600/40 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-200 animate-in fade-in shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Multi-Tenant Pendente no Supabase</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Ação Rápida</span>
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Execute o script SQL no editor do Supabase para adicionar a coluna <code className="bg-amber-900/60 px-1.5 py-0.5 rounded text-[11px] font-mono text-white">salao_id</code> e isolar salões automaticamente.
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalSqlAberto(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Copy size={13} />
              <span>Ver e Copiar Script SQL</span>
            </button>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            {onVoltar && (
              <button 
                onClick={onVoltar}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Voltar ao App"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Painel Super Admin</h1>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Gestão SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400">Controle de salões clientes, licenças comerciais e faturamento recorrente.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={carregarDados}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-2 text-xs font-semibold"
              title="Recarregar dados"
            >
              <RefreshCw size={15} className={carregando ? 'animate-spin text-amber-400' : ''} />
              <span>Atualizar</span>
            </button>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Cadastrar Novo Salão</span>
            </button>
          </div>
        </div>

        {/* Métricas do SaaS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Total de Salões</span>
              <Store size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">{totalSaloes}</div>
            <p className="text-[11px] text-slate-400 mt-1">Salões na base</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Salões Ativos</span>
              <Users size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{saloesAtivos}</div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Acesso liberado</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Inadimplentes / Bloq.</span>
              <AlertTriangle size={18} className="text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400">{saloesInadimplentes}</div>
            <p className="text-[11px] text-rose-400/80 mt-1">Acesso suspenso</p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">MRR Recorrente</span>
              <TrendingUp size={18} className="text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-300">
              R$ {mrrEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Faturamento mensal</p>
          </div>
        </div>

        {/* Barra de Filtro e Busca */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-800/40 border border-slate-800 p-3 rounded-2xl">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'todos', label: 'Todos os Salões' },
              { id: 'ativo', label: 'Ativos' },
              { id: 'bloqueado', label: 'Bloqueados' },
              { id: 'vencido', label: 'Vencidos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFiltroStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filtroStatus === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar salão, proprietária ou chave..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>
        </div>

        {/* Lista de Salões */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Salão & Proprietária</th>
                  <th className="py-3 px-4">Chave de Licença</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Status & Vencimento</th>
                  <th className="py-3 px-4 text-right">Ações de Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {carregando ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-400" />
                      Carregando salões clientes...
                    </td>
                  </tr>
                ) : saloesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Nenhum salão encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  saloesFiltrados.map((s) => {
                    const isVencido = s.data_expiracao && new Date(s.data_expiracao) < new Date();
                    const isAtivo = s.status === 'ativo' && !isVencido;
                    
                    let diasRestantesText = '';
                    if (s.data_expiracao) {
                      const diff = Math.ceil((new Date(s.data_expiracao).getTime() - new Date().getTime()) / 86400000);
                      diasRestantesText = diff > 0 ? `${diff} dias restantes` : `Venceu há ${Math.abs(diff)} dias`;
                    }

                    const urlSalaoAdmin = `${window.location.origin}/#admin?salao=${s.slug || 'sheila'}`;
                    const urlSalaoAgendar = `${window.location.origin}/#agendar?salao=${s.slug || 'sheila'}`;

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Salão e Titular */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{s.titular}</span>
                            {s.chave.includes('SHEILA') && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                                Sheila Santos
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                            {s.telefone && (
                              <a
                                href={`https://wa.me/55${s.telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                <MessageCircle size={11} />
                                <span>{s.telefone}</span>
                              </a>
                            )}
                            <span className="text-slate-500">Slug: <code className="text-slate-300 font-mono text-[10px]">{s.slug}</code></span>
                          </div>
                        </td>

                        {/* Chave de Licença */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 rounded-md bg-slate-950 border border-slate-700 text-amber-300 font-mono text-xs select-all">
                              {s.chave}
                            </code>
                            <button
                              onClick={() => handleCopiarChave(s.id, s.chave)}
                              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="Copiar Chave"
                            >
                              {chaveCopiadaId === s.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </td>

                        {/* Plano */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200 capitalize">
                            {s.tipo}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.valor_mensalidade ? `R$ ${s.valor_mensalidade.toFixed(2)}/mês` : 'Personalizado'}
                          </div>
                        </td>

                        {/* Status e Vencimento */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-2 h-2 rounded-full ${isAtivo ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                            <span className={`font-bold uppercase text-[10px] ${isAtivo ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isAtivo ? 'Ativo' : (s.status === 'bloqueado' ? 'Bloqueado' : 'Vencido')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.data_expiracao ? (
                              <span>
                                {new Date(s.data_expiracao).toLocaleDateString('pt-BR')} 
                                <span className={`ml-1 text-[10px] ${isVencido ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                                  ({diasRestantesText})
                                </span>
                              </span>
                            ) : (
                              <span className="text-amber-400 font-medium">Vitalício (Sem expiração)</span>
                            )}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Renovar 30 dias */}
                            {s.tipo !== 'vitalicio' && (
                              <button
                                onClick={() => handleRenovar30Dias(s)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-colors flex items-center gap-1"
                                title="Adicionar +30 dias na licença"
                              >
                                <Calendar size={12} />
                                <span>+30 Dias</span>
                              </button>
                            )}

                            {/* Bloquear / Ativar */}
                            <button
                              onClick={() => handleAlternarStatus(s)}
                              className={`p-1.5 rounded-lg border text-[11px] transition-colors ${
                                s.status === 'ativo'
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}
                              title={s.status === 'ativo' ? 'Bloquear Salão' : 'Liberar Salão'}
                            >
                              {s.status === 'ativo' ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>

                            {/* Editar Licença Completa */}
                            <button
                              onClick={() => abrirModalEditar(s)}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] transition-colors"
                              title="Editar dados da licença, chave e tempo de validade"
                            >
                              <Edit size={13} />
                            </button>

                            {/* Abrir Link do Salão */}
                            <a
                              href={urlSalaoAdmin}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                              title="Acessar painel do salão"
                            >
                              <ExternalLink size={13} />
                            </a>

                            {/* Excluir */}
                            {!s.chave.includes('SHEILA') && !s.chave.includes('ADEMAR') && (
                              <button
                                onClick={() => handleExcluir(s)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                                title="Excluir licença"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL CADASTRAR NOVO SALÃO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Cadastrar Novo Salão Cliente</h3>
                  <p className="text-xs text-slate-400">Gera a chave de acesso e os links prontos para a compradora.</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovoAberto(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarNovoSalao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Salão / Studio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Studio Bella Nails"
                  value={novoNomeSalao}
                  onChange={(e) => setNovoNomeSalao(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Proprietária *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mariana Silva"
                    value={novoProprietaria}
                    onChange={(e) => setNovoProprietaria(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp (com DDD) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 35 99999-9999"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Assinatura</label>
                  <select
                    value={novoTipo}
                    onChange={(e) => setNovoTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="mensal">Mensal (30 dias)</option>
                    <option value="teste">Teste Grátis (7 dias)</option>
                    <option value="vitalicio">Vitalício (Ilimitado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor da Mensalidade (R$)</label>
                  <input
                    type="text"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail (opcional)</label>
                <input
                  type="email"
                  placeholder="mariana@studio.com"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovo}
                  className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  {salvandoNovo ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Gerando Acesso...</span>
                    </>
                  ) : (
                    <span>Cadastrar e Gerar Acesso</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUCESSO - MENSAGEM DO WHATSAPP PRONTA */}
      {modalSucessoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Check size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Salão Cadastrado com Sucesso!</h3>
                <p className="text-xs text-slate-400">Envie os dados de acesso para a cliente pelo WhatsApp.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mensagem Pronta de Acesso:</label>
              <textarea
                rows={9}
                readOnly
                value={mensagemSucessoWhats}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-hidden select-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mensagemSucessoWhats);
                  setTextoCopiado(true);
                  setTimeout(() => setTextoCopiado(false), 2500);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {textoCopiado ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{textoCopiado ? 'Mensagem Copiada!' : 'Copiar Mensagem'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setModalSucessoAberto(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Fechar
                </button>
                <a
                  href={`https://wa.me/55${telefoneWhatsDestino}?text=${encodeURIComponent(mensagemSucessoWhats)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <MessageCircle size={15} />
                  <span>Enviar no WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR DADOS E VALIDADE DA LICENÇA */}
      {modalEditarAberto && licencaEditando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-5 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Edit size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Editar Licença do Salão</h3>
                  <p className="text-[11px] text-slate-400">{licencaEditando.titular}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Chave de Licença Oficial
                </label>
                <input
                  type="text"
                  required
                  value={editChave}
                  onChange={(e) => setEditChave(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tipo de Plano
                  </label>
                  <select
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="mensal">Mensal Recorrente</option>
                    <option value="vitalicio">Vitalício (Permanente)</option>
                    <option value="teste">Período de Teste</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Status do Acesso
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold"
                  >
                    <option value="ativo" className="text-emerald-400">Ativo (Liberado)</option>
                    <option value="bloqueado" className="text-rose-400">Bloqueado (Inadimplente)</option>
                  </select>
                </div>
              </div>

              {editTipo !== 'vitalicio' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Data de Validade (Expiração)
                  </label>
                  <input
                    type="date"
                    required
                    value={editExpiracao}
                    onChange={(e) => setEditExpiracao(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setEditExpiracao(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      +30 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 60);
                        setEditExpiracao(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      +60 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() + 1);
                        setEditExpiracao(d.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      +1 Ano
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditTipo('vitalicio');
                        setEditExpiracao('');
                      }}
                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Tornar Vitalício 👑
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Valor Mensalidade (R$)
                  </label>
                  <input
                    type="text"
                    value={editValorMensal}
                    onChange={(e) => setEditValorMensal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp da Cliente
                  </label>
                  <input
                    type="text"
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalEditarAberto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {salvandoEdicao ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{salvandoEdicao ? 'Salvando na Nuvem...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO MULTI-TENANT SQL */}
      {modalSqlAberto && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl text-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Preparar Banco Multi-Tenant no Supabase</h3>
                  <p className="text-xs text-slate-400">Copie o script abaixo e execute no SQL Editor do Supabase.</p>
                </div>
              </div>
              <button
                onClick={() => setModalSqlAberto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <span>Passo a passo (Leva apenas 10 segundos):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Acesse o painel do Supabase (<span className="text-amber-300 font-mono">skdvaxezhskfsfhmvajt</span>)</li>
                <li>No menu esquerdo, clique em <strong>SQL Editor</strong> e depois em <strong>New query</strong></li>
                <li>Cole o script abaixo e clique no botão verde <strong>Run</strong></li>
                <li>Recarregue esta página — o multi-tenant estará 100% isolado!</li>
              </ol>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Script SQL de Configuração:</label>
              <textarea
                rows={10}
                readOnly
                value={SQL_MIGRATION_SCRIPT}
                className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-amber-300 font-mono focus:outline-hidden select-all overflow-y-auto"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalSqlAberto(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
                  setSqlCopiado(true);
                  setTimeout(() => setSqlCopiado(false), 2500);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                {sqlCopiado ? <Check size={14} /> : <Copy size={14} />}
                <span>{sqlCopiado ? 'Script Copiado com Sucesso!' : 'Copiar Script SQL Completo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
