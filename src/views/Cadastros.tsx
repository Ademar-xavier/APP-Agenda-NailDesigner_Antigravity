import React, { useState } from 'react';
import { 
  Sparkles, 
  Bookmark, 
  DollarSign, 
  Plus, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';
import { AlicateIcon } from '../components/AlicateIcon';
import { useAppState } from '../context/AppStateContext';

type TabCadastros = 'tecnicas' | 'formatos' | 'cat_servicos' | 'cat_despesas';

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
    deleteCategoriaDespesa
  } = useAppState();

  const [activeTab, setActiveTab] = useState<TabCadastros>('tecnicas');

  // Input states
  const [novaTecnica, setNovaTecnica] = useState('');
  const [errorTecnica, setErrorTecnica] = useState('');

  const [novoFormato, setNovoFormato] = useState('');
  const [errorFormato, setErrorFormato] = useState('');

  const [novoServCat, setNovoServCat] = useState('');
  const [errorServCat, setErrorServCat] = useState('');

  const [novoDespCat, setNovoDespCat] = useState('');
  const [errorDespCat, setErrorDespCat] = useState('');

  // Handlers
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

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="border-b border-[#EFECE6] pb-4 mb-4">
        <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Central de Cadastros</h2>
        <p className="text-xs text-[#8C7A6B]">Gerencie as listas dinâmicas, formatos, técnicas e categorias gerais do aplicativo</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#EFECE6] mb-5 overflow-x-auto gap-2">
        {[
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
        
        {/* TAB 1: TÉCNICAS */}
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
                {tecnicas.map((tec) => (
                  <div 
                    key={tec}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{tec}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover a técnica "${tec}"?`)) {
                          deleteTecnica(tec);
                        }
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

        {/* TAB 2: FORMATOS */}
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
                {formatos.map((form) => (
                  <div 
                    key={form}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{form}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover o formato "${form}"?`)) {
                          deleteFormato(form);
                        }
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

        {/* TAB 3: CATEGORIAS DE SERVIÇOS */}
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
                {categoriasServico.map((cat) => (
                  <div 
                    key={cat}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{cat}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover a categoria de serviço "${cat}"?`)) {
                          deleteCategoriaServico(cat);
                        }
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

        {/* TAB 4: CATEGORIAS DE DESPESAS */}
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
                {categoriasDespesa.map((cat) => (
                  <div 
                    key={cat}
                    className="flex justify-between items-center p-2.5 border border-[#EFECE6] rounded-xl bg-[#FAF9F6] text-xs hover:border-[#8C6D58] transition-colors"
                  >
                    <span className="font-semibold text-[#5A4535]">{cat}</span>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja remover a categoria de despesa "${cat}"?`)) {
                          deleteCategoriaDespesa(cat);
                        }
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

      </div>
    </div>
  );
};
