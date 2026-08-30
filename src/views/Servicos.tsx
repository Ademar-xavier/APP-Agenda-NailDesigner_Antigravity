import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Scissors, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  Trash2, 
  Edit, 
  Check, 
  X,
  RefreshCw,
  Package
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico } from '../types';

export const Servicos: React.FC = () => {
  const { 
    servicos, 
    addServico, 
    updateServico, 
    deleteServico,
    materiais
  } = useAppState();

  const [modalOpen, setModalOpen] = useState(false);
  const [servicoEdicao, setServicoEdicao] = useState<Servico | null>(null);

  // Form Fields
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<string>('alongamento');
  const [customCategoria, setCustomCategoria] = useState('');
  const [showCustomCategoria, setShowCustomCategoria] = useState(false);
  const [duracaoMinutos, setDuracaoMinutos] = useState(60);
  const [preco, setPreco] = useState(100);
  const [sinalTipo, setSinalTipo] = useState<Servico['sinal_tipo']>('nenhum');
  const [sinalValor, setSinalValor] = useState(0);
  const [intervaloManutencaoDias, setIntervaloManutencaoDias] = useState(20);
  
  // Lista de materiais vinculados ao serviço
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<{ material_id: string; quantidade: number }[]>([]);

  // Custo Estimado Calculado
  const custoCalculado = useMemo(() => {
    return materiaisSelecionados.reduce((acc, item) => {
      const mat = materiais.find(m => m.id === item.material_id);
      if (mat) {
        return acc + (mat.custo_por_uso * item.quantidade);
      }
      return acc;
    }, 0);
  }, [materiaisSelecionados, materiais]);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpenCriar = () => {
    setServicoEdicao(null);
    setNome('');
    setCategoria('alongamento');
    setCustomCategoria('');
    setShowCustomCategoria(false);
    setDuracaoMinutos(60);
    setPreco(100);
    setSinalTipo('nenhum');
    setSinalValor(0);
    setIntervaloManutencaoDias(20);
    setMateriaisSelecionados([]);
    setModalOpen(true);
  };

  const handleOpenEditar = (serv: Servico) => {
    setServicoEdicao(serv);
    setNome(serv.nome);
    const defaultCats = ['alongamento', 'manutencao', 'mao', 'pe', 'decoracao', 'spa', 'outros'];
    if (defaultCats.includes(serv.categoria)) {
      setCategoria(serv.categoria);
      setCustomCategoria('');
      setShowCustomCategoria(false);
    } else {
      setCategoria('outros');
      setCustomCategoria(serv.categoria);
      setShowCustomCategoria(true);
    }
    setDuracaoMinutos(serv.duracao_minutos);
    setPreco(serv.preco);
    setSinalTipo(serv.sinal_tipo);
    setSinalValor(serv.sinal_valor);
    setIntervaloManutencaoDias(serv.intervalo_manutencao_dias);
    setMateriaisSelecionados(serv.materiais_utilizados || []);
    setModalOpen(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    const catFinal = showCustomCategoria ? customCategoria.trim() : categoria;
    if (showCustomCategoria && !customCategoria) {
      alert('Por favor, digite o nome da categoria customizada.');
      return;
    }

    const dados = {
      nome,
      categoria: catFinal,
      duracao_minutos: duracaoMinutos,
      preco,
      sinal_tipo: sinalTipo,
      sinal_valor: sinalTipo === 'nenhum' ? 0 : sinalValor,
      intervalo_manutencao_dias: intervaloManutencaoDias,
      custo_estimado: custoCalculado,
      materiais_utilizados: materiaisSelecionados
    };

    if (servicoEdicao) {
      updateServico(servicoEdicao.id, dados);
    } else {
      addServico(dados);
    }

    setModalOpen(false);
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-6">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Catálogo de Serviços</h2>
          <p className="text-xs text-[#8C7A6B]">Gerencie preços, durações, depósitos de sinal e recorrência de manutenção</p>
        </div>
        <button
          onClick={handleOpenCriar}
          className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Novo Serviço</span>
        </button>
      </div>

      {/* Grid de Serviços */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pr-1 pb-6">
        {servicos
          .filter(s => s.ativo)
          .map((s) => (
            <div 
              key={s.id} 
              className="bg-white p-5 rounded-2xl border border-[#EFECE6] hover:border-[#8C6D58] flex flex-col justify-between gap-4 shadow-sm transition-all"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="p-2.5 bg-[#F6ECE8] text-[#8C6D58] rounded-xl h-fit">
                    <Scissors size={18} />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#8C7A6B] block uppercase tracking-wider text-[9px] mb-0.5">
                      {s.categoria}
                    </span>
                    <span className="text-base font-extrabold text-[#5A4535]">{formatarMoeda(s.preco)}</span>
                    
                    {s.custo_estimado !== undefined && s.custo_estimado > 0 && (
                      <div className="text-[10px] mt-1 font-semibold flex items-center justify-end gap-1">
                        <span className="text-[#8C7A6B]">Insumos: {formatarMoeda(s.custo_estimado)}</span>
                        <span className="bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded text-[8px] font-bold">
                          Margem: {Math.round(((s.preco - s.custo_estimado) / s.preco) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-sm text-[#5A4535]">{s.nome}</h3>
                  
                  <div className="mt-4 space-y-2 text-xs text-[#8C7A6B]">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-[#8C6D58]" />
                      <span>Duração: <strong>{s.duracao_minutos} minutos</strong></span>
                    </div>
                    {s.sinal_tipo !== 'nenhum' && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={13} className="text-[#4FA97A]" />
                        <span>
                          Sinal: <strong>{s.sinal_tipo === 'fixo' ? formatarMoeda(s.sinal_valor) : `${s.sinal_valor}%`}</strong>
                        </span>
                      </div>
                    )}
                    {s.intervalo_manutencao_dias > 0 && (
                      <div className="flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-[#D37F64]" />
                        <span>
                          Manutenção Sugerida: a cada <strong>{s.intervalo_manutencao_dias} dias</strong>
                        </span>
                      </div>
                    )}
                    {s.materiais_utilizados && s.materiais_utilizados.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-[#8C7A6B]" />
                        <span>Insumos Vinculados: <strong>{s.materiais_utilizados.length} itens</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões Ação */}
              <div className="flex items-center gap-2 border-t border-[#FAF9F6] pt-3.5 mt-2">
                <button
                  onClick={() => handleOpenEditar(s)}
                  className="flex-1 bg-white border border-[#EFECE6] text-[#8C7A6B] hover:bg-[#FAF9F6] hover:text-[#5A4535] py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm('Deseja realmente desativar este serviço?')) {
                      deleteServico(s.id);
                    }
                  }}
                  className="px-3 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold transition-all border border-red-100"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* --- MODAL ADICIONAR / EDITAR SERVIÇO --- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EFECE6] my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#5A4535]">
                  {servicoEdicao ? 'Editar Serviço' : 'Novo Serviço'}
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Configure preços, tempos e regras deste procedimento</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Nome do Serviço</label>
                <input 
                  type="text" 
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Alongamento em Acrigel..."
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => {
                      setCategoria(e.target.value);
                      if (e.target.value === 'outros') {
                        setShowCustomCategoria(true);
                      } else {
                        setShowCustomCategoria(false);
                      }
                    }}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6]"
                  >
                    <option value="alongamento">Alongamento</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="mao">Mão Simples</option>
                    <option value="pe">Pé Simples</option>
                    <option value="decoracao">Decoração</option>
                    <option value="spa">Spa / Cuidado</option>
                    <option value="outros">Outros (Digitar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Duração (Minutos)</label>
                  <input 
                    type="number" 
                    required
                    min={10}
                    value={duracaoMinutos}
                    onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6]"
                  />
                </div>
              </div>

              {showCustomCategoria && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Nome da Categoria Customizada</label>
                  <input 
                    type="text" 
                    required
                    value={customCategoria}
                    onChange={(e) => setCustomCategoria(e.target.value)}
                    placeholder="Ex: Cílios, Sobrancelha, Depilação..."
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Preço Cobrado do Cliente (R$)</label>
                <input 
                  type="number" 
                  required
                  min={0}
                  value={preco}
                  onChange={(e) => setPreco(Number(e.target.value))}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6]"
                />
              </div>

              {/* Materiais/Insumos Utilizados */}
              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#EFECE6] space-y-3">
                <h4 className="font-serif font-bold text-xs text-[#5A4535] border-b border-[#EFECE6] pb-1.5 flex items-center gap-1.5">
                  <Package size={14} className="text-[#8C6D58]" />
                  <span>Insumos e Quantidades</span>
                </h4>
                
                {materiais.length === 0 ? (
                  <p className="text-[10px] text-[#8C7A6B] italic">
                    Nenhum insumo cadastrado na base de dados. Cadastre insumos na aba "Materiais" primeiro.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {materiais.map(mat => {
                      const vinculo = materiaisSelecionados.find(ms => ms.material_id === mat.id);
                      const checked = !!vinculo;
                      
                      return (
                        <div key={mat.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-[#EFECE6] text-xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMateriaisSelecionados(prev => [...prev, { material_id: mat.id, quantidade: 1 }]);
                                } else {
                                  setMateriaisSelecionados(prev => prev.filter(item => item.material_id !== mat.id));
                                }
                              }}
                              className="rounded text-[#8C6D58] focus:ring-[#8C6D58]"
                            />
                            <div>
                              <span className="font-semibold block text-[#5A4535]">{mat.nome}</span>
                              <span className="text-[9px] text-[#8C7A6B]">{mat.marca} · {formatarMoeda(mat.custo_por_uso)}/uso</span>
                            </div>
                          </label>

                          {checked && vinculo && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-[#8C7A6B]">Qtd:</span>
                              <input 
                                type="number"
                                min={1}
                                value={vinculo.quantidade}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value));
                                  setMateriaisSelecionados(prev => prev.map(item => 
                                    item.material_id === mat.id ? { ...item, quantidade: val } : item
                                  ));
                                }}
                                className="w-12 border border-[#EFECE6] rounded-md px-1.5 py-0.5 text-center text-xs text-[#5A4535]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Totalizador de Custo */}
                <div className="flex justify-between items-center pt-2.5 border-t border-[#EFECE6] text-xs font-bold">
                  <span className="text-[#8C7A6B]">Custo Estimado Insumos:</span>
                  <span className="text-[#8C6D58]">{formatarMoeda(custoCalculado)}</span>
                </div>
              </div>

              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#EFECE6] space-y-3">
                <h4 className="font-serif font-bold text-xs text-[#5A4535] border-b border-[#EFECE6] pb-1">Regras de Negócio</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Sinal Exigido</label>
                    <select
                      value={sinalTipo}
                      onChange={(e) => setSinalTipo(e.target.value as Servico['sinal_tipo'])}
                      className="w-full border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-[#5A4535] bg-white focus:outline-none"
                    >
                      <option value="nenhum">Nenhum</option>
                      <option value="fixo">Valor Fixo</option>
                      <option value="porcentagem">Porcentagem</option>
                    </select>
                  </div>
                  {sinalTipo !== 'nenhum' && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Valor do Sinal</label>
                      <input 
                        type="number"
                        min={0}
                        value={sinalValor}
                        onChange={(e) => setSinalValor(Number(e.target.value))}
                        className="w-full border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-[#5A4535] bg-white"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Intervalo de Manutenção (Dias)</label>
                  <input 
                    type="number"
                    min={0}
                    value={intervaloManutencaoDias}
                    onChange={(e) => setIntervaloManutencaoDias(Number(e.target.value))}
                    className="w-full border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-[#5A4535] bg-white"
                  />
                  <p className="text-[9px] text-[#8C7A6B] mt-0.5">Informe "0" se este serviço não exigir manutenção recorrente.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
