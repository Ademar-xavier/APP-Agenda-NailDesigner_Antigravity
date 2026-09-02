import React, { useState, useMemo, useEffect } from 'react';
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
  Package,
  Sparkles
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico } from '../types';
import { AlicateIcon } from '../components/AlicateIcon';

export const Servicos: React.FC = () => {
  const { 
    servicos, 
    addServico, 
    updateServico, 
    deleteServico,
    materiais,
    categoriasServico,
    addCategoriaServico
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
  const [descricao, setDescricao] = useState('');

  // Keyboard Escape listener to close modal in Servicos.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen]);
  
  // Lista de materiais vinculados ao serviço
  const [materiaisSelecionados, setMateriaisSelecionados] = useState<{ material_id: string; quantidade: number }[]>([]);

  // Pacotes/Combos
  const [isPacote, setIsPacote] = useState(false);
  const [servicosPacoteDetalhes, setServicosPacoteDetalhes] = useState<{ servico_id: string; quantidade: number }[]>([]);

  // Duração somada dos sub-serviços do pacote considerando as quantidades
  const duracaoPacoteSomada = useMemo(() => {
    return servicosPacoteDetalhes.reduce((acc, item) => {
      const s = servicos.find(sub => sub.id === item.servico_id);
      return acc + ((s?.duracao_minutos || 0) * item.quantidade);
    }, 0);
  }, [servicosPacoteDetalhes, servicos]);

  // Preço sugerido (soma) dos sub-serviços do pacote considerando as quantidades
  const precoPacoteSugerido = useMemo(() => {
    return servicosPacoteDetalhes.reduce((acc, item) => {
      const s = servicos.find(sub => sub.id === item.servico_id);
      return acc + ((s?.preco || 0) * item.quantidade);
    }, 0);
  }, [servicosPacoteDetalhes, servicos]);

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
    setCategoria(categoriasServico[0] || 'Alongamento');
    setCustomCategoria('');
    setShowCustomCategoria(false);
    setDuracaoMinutos(60);
    setPreco(100);
    setSinalTipo('nenhum');
    setSinalValor(0);
    setIntervaloManutencaoDias(20);
    setDescricao('');
    setMateriaisSelecionados([]);
    setIsPacote(false);
    setServicosPacoteDetalhes([]);
    setModalOpen(true);
  };

  const handleOpenEditar = (serv: Servico) => {
    setServicoEdicao(serv);
    setNome(serv.nome);
    if (categoriasServico.includes(serv.categoria)) {
      setCategoria(serv.categoria);
      setCustomCategoria('');
      setShowCustomCategoria(false);
    } else {
      setCategoria('nova');
      setCustomCategoria(serv.categoria);
      setShowCustomCategoria(true);
    }
    setDuracaoMinutos(serv.duracao_minutos);
    setPreco(serv.preco);
    setSinalTipo(serv.sinal_tipo);
    setSinalValor(serv.sinal_valor);
    setIntervaloManutencaoDias(serv.intervalo_manutencao_dias);
    setDescricao(serv.descricao || '');
    setMateriaisSelecionados(serv.materiais_utilizados || []);
    setIsPacote(serv.is_pacote || false);
    setServicosPacoteDetalhes(serv.servicos_pacote_detalhes || (serv.servicos_pacote || []).map(id => ({ servico_id: id, quantidade: 1 })));
    setModalOpen(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    let catFinal = categoria;
    if (categoria === 'nova') {
      if (!customCategoria.trim()) {
        alert('Por favor, digite o nome da categoria customizada.');
        return;
      }
      addCategoriaServico(customCategoria.trim());
      catFinal = customCategoria.trim();
    }

    const dados = {
      nome,
      categoria: catFinal,
      duracao_minutos: isPacote ? duracaoPacoteSomada : duracaoMinutos,
      preco,
      sinal_tipo: sinalTipo,
      sinal_valor: sinalTipo === 'nenhum' ? 0 : sinalValor,
      intervalo_manutencao_dias: isPacote ? 0 : intervaloManutencaoDias,
      custo_estimado: isPacote ? 0 : custoCalculado,
      materiais_utilizados: isPacote ? [] : materiaisSelecionados,
      is_pacote: isPacote,
      servicos_pacote: isPacote ? servicosPacoteDetalhes.map(d => d.servico_id) : [],
      servicos_pacote_detalhes: isPacote ? servicosPacoteDetalhes : [],
      descricao
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
                    <AlicateIcon size={18} />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#8C7A6B] block uppercase tracking-wider text-[9px] mb-0.5 flex items-center justify-end gap-1">
                      {s.is_pacote && (
                        <span className="bg-[#8C6D58] text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-md">
                          Combo
                        </span>
                      )}
                      {s.categoria}
                    </span>
                    <span className="text-base font-extrabold text-[#5A4535]">{formatarMoeda(s.preco)}</span>
                    
                    {!s.is_pacote && s.custo_estimado !== undefined && s.custo_estimado > 0 && (
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
                  {s.descricao && (
                    <p className="text-[10px] text-[#8C7A6B] mt-1 leading-relaxed line-clamp-2 italic">
                      "{s.descricao}"
                    </p>
                  )}
                  
                  <div className="mt-4 space-y-2 text-xs text-[#8C7A6B]">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-[#8C7A6B]" />
                      <span>Duração total: <strong>{s.duracao_minutos} minutos</strong></span>
                    </div>
                    {s.sinal_tipo !== 'nenhum' && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={13} className="text-amber-600" />
                        <span>
                          Sinal Exigido: <strong>
                            {s.sinal_tipo === 'fixo' 
                              ? formatarMoeda(s.sinal_valor) 
                              : `${s.sinal_valor}% (${formatarMoeda(s.preco * s.sinal_valor / 100)})`}
                          </strong>
                        </span>
                      </div>
                    )}
                    {!s.is_pacote && s.intervalo_manutencao_dias > 0 && (
                      <div className="flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-[#D37F64]" />
                        <span>
                          Manutenção Sugerida: a cada <strong>{s.intervalo_manutencao_dias} dias</strong>
                        </span>
                      </div>
                    )}
                    {!s.is_pacote && s.materiais_utilizados && s.materiais_utilizados.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-[#8C7A6B]" />
                        <span>Insumos Vinculados: <strong>{s.materiais_utilizados.length} itens</strong></span>
                      </div>
                    )}
                    {s.is_pacote && (s.servicos_pacote_detalhes || (s.servicos_pacote || []).map(id => ({ servico_id: id, quantidade: 1 }))).length > 0 && (
                      <div className="flex items-start gap-1.5 mt-2 bg-[#FAF9F6] p-2.5 rounded-xl border border-[#EFECE6] text-[11px] text-[#5A4535]">
                        <Sparkles size={12} className="text-[#8C6D58] mt-0.5 shrink-0" />
                        <div className="w-full">
                          <span className="font-bold block mb-1">Serviços inclusos:</span>
                          <div className="space-y-1 w-full">
                            {(s.servicos_pacote_detalhes || (s.servicos_pacote || []).map(id => ({ servico_id: id, quantidade: 1 }))).map((det, idx) => {
                              const sub = servicos.find(item => item.id === det.servico_id);
                              return sub ? (
                                <div key={idx} className="flex justify-between w-full text-[10px] text-[#8C7A6B]">
                                  <span>• <strong className="text-[#8C6D58]">{det.quantidade}x</strong> {sub.nome}</span>
                                  <span className="font-semibold text-[#5A4535] shrink-0">{sub.duracao_minutos * det.quantidade} min</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#EFECE6] p-6 pb-3">
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

            <form onSubmit={handleSalvar} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
                
                {/* Nome do Serviço */}
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

                {/* Descrição do Serviço */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Descrição do Serviço (Visível para o Cliente)</label>
                  <textarea 
                    rows={2}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva detalhes ou orientações sobre este serviço..."
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6] resize-none"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => {
                      setCategoria(e.target.value);
                      if (e.target.value === 'nova') {
                        setShowCustomCategoria(true);
                      } else {
                        setShowCustomCategoria(false);
                      }
                    }}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6]"
                  >
                    {categoriasServico.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="nova">+ Nova Categoria</option>
                  </select>
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

                {/* Preço */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Preço Cobrado do Cliente (R$)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={preco === 0 ? '' : preco}
                    onChange={(e) => setPreco(Number(e.target.value))}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6]"
                  />
                </div>

                {/* Pacote Toggle */}
                <div className="flex items-center gap-2 p-3 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs">
                  <input 
                    type="checkbox" 
                    id="toggle-pacote"
                    checked={isPacote}
                    onChange={(e) => {
                      setIsPacote(e.target.checked);
                      if (e.target.checked) {
                        setMateriaisSelecionados([]);
                      } else {
                        setServicosPacoteDetalhes([]);
                      }
                    }}
                    className="rounded text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                  />
                  <label htmlFor="toggle-pacote" className="font-bold text-[#5A4535] cursor-pointer select-none">
                    Este serviço é um Pacote / Combo de outros serviços?
                  </label>
                </div>

                {/* Condicional: Se for Pacote */}
                {isPacote ? (
                  <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#EFECE6] space-y-3">
                    <h4 className="font-serif font-bold text-xs text-[#5A4535] border-b border-[#EFECE6] pb-1.5 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#8C6D58]" />
                      <span>Serviços Inclusos no Pacote</span>
                    </h4>
                    
                    {servicos.filter(s => !s.is_pacote && s.id !== servicoEdicao?.id).length === 0 ? (
                      <p className="text-[10px] text-[#8C7A6B] italic">Nenhum serviço individual cadastrado para compor o pacote.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {servicos.filter(s => !s.is_pacote && s.id !== servicoEdicao?.id).map(s => {
                          const itemDetalhe = servicosPacoteDetalhes.find(d => d.servico_id === s.id);
                          const checked = !!itemDetalhe;
                          const qtd = itemDetalhe?.quantidade || 1;
                          
                          return (
                            <div key={s.id} className="flex flex-col gap-2 p-2.5 bg-white rounded-lg border border-[#EFECE6] text-xs">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setServicosPacoteDetalhes(prev => [...prev, { servico_id: s.id, quantidade: 1 }]);
                                      } else {
                                        setServicosPacoteDetalhes(prev => prev.filter(d => d.servico_id !== s.id));
                                      }
                                    }}
                                    className="rounded text-[#8C6D58] focus:ring-[#8C6D58]"
                                  />
                                  <div>
                                    <span className="font-semibold block text-[#5A4535]">{s.nome}</span>
                                    <span className="text-[9px] text-[#8C7A6B]">
                                      Duração: {s.duracao_minutos} min · Retorno: {s.intervalo_manutencao_dias > 0 ? `${s.intervalo_manutencao_dias} dias` : 'Sem retorno'}
                                    </span>
                                  </div>
                                </label>
                                <span className="font-bold text-[#8C6D58]">{formatarMoeda(s.preco)}</span>
                              </div>
                              
                              {/* Se selecionado, permite escolher quantidade */}
                              {checked && (
                                <div className="flex items-center justify-between pt-1.5 border-t border-[#FAF9F6] text-[10px]">
                                  <span className="text-[#8C7A6B] font-semibold">Quantidade no pacote:</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={qtd <= 1}
                                      onClick={() => {
                                        setServicosPacoteDetalhes(prev => prev.map(d => d.servico_id === s.id ? { ...d, quantidade: d.quantidade - 1 } : d));
                                      }}
                                      className="w-5 h-5 rounded bg-[#EFECE6] hover:bg-[#E2DCD5] flex items-center justify-center font-bold text-xs text-[#5A4535] disabled:opacity-50"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold w-4 text-center text-xs text-[#5A4535]">{qtd}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setServicosPacoteDetalhes(prev => prev.map(d => d.servico_id === s.id ? { ...d, quantidade: d.quantidade + 1 } : d));
                                      }}
                                      className="w-5 h-5 rounded bg-[#EFECE6] hover:bg-[#E2DCD5] flex items-center justify-center font-bold text-xs text-[#5A4535]"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Detalhes de Duração / Preço sugerido do pacote */}
                    <div className="pt-2.5 border-t border-[#EFECE6] text-xs space-y-1">
                      <div className="flex justify-between text-[#8C7A6B]">
                        <span>Duração Total Calculada:</span>
                        <span className="font-bold text-[#5A4535]">{duracaoPacoteSomada} minutos</span>
                      </div>
                      <div className="flex justify-between items-center text-[#8C7A6B]">
                        <span>Preço Sugerido (Soma):</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#5A4535]">{formatarMoeda(precoPacoteSugerido)}</span>
                          {precoPacoteSugerido > 0 && (
                            <button
                              type="button"
                              onClick={() => setPreco(precoPacoteSugerido)}
                              className="text-[9px] bg-[#8C6D58] hover:bg-[#725743] text-white px-2 py-0.5 rounded"
                            >
                              Usar Sugerido
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Duração para serviços individuais */}
                    <div>
                      <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Duração (Minutos)</label>
                      <input 
                        type="number" 
                        required
                        min={10}
                        value={duracaoMinutos === 0 ? '' : duracaoMinutos}
                        onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
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
                  </>
                )}

                {/* Regras de Negócio (Sinal & Manutenção) */}
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
                          value={sinalValor === 0 ? '' : sinalValor}
                          onChange={(e) => setSinalValor(Number(e.target.value))}
                          className="w-full border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-[#5A4535] bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {!isPacote && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Intervalo de Manutenção (Dias)</label>
                      <input 
                        type="number"
                        min={0}
                        value={intervaloManutencaoDias === 0 ? '' : intervaloManutencaoDias}
                        onChange={(e) => setIntervaloManutencaoDias(Number(e.target.value))}
                        className="w-full border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-[#5A4535] bg-white"
                      />
                      <p className="text-[9px] text-[#8C7A6B] mt-0.5">Informe "0" se este serviço não exigir manutenção recorrente.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Fixed Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] p-6 bg-white rounded-b-2xl shrink-0">
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
