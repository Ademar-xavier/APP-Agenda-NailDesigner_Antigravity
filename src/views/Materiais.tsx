import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  AlertTriangle,
  Coins,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Material } from '../types';

export const Materiais: React.FC = () => {
  const { 
    materiais, 
    addMaterial, 
    updateMaterial, 
    deleteMaterial,
    tecnicas,
    addTecnica,
    deleteTecnica,
    formatos,
    addFormato,
    deleteFormato
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'materiais' | 'tecnicas' | 'formatos'>('materiais');
  const [modalOpen, setModalOpen] = useState(false);
  const [materialEdicao, setMaterialEdicao] = useState<Material | null>(null);

  // Form Material Fields
  const [nome, setNome] = useState('');
  const [marca, setMarca] = useState('');
  const [precoCompra, setPrecoCompra] = useState(0);
  const [rendimento, setRendimento] = useState(1);
  const [errorMaterial, setErrorMaterial] = useState('');

  // Form Técnica Fields
  const [novaTecnica, setNovaTecnica] = useState('');
  const [errorTecnica, setErrorTecnica] = useState('');

  // Form Formato Fields
  const [novoFormato, setNovoFormato] = useState('');
  const [errorFormato, setErrorFormato] = useState('');

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

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

  const handleExcluirMaterial = (id: string) => {
    if (confirm('Deseja realmente excluir este material?')) {
      deleteMaterial(id);
    }
  };

  const handleSalvarTecnica = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrimmed = novaTecnica.trim();
    if (!nomeTrimmed) return;

    if (tecnicas.some(t => t.toLowerCase() === nomeTrimmed.toLowerCase())) {
      setErrorTecnica('Esta técnica já está cadastrada.');
      return;
    }

    addTecnica(nomeTrimmed);
    setNovaTecnica('');
    setErrorTecnica('');
  };

  const handleExcluirTecnica = (nome: string) => {
    if (confirm(`Deseja remover a técnica "${nome}"?`)) {
      deleteTecnica(nome);
    }
  };

  const handleSalvarFormato = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrimmed = novoFormato.trim();
    if (!nomeTrimmed) return;

    if (formatos.some(f => f.toLowerCase() === nomeTrimmed.toLowerCase())) {
      setErrorFormato('Este formato já está cadastrado.');
      return;
    }

    addFormato(nomeTrimmed);
    setNovoFormato('');
    setErrorFormato('');
  };

  const handleExcluirFormato = (nome: string) => {
    if (confirm(`Deseja remover o formato "${nome}"?`)) {
      deleteFormato(nome);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Cadastro de Materiais e Técnicas</h2>
          <p className="text-xs text-[#8C7A6B]">Gerencie os insumos do salão, marcas, rendimento e o catálogo de técnicas de unha</p>
        </div>
        {activeTab === 'materiais' && (
          <button
            onClick={handleOpenCriar}
            className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Adicionar Insumo</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EFECE6] mb-5 gap-2">
        <button
          onClick={() => setActiveTab('materiais')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'materiais' 
              ? 'border-[#8C6D58] text-[#8C6D58]' 
              : 'border-transparent text-[#8C7A6B] hover:text-[#5A4535]'
          }`}
        >
          <Package size={14} />
          <span>Materiais e Custos</span>
        </button>
        <button
          onClick={() => setActiveTab('tecnicas')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'tecnicas' 
              ? 'border-[#8C6D58] text-[#8C6D58]' 
              : 'border-transparent text-[#8C7A6B] hover:text-[#5A4535]'
          }`}
        >
          <Sparkles size={14} />
          <span>Técnicas de Unha</span>
        </button>
        <button
          onClick={() => setActiveTab('formatos')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'formatos' 
              ? 'border-[#8C6D58] text-[#8C6D58]' 
              : 'border-transparent text-[#8C7A6B] hover:text-[#5A4535]'
          }`}
        >
          <Bookmark size={14} />
          <span>Formatos de Unha</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-6">
        
        {/* --- TAB 1: MATERIAIS --- */}
        {activeTab === 'materiais' && (
          <>
            {materiais.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <Package size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nenhum material cadastrado</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Adicione produtos para associá-los aos seus serviços e calcular custos reais.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materiais.map((mat) => (
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
          </>
        )}

        {/* --- TAB 2: TÉCNICAS --- */}
        {activeTab === 'tecnicas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Form Cadastro */}
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
                    type="text" required placeholder="Ex: Fibra de Vidro, Banho de Gel..."
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

            {/* Listagem */}
            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Técnicas Ativas ({tecnicas.length})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tecnicas.map((tec) => (
                  <div 
                    key={tec}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{tec}</span>
                    <button
                      onClick={() => handleExcluirTecnica(tec)}
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

        {/* --- TAB 3: FORMATOS --- */}
        {activeTab === 'formatos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Form Cadastro */}
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
                    type="text" required placeholder="Ex: Quadrada, Stiletto, Bailarina..."
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

            {/* Listagem */}
            <div className="lg:col-span-2 bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#FAF9F6] pb-2">
                Formatos Ativos ({formatos.length})
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formatos.map((form) => (
                  <div 
                    key={form}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{form}</span>
                    <button
                      onClick={() => handleExcluirFormato(form)}
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

      </div>

      {/* --- MODAL MATERIAL ADICIONAR/EDITAR --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
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

            <form onSubmit={handleSalvarMaterial} className="space-y-4">
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

              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
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
