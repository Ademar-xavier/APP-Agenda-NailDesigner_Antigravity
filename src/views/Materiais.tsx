import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  AlertTriangle,
  Search
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Material } from '../types';

export const Materiais: React.FC = () => {
  const { 
    materiais, 
    addMaterial, 
    updateMaterial, 
    deleteMaterial
  } = useAppState();

  const [modalOpen, setModalOpen] = useState(false);
  const [materialEdicao, setMaterialEdicao] = useState<Material | null>(null);

  // Filtros de busca
  const [buscaNome, setBuscaNome] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('todas');

  // Form Material Fields
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [precoCompra, setPrecoCompra] = useState(0);
  const [rendimento, setRendimento] = useState(1);
  const [errorMaterial, setErrorMaterial] = useState('');

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Keyboard Escape listener to close modal in Materiais.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);

  const handleOpenCriar = () => {
    setMaterialEdicao(null);
    setNome('');
    setMarca('');
    setPrecoCompra(0);
    setRendimento(10);
    setErrorMaterial('');
    setModalOpen(true);
  };

  const handleOpenEditar = (mat: Material) => {
    setMaterialEdicao(mat);
    setNome(mat.nome);
    setMarca(mat.marca);
    setPrecoCompra(mat.preco_compra);
    setRendimento(mat.rendimento);
    setErrorMaterial('');
    setModalOpen(true);
  };

  const handleSalvarMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !marca || precoCompra <= 0 || rendimento <= 0) {
      setErrorMaterial('Por favor, preencha todos os campos obrigatórios com valores maiores que zero.');
      return;
    }

    const dados = {
      nome,
      marca,
      preco_compra: precoCompra,
      rendimento
    };

    if (materialEdicao) {
      updateMaterial(materialEdicao.id, dados);
    } else {
      addMaterial(dados);
    }

    setModalOpen(false);
  };

  const handleExcluirMaterial = (id: string) => {    if (confirm('Deseja realmente excluir este material?')) {
      deleteMaterial(id);
    }
  };

  // Lista de marcas distintas ordenadas
  const marcasDisponiveis = useMemo(() => {
    const marcasSet = new Set<string>();
    materiais.forEach(m => {
      if (m.marca && m.marca.trim()) {
        marcasSet.add(m.marca.trim());
      }
    });
    return Array.from(marcasSet).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [materiais]);

  // Materiais ordenados alfabeticamente pelo nome (A a Z) e secundariamente pela marca (A a Z)
  const materiaisFiltrados = useMemo(() => {
    return materiais
      .filter(m => {
        const matchNome = m.nome.toLowerCase().includes(buscaNome.toLowerCase().trim());
        const matchMarca = filtroMarca === 'todas' || m.marca.toLowerCase() === filtroMarca.toLowerCase();
        return matchNome && matchMarca;
      })
      .sort((a, b) => {
        const cmpNome = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        if (cmpNome !== 0) return cmpNome;
        return (a.marca || '').localeCompare(b.marca || '', 'pt-BR', { sensitivity: 'base' });
      });
  }, [materiais, buscaNome, filtroMarca]);

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-5">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Cadastro de Materiais e Insumos</h2>
          <p className="text-xs text-[#8C7A6B]">Gerencie os insumos do salão, marcas, rendimento e custo estimado por serviço</p>
        </div>
        <button
          onClick={handleOpenCriar}
          className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Novo Insumo</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 bg-white p-3 rounded-2xl border border-[#EFECE6] shadow-xs">
        {/* Busca por Nome */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl w-full sm:flex-1">
          <Search size={14} className="text-[#8C7A6B]" />
          <input 
            type="text"
            placeholder="Buscar por nome do material..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="text-xs bg-transparent border-none outline-none focus:ring-0 w-full text-[#5A4535]"
          />
          {buscaNome && (
            <button 
              onClick={() => setBuscaNome('')}
              className="text-[#8C7A6B] hover:text-[#5A4535] p-0.5"
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtro por Marca */}
        <div className="w-full sm:w-60">
          <select
            value={filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className="w-full border border-[#EFECE6] bg-[#FAF9F6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
          >
            <option value="todas">Todas as Marcas ({marcasDisponiveis.length})</option>
            {marcasDisponiveis.map(marca => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>
        </div>

        {(buscaNome || filtroMarca !== 'todas') && (
          <button
            onClick={() => {
              setBuscaNome('');
              setFiltroMarca('todas');
            }}
            className="text-[10px] text-[#8C6D58] hover:underline font-bold whitespace-nowrap px-2"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 pb-6">
        {materiais.length === 0 ? (
          <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
            <Package size={36} className="mx-auto text-[#E8DEC9] mb-3" />
            <h4 className="font-semibold text-sm">Nenhum material cadastrado</h4>
            <p className="text-xs mt-1 text-[#C2B7AE]">Adicione produtos para associá-los aos seus serviços e calcular custos reais.</p>
          </div>
        ) : materiaisFiltrados.length === 0 ? (
          <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
            <Search size={36} className="mx-auto text-[#E8DEC9] mb-3" />
            <h4 className="font-semibold text-sm">Nenhum material encontrado</h4>
            <p className="text-xs mt-1 text-[#C2B7AE]">Tente ajustar a busca por nome ou o filtro de marca selecionado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiaisFiltrados.map((mat) => (
              <div 
                key={mat.id} 
                className="p-4 bg-white border border-[#EFECE6] rounded-2xl flex flex-col justify-between hover:border-[#8C6D58] transition-all shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#5A4535]">{mat.nome}</h4>
                      <span className="text-[10px] bg-[#FAF9F6] text-[#8C7A6B] font-bold border border-[#EFECE6] px-2 py-0.5 rounded-lg mt-1 inline-block">
                        Marca: {mat.marca}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditar(mat)}
                        className="p-1.5 hover:bg-[#FAF9F6] border border-[#EFECE6] hover:border-[#8C6D58] text-[#8C7A6B] hover:text-[#8C6D58] rounded-lg transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleExcluirMaterial(mat.id)}
                        className="p-1.5 hover:bg-red-50 border border-[#EFECE6] hover:border-red-200 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#FAF9F6] text-center">
                    <div>
                      <span className="block text-[8px] font-bold uppercase text-[#8C7A6B]">Preço Compra</span>
                      <span className="text-xs font-semibold text-[#5A4535]">{formatarMoeda(mat.preco_compra)}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold uppercase text-[#8C7A6B]">Rendimento</span>
                      <span className="text-xs font-semibold text-[#5A4535]">{mat.rendimento} usos</span>
                    </div>
                    <div className="bg-[#FFF9E6] border border-[#FFECB3] rounded-lg p-1">
                      <span className="block text-[8px] font-bold uppercase text-[#B78103]">Custo p/ Uso</span>
                      <span className="text-xs font-bold text-[#B78103]">{formatarMoeda(mat.custo_por_uso)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL MATERIAL ADICIONAR/EDITAR --- */}
      {modalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#EFECE6] p-6 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">
                  {materialEdicao ? 'Editar Material' : 'Adicionar Material / Insumo'}
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Cadastre o custo e o rendimento para calcular margens de lucro</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarMaterial} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
                {errorMaterial && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{errorMaterial}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome do Produto</label>
                  <input 
                    type="text" required placeholder="Ex: Gel Construtor UV..."
                    value={nome} onChange={(e) => setNome(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Marca do Produto</label>
                  <input 
                    type="text" required placeholder="Ex: Volia, D&Z, X&D..."
                    value={marca} onChange={(e) => setMarca(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Preço de Compra (R$)</label>
                    <input 
                      type="number" required min={0.1} step={0.01}
                      value={precoCompra || ''} onChange={(e) => setPrecoCompra(Number(e.target.value))}
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Rendimento (Usos/Unhas)</label>
                    <input 
                      type="number" required min={1}
                      value={rendimento || ''} onChange={(e) => setRendimento(Number(e.target.value))}
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                    />
                  </div>
                </div>

                {precoCompra > 0 && rendimento > 0 && (
                  <div className="p-3 bg-[#FFF9E6] border border-[#FFECB3] rounded-xl text-center">
                    <span className="text-[10px] font-bold text-[#B78103] uppercase">Custo Unitário p/ Aplicação</span>
                    <span className="block text-lg font-serif font-extrabold text-[#B78103] mt-0.5">
                      {formatarMoeda(precoCompra / rendimento)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] p-6 bg-white rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  {materialEdicao ? 'Salvar Alterações' : 'Cadastrar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
