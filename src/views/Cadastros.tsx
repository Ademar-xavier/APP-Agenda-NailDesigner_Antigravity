import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Bookmark, 
  DollarSign, 
  Plus, 
  Trash2, 
  AlertTriangle,
  ShoppingBag,
  Package,
  Edit3,
  Search,
  CheckCircle2,
  X,
  TrendingUp,
  Boxes,
  Minus
} from 'lucide-react';
import { AlicateIcon } from '../components/AlicateIcon';
import { useAppState } from '../context/AppStateContext';
import { Produto } from '../types';

type TabCadastros = 'produtos' | 'cat_produtos' | 'tecnicas' | 'formatos' | 'cat_servicos' | 'cat_despesas';

export const Cadastros: React.FC = () => {
  const {
    tecnicas,
    addTecnica,
    deleteTecnica,
    formatos,
    addFormato,
    deleteFormato,
    categoriasServico,
    addCategoriaServico,
    deleteCategoriaServico,
    categoriasDespesa,
    addCategoriaDespesa,
    deleteCategoriaDespesa,
    categoriasProduto,
    addCategoriaProduto,
    deleteCategoriaProduto,
    confirmarAcao,
    produtos,
    addProduto,
    updateProduto,
    deleteProduto
  } = useAppState();

  const [activeTab, setActiveTab] = useState<TabCadastros>('produtos');

  // --- Estados de Técnicas, Formatos e Categorias ---
  const [novaTecnica, setNovaTecnica] = useState('');
  const [errorTecnica, setErrorTecnica] = useState('');

  const [novoFormato, setNovoFormato] = useState('');
  const [errorFormato, setErrorFormato] = useState('');

  const [novoServCat, setNovoServCat] = useState('');
  const [errorServCat, setErrorServCat] = useState('');

  const [novoDespCat, setNovoDespCat] = useState('');
  const [errorDespCat, setErrorDespCat] = useState('');

  const [novoProdCat, setNovoProdCat] = useState('');
  const [errorProdCat, setErrorProdCat] = useState('');

  // --- Estados de Produtos (PDV Balcão) ---
  const [buscaProduto, setBuscaProduto] = useState('');
  const [filtroCatProduto, setFiltroCatProduto] = useState('todas');
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  const [prodNome, setProdNome] = useState('');
  const [prodMarca, setProdMarca] = useState('');
  const [prodCategoria, setProdCategoria] = useState(categoriasProduto[0] || 'Geral');
  const [prodPrecoCusto, setProdPrecoCusto] = useState<number>(0);
  const [prodPrecoVenda, setProdPrecoVenda] = useState<number>(0);
  const [prodEstoqueAtual, setProdEstoqueAtual] = useState<number>(0);
  const [prodEstoqueMinimo, setProdEstoqueMinimo] = useState<number>(3);

  // Intercepta Escape e Botão Voltar Nativo do Celular (Android) para fechar o modal de produto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalProdutoAberto) {
        setModalProdutoAberto(false);
      }
    };

    const handleAndroidBack = (e: Event) => {
      if (modalProdutoAberto) {
        if (e.cancelable) e.preventDefault();
        setModalProdutoAberto(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('nail_android_back', handleAndroidBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('nail_android_back', handleAndroidBack);
    };
  }, [modalProdutoAberto]);

  // Handlers Técnicas
  const handleSalvarTecnica = (e: React.FormEvent) => {
    e.preventDefault();
    const val = novaTecnica.trim();
    if (!val) return;
    if (tecnicas.some(t => t.toLowerCase() === val.toLowerCase())) {
      setErrorTecnica('Esta técnica já está cadastrada.');
      return;
    }
    addTecnica(val);
    setNovaTecnica('');
    setErrorTecnica('');
  };

  // Handlers Formatos
  const handleSalvarFormato = (e: React.FormEvent) => {
    e.preventDefault();
    const val = novoFormato.trim();
    if (!val) return;
    if (formatos.some(f => f.toLowerCase() === val.toLowerCase())) {
      setErrorFormato('Este formato já está cadastrado.');
      return;
    }
    addFormato(val);
    setNovoFormato('');
    setErrorFormato('');
  };

  // Handlers Cat Servicos
  const handleSalvarServCat = (e: React.FormEvent) => {
    e.preventDefault();
    const val = novoServCat.trim();
    if (!val) return;
    if (categoriasServico.some(c => c.toLowerCase() === val.toLowerCase())) {
      setErrorServCat('Esta categoria já está cadastrada.');
      return;
    }
    addCategoriaServico(val);
    setNovoServCat('');
    setErrorServCat('');
  };

  // Handlers Cat Despesas
  const handleSalvarDespCat = (e: React.FormEvent) => {
    e.preventDefault();
    const val = novoDespCat.trim();
    if (!val) return;
    if (categoriasDespesa.some(c => c.toLowerCase() === val.toLowerCase())) {
      setErrorDespCat('Esta categoria já está cadastrada.');
      return;
    }
    addCategoriaDespesa(val);
    setNovoDespCat('');
    setErrorDespCat('');
  };

  // Handlers Cat Produtos
  const handleSalvarProdCat = (e: React.FormEvent) => {
    e.preventDefault();
    const val = novoProdCat.trim();
    if (!val) return;
    if (categoriasProduto.some(c => c.toLowerCase() === val.toLowerCase())) {
      setErrorProdCat('Esta categoria já está cadastrada.');
      return;
    }
    addCategoriaProduto(val);
    setNovoProdCat('');
    setErrorProdCat('');
  };

  // --- Handlers Produtos ---
  const abrirModalNovoProduto = () => {
    setProdutoEditando(null);
    setProdNome('');
    setProdMarca('');
    setProdCategoria(categoriasProduto[0] || 'Geral');
    setProdPrecoCusto(0);
    setProdPrecoVenda(0);
    setProdEstoqueAtual(10);
    setProdEstoqueMinimo(3);
    setModalProdutoAberto(true);
  };

  const abrirModalEditarProduto = (prod: Produto) => {
    setProdutoEditando(prod);
    setProdNome(prod.nome);
    setProdMarca(prod.marca || '');
    setProdCategoria(prod.categoria);
    setProdPrecoCusto(prod.preco_custo);
    setProdPrecoVenda(prod.preco_venda);
    setProdEstoqueAtual(prod.estoque_atual);
    setProdEstoqueMinimo(prod.estoque_minimo);
    setModalProdutoAberto(true);
  };

  const handleSalvarProduto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNome.trim()) return;

    if (produtoEditando) {
      updateProduto(produtoEditando.id, {
        nome: prodNome.trim(),
        marca: prodMarca.trim() || undefined,
        categoria: prodCategoria,
        preco_custo: Number(prodPrecoCusto),
        preco_venda: Number(prodPrecoVenda),
        estoque_atual: Number(prodEstoqueAtual),
        estoque_minimo: Number(prodEstoqueMinimo)
      });
    } else {
      addProduto({
        nome: prodNome.trim(),
        marca: prodMarca.trim() || undefined,
        categoria: prodCategoria,
        preco_custo: Number(prodPrecoCusto),
        preco_venda: Number(prodPrecoVenda),
        estoque_atual: Number(prodEstoqueAtual),
        estoque_minimo: Number(prodEstoqueMinimo),
        ativo: true
      });
    }
    setModalProdutoAberto(false);
  };

  const ajustarEstoqueRapido = (id: string, delta: number) => {
    const p = produtos.find(item => item.id === id);
    if (!p) return;
    const novoEstoque = Math.max(0, p.estoque_atual + delta);
    updateProduto(id, { estoque_atual: novoEstoque });
  };

  // Filtros de produtos
  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(buscaProduto.toLowerCase()) || 
                       (p.marca && p.marca.toLowerCase().includes(buscaProduto.toLowerCase()));
    const matchCat = filtroCatProduto === 'todas' || p.categoria === filtroCatProduto;
    return matchBusca && matchCat;
  });

  // Métricas de produtos
  const totalProdutosEstoque = produtos.reduce((acc, p) => acc + p.estoque_atual, 0);
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + (p.estoque_atual * p.preco_venda), 0);
  const produtosEstoqueBaixo = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="border-b border-[#EFECE6] pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Central de Cadastros & Produtos</h2>
          <p className="text-xs text-[#8C7A6B]">Gerencie itens de balcão (PDV) e listas dinâmicas do salão</p>
        </div>
        {activeTab === 'produtos' && (
          <button
            onClick={abrirModalNovoProduto}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
          >
            <Plus size={14} />
            <span>Novo Produto</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EFECE6] mb-5 overflow-x-auto gap-2">
        {[
          { id: 'produtos', label: 'Produtos & PDV (Balcão)', icon: ShoppingBag },
          { id: 'cat_produtos', label: 'Categorias de Produtos', icon: Boxes },
          { id: 'tecnicas', label: 'Técnicas de Unha', icon: Sparkles },
          { id: 'formatos', label: 'Formatos de Unha', icon: Bookmark },
          { id: 'cat_servicos', label: 'Categorias de Serviços', icon: AlicateIcon },
          { id: 'cat_despesas', label: 'Categorias de Despesas', icon: DollarSign }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabCadastros)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive 
                  ? 'border-[#8C6D58] text-[#8C6D58]' 
                  : 'border-transparent text-[#8C7A6B] hover:text-[#5A4535]'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-6">
        
        {/* ======================================================== */}
        {/* TAB: PRODUTOS & PDV DE BALCÃO */}
        {/* ======================================================== */}
        {activeTab === 'produtos' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-[#EFECE6] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8C7A6B] font-medium">Catálogo de Produtos</span>
                  <ShoppingBag size={16} className="text-[#8C6D58]" />
                </div>
                <div className="text-xl font-bold font-serif text-[#5A4535] mt-1">{produtos.length} produtos</div>
                <span className="text-[10px] text-[#8C7A6B]">{totalProdutosEstoque} unidades em estoque</span>
              </div>

              <div className="bg-white border border-[#EFECE6] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8C7A6B] font-medium">Valor Total em Estoque</span>
                  <TrendingUp size={16} className="text-[#8C6D58]" />
                </div>
                <div className="text-xl font-bold font-serif text-[#5A4535] mt-1">
                  R$ {valorTotalEstoque.toFixed(2)}
                </div>
                <span className="text-[10px] text-[#8C7A6B]">Preço de venda projetado</span>
              </div>

              <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${
                produtosEstoqueBaixo.length > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-[#EFECE6]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8C7A6B] font-medium">Estoque Baixo / Alerta</span>
                  <AlertTriangle size={16} className={produtosEstoqueBaixo.length > 0 ? 'text-amber-600' : 'text-[#8C7A6B]'} />
                </div>
                <div className={`text-xl font-bold font-serif mt-1 ${produtosEstoqueBaixo.length > 0 ? 'text-amber-800' : 'text-[#5A4535]'}`}>
                  {produtosEstoqueBaixo.length} itens
                </div>
                <span className="text-[10px] text-[#8C7A6B]">Abaixo do estoque mínimo</span>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-3 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A6B]" />
                <input
                  type="text"
                  placeholder="Buscar produto ou marca..."
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-[10px] font-bold text-[#8C7A6B] uppercase whitespace-nowrap">Categoria:</span>
                <select
                  value={filtroCatProduto}
                  onChange={(e) => setFiltroCatProduto(e.target.value)}
                  className="bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-1.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                >
                  <option value="todas">Todas as categorias</option>
                  {categoriasProduto.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setActiveTab('cat_produtos')}
                  className="text-[11px] font-semibold text-[#8C6D58] hover:text-[#725743] hover:underline whitespace-nowrap ml-1 flex items-center gap-1"
                  title="Gerenciar Categorias de Produtos"
                >
                  <Boxes size={12} />
                  <span>Gerenciar Categorias</span>
                </button>
              </div>
            </div>

            {/* Grid de Produtos */}
            {produtosFiltrados.length === 0 ? (
              <div className="bg-white border border-[#EFECE6] rounded-2xl p-8 text-center space-y-3">
                <ShoppingBag size={36} className="mx-auto text-[#8C7A6B]/50" />
                <h3 className="font-serif font-bold text-sm text-[#5A4535]">Nenhum produto cadastrado</h3>
                <p className="text-xs text-[#8C7A6B] max-w-sm mx-auto">
                  Cadastre produtos de home care, óleos de cutícula e lixas para vender no balcão e elevar o ticket médio dos atendimentos.
                </p>
                <button
                  onClick={abrirModalNovoProduto}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>Cadastrar Primeiro Produto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {produtosFiltrados.map((prod) => {
                  const lucroBruto = prod.preco_venda - prod.preco_custo;
                  const margemPercentual = prod.preco_venda > 0 ? ((lucroBruto / prod.preco_venda) * 100).toFixed(0) : '0';
                  const emFalta = prod.estoque_atual <= 0;
                  const estoqueBaixo = prod.estoque_atual > 0 && prod.estoque_atual <= prod.estoque_minimo;

                  return (
                    <div 
                      key={prod.id}
                      className="bg-white border border-[#EFECE6] rounded-2xl p-4 shadow-sm hover:border-[#8C6D58]/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B] bg-[#FAF9F6] px-2 py-0.5 rounded-full border border-[#EFECE6]">
                              {prod.categoria}
                            </span>
                            <h4 className="font-serif font-bold text-sm text-[#5A4535] mt-1.5">{prod.nome}</h4>
                            {prod.marca && (
                              <p className="text-[11px] text-[#8C7A6B]">{prod.marca}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => abrirModalEditarProduto(prod)}
                              className="p-1.5 hover:bg-[#FAF9F6] text-[#8C7A6B] hover:text-[#5A4535] rounded-lg transition-colors"
                              title="Editar Produto"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                confirmarAcao({
                                  titulo: 'Remover Produto',
                                  mensagem: `Deseja excluir "${prod.nome}" do catálogo?`,
                                  tipo: 'erro',
                                  textoConfirmar: 'Excluir',
                                  onConfirm: () => deleteProduto(prod.id)
                                });
                              }}
                              className="p-1.5 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors"
                              title="Excluir Produto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Preço e Margem */}
                        <div className="mt-3.5 pt-3 border-t border-[#FAF9F6] grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-[#8C7A6B] block">Preço de Venda</span>
                            <span className="text-base font-bold text-[#5A4535] font-serif">
                              R$ {prod.preco_venda.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#8C7A6B] block">Lucro / Margem</span>
                            <span className="text-xs font-semibold text-emerald-700">
                              +R$ {lucroBruto.toFixed(2)} ({margemPercentual}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controle de Estoque */}
                      <div className="mt-4 pt-3 border-t border-[#FAF9F6] flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              emFalta ? 'bg-red-500 animate-pulse' : estoqueBaixo ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span className="text-xs font-bold text-[#5A4535]">
                              {prod.estoque_atual} {prod.estoque_atual === 1 ? 'unidade' : 'unidades'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8C7A6B] block">
                            {emFalta ? 'Esgotado' : estoqueBaixo ? 'Estoque baixo (mín ' + prod.estoque_minimo + ')' : 'Estoque regular'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-[#EFECE6]">
                          <button
                            onClick={() => ajustarEstoqueRapido(prod.id, -1)}
                            disabled={prod.estoque_atual <= 0}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#EFECE6] text-xs font-bold text-[#5A4535] hover:bg-gray-100 disabled:opacity-40 transition-colors"
                            title="Diminuir 1 un"
                          >
                            -
                          </button>
                          <button
                            onClick={() => ajustarEstoqueRapido(prod.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#EFECE6] text-xs font-bold text-[#5A4535] hover:bg-gray-100 transition-colors"
                            title="Adicionar 1 un"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: TÉCNICAS */}
        {/* ======================================================== */}
        {activeTab === 'tecnicas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Cadastrar Técnica
              </h3>
              <form onSubmit={handleSalvarTecnica} className="space-y-3">
                {errorTecnica && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{errorTecnica}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome da Técnica</label>
                  <input 
                    type="text" required placeholder="Ex: Fibra de Vidro, Blindagem..."
                    value={novaTecnica} onChange={(e) => setNovaTecnica(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Adicionar Técnica</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Técnicas Ativas ({tecnicas.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...tecnicas].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((tec) => (
                  <div 
                    key={tec}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{tec}</span>
                    <button
                      onClick={() => {
                        confirmarAcao({
                          titulo: 'Remover Técnica',
                          mensagem: `Deseja remover a técnica "${tec}"?`,
                          tipo: 'erro',
                          textoConfirmar: 'Remover',
                          onConfirm: () => deleteTecnica(tec)
                        });
                      }}
                      className="p-1 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FORMATOS */}
        {/* ======================================================== */}
        {activeTab === 'formatos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Cadastrar Formato de Unha
              </h3>
              <form onSubmit={handleSalvarFormato} className="space-y-3">
                {errorFormato && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{errorFormato}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome do Formato</label>
                  <input 
                    type="text" required placeholder="Ex: Stiletto, Bailarina, Oval..."
                    value={novoFormato} onChange={(e) => setNovoFormato(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Adicionar Formato</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Formatos Ativos ({formatos.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...formatos].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((form) => (
                  <div 
                    key={form}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{form}</span>
                    <button
                      onClick={() => {
                        confirmarAcao({
                          titulo: 'Remover Formato',
                          mensagem: `Deseja remover o formato "${form}"?`,
                          tipo: 'erro',
                          textoConfirmar: 'Remover',
                          onConfirm: () => deleteFormato(form)
                        });
                      }}
                      className="p-1 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CATEGORIAS DE SERVIÇOS */}
        {/* ======================================================== */}
        {activeTab === 'cat_servicos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Cadastrar Categoria de Serviço
              </h3>
              <form onSubmit={handleSalvarServCat} className="space-y-3">
                {errorServCat && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{errorServCat}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome da Categoria</label>
                  <input 
                    type="text" required placeholder="Ex: SPA de Pés, Unha Artística..."
                    value={novoServCat} onChange={(e) => setNovoServCat(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Adicionar Categoria</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Categorias de Serviços Ativas ({categoriasServico.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...categoriasServico].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((cat) => (
                  <div 
                    key={cat}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{cat}</span>
                    <button
                      onClick={() => {
                        confirmarAcao({
                          titulo: 'Remover Categoria',
                          mensagem: `Deseja remover a categoria de serviço "${cat}"?`,
                          tipo: 'erro',
                          textoConfirmar: 'Remover',
                          onConfirm: () => deleteCategoriaServico(cat)
                        });
                      }}
                      className="p-1 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CATEGORIAS DE DESPESAS */}
        {/* ======================================================== */}
        {activeTab === 'cat_despesas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Cadastrar Categoria de Despesa
              </h3>
              <form onSubmit={handleSalvarDespCat} className="space-y-3">
                {errorDespCat && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{errorDespCat}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome da Categoria</label>
                  <input 
                    type="text" required placeholder="Ex: Equipamentos, Energia..."
                    value={novoDespCat} onChange={(e) => setNovoDespCat(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Adicionar Categoria</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Categorias de Despesas Ativas ({categoriasDespesa.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...categoriasDespesa].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((cat) => (
                  <div 
                    key={cat}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{cat}</span>
                    <button
                      onClick={() => {
                        confirmarAcao({
                          titulo: 'Remover Categoria',
                          mensagem: `Deseja remover a categoria de despesa "${cat}"?`,
                          tipo: 'erro',
                          textoConfirmar: 'Remover',
                          onConfirm: () => deleteCategoriaDespesa(cat)
                        });
                      }}
                      className="p-1 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: CATEGORIAS DE PRODUTOS */}
        {/* ======================================================== */}
        {activeTab === 'cat_produtos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#FAF9F6] pb-2">
                <Boxes size={16} className="text-[#8C6D58]" />
                <h3 className="font-serif font-bold text-sm text-[#5A4535]">
                  Cadastrar Categoria de Produto
                </h3>
              </div>
              <p className="text-xs text-[#8C7A6B]">
                Crie categorias para organizar seus itens de balcão (home care, óleos, esmaltes, etc.).
              </p>
              <form onSubmit={handleSalvarProdCat} className="space-y-3">
                {errorProdCat && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>{errorProdCat}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome da Categoria *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Cuidados Pós-Atendimento, Acessórios..."
                    value={novoProdCat} 
                    onChange={(e) => setNovoProdCat(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#8C6D58] hover:bg-[#725743] text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Adicionar Categoria de Produto</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#FAF9F6] pb-2">
                <h3 className="font-serif font-bold text-sm text-[#5A4535]">
                  Categorias de Produtos Ativas ({categoriasProduto.length})
                </h3>
                <span className="text-[11px] text-[#8C7A6B]">
                  Disponíveis no PDV e Balcão
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...categoriasProduto].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((cat) => {
                  const qtdItens = produtos.filter(p => p.categoria === cat).length;
                  return (
                    <div 
                      key={cat}
                      className="flex justify-between items-center p-3 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-[#5A4535] block">{cat}</span>
                        <span className="text-[10px] text-[#8C7A6B]">{qtdItens} {qtdItens === 1 ? 'produto vinculado' : 'produtos vinculados'}</span>
                      </div>
                      <button
                        onClick={() => {
                          confirmarAcao({
                            titulo: 'Remover Categoria',
                            mensagem: `Deseja remover a categoria "${cat}"? Os produtos vinculados manterão seus cadastros.`,
                            tipo: 'erro',
                            textoConfirmar: 'Remover',
                            onConfirm: () => deleteCategoriaProduto(cat)
                          });
                        }}
                        className="p-1.5 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Excluir Categoria"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: NOVO / EDITAR PRODUTO (PDV) */}
      {/* ======================================================== */}
      {modalProdutoAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#EFECE6] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#EFECE6] flex items-center justify-between bg-[#FAF9F6]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#8C6D58]" />
                <h3 className="font-serif font-bold text-sm text-[#5A4535]">
                  {produtoEditando ? 'Editar Produto de Balcão' : 'Cadastrar Produto (PDV)'}
                </h3>
              </div>
              <button
                onClick={() => setModalProdutoAberto(false)}
                className="p-1 text-[#8C7A6B] hover:text-[#5A4535] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Óleo Hidratante de Cutícula 10ml"
                  value={prodNome}
                  onChange={(e) => setProdNome(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Marca</label>
                  <input
                    type="text"
                    placeholder="Ex: Cuccio, Lirió..."
                    value={prodMarca}
                    onChange={(e) => setProdMarca(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Categoria</label>
                  <select
                    value={prodCategoria}
                    onChange={(e) => setProdCategoria(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  >
                    {categoriasProduto.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0"
                    value={prodPrecoCusto === 0 ? '' : prodPrecoCusto}
                    onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                    onChange={(e) => setProdPrecoCusto(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0"
                    value={prodPrecoVenda === 0 ? '' : prodPrecoVenda}
                    onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                    onChange={(e) => setProdPrecoVenda(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
              </div>

              {/* Indicador de Margem Projetada */}
              {prodPrecoVenda > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                  <span>Lucro projetado por un:</span>
                  <strong>
                    R$ {(prodPrecoVenda - prodPrecoCusto).toFixed(2)} ({(((prodPrecoVenda - prodPrecoCusto) / prodPrecoVenda) * 100).toFixed(0)}%)
                  </strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={prodEstoqueAtual === 0 ? '' : prodEstoqueAtual}
                    onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                    onChange={(e) => setProdEstoqueAtual(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={prodEstoqueMinimo === 0 ? '' : prodEstoqueMinimo}
                    onFocus={(e) => { if (e.target.value === '0') e.target.select(); }}
                    onChange={(e) => setProdEstoqueMinimo(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalProdutoAberto(false)}
                  className="px-4 py-2 border border-[#EFECE6] text-xs font-semibold text-[#8C7A6B] hover:text-[#5A4535] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  {produtoEditando ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
