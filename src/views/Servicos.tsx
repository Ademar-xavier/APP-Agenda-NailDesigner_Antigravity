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
  Sparkles,
  Search,
  Crown,
  Edit3,
  Minus,
  TrendingUp
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Servico, PlanoAssinatura, ItemServicoPlano } from '../types';
import { AlicateIcon } from '../components/AlicateIcon';

export const Servicos: React.FC = () => {
  const { 
    servicos, 
    addServico, 
    updateServico, 
    deleteServico,
    materiais,
    categoriasServico,
    addCategoriaServico,
    confirmarAcao,
    mostrarAlerta,
    planosAssinatura,
    addPlanoAssinatura,
    updatePlanoAssinatura,
    deletePlanoAssinatura,
    clientes,
    equipe
  } = useAppState();

  const [abaAtiva, setAbaAtiva] = useState<'servicos' | 'clube_vip'>('servicos');

  // Helper para limpar tags de metadados das descrições
  const limparTextoDescricao = (text?: string): string => {
    if (!text) return '';
    return text.replace(/<!--NAIL_META:[\s\S]*?-->/g, '').trim();
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [servicoEdicao, setServicoEdicao] = useState<Servico | null>(null);

  // Estados de Planos de Assinatura (Clube VIP)
  const [modalPlanoAberto, setModalPlanoAberto] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<PlanoAssinatura | null>(null);
  const [planoNome, setPlanoNome] = useState('');
  const [planoDescricao, setPlanoDescricao] = useState('');
  const [planoPrecoMensal, setPlanoPrecoMensal] = useState<number>(150);
  const [planoQtdProcedimentos, setPlanoQtdProcedimentos] = useState<number>(2);
  const [planoValidadeDias, setPlanoValidadeDias] = useState<number>(30);
  const [planoServicosIds, setPlanoServicosIds] = useState<string[]>([]);
  const [planoQuantidadesServicos, setPlanoQuantidadesServicos] = useState<{ [servicoId: string]: number }>({});
  const [planoProfissionaisServicos, setPlanoProfissionaisServicos] = useState<{ [servicoId: string]: string }>({});

  // Filtros de busca
  const [buscaNome, setBuscaNome] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

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
    setDescricao(limparTextoDescricao(serv.descricao));
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
        mostrarAlerta({
          titulo: 'Campo Obrigatório',
          mensagem: 'Por favor, digite o nome da categoria customizada.',
          tipo: 'aviso'
        });
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
      descricao: limparTextoDescricao(descricao)
    };

    if (servicoEdicao) {
      updateServico(servicoEdicao.id, dados);
    } else {
      addServico(dados);
    }

    setModalOpen(false);
  };

  // --- Handlers e Métricas do Clube VIP ---
  const assinantesAtivos = useMemo(() => {
    return clientes.filter(c => c.assinatura && c.assinatura.status === 'ativo');
  }, [clientes]);

  const mrrEstimado = useMemo(() => {
    return assinantesAtivos.reduce((acc, c) => {
      const plano = planosAssinatura.find(p => p.id === c.assinatura?.plano_id);
      return acc + (plano?.preco_mensal || 0);
    }, 0);
  }, [assinantesAtivos, planosAssinatura]);

  const abrirModalNovoPlano = () => {
    setPlanoEditando(null);
    setPlanoNome('');
    setPlanoDescricao('');
    setPlanoPrecoMensal(180);
    setPlanoQtdProcedimentos(4);
    setPlanoValidadeDias(30);
    setPlanoServicosIds([]);
    setPlanoQuantidadesServicos({});
    setPlanoProfissionaisServicos({});
    setModalPlanoAberto(true);
  };

  const abrirModalEditarPlano = (plano: PlanoAssinatura) => {
    setPlanoEditando(plano);
    setPlanoNome(plano.nome);
    setPlanoDescricao(plano.descricao || '');
    setPlanoPrecoMensal(plano.preco_mensal);
    setPlanoQtdProcedimentos(plano.qtd_procedimentos_mes);
    setPlanoValidadeDias(plano.validade_dias || 30);
    setPlanoServicosIds(plano.servicos_permitidos_ids || []);

    const qtds: { [servicoId: string]: number } = {};
    const profsMap: { [servicoId: string]: string } = {};
    if (plano.itens_servicos && plano.itens_servicos.length > 0) {
      plano.itens_servicos.forEach(item => {
        // CORREÇÃO: Limpa serviços deletados que ainda estavam no plano
        if (servicos.some(s => s.id === item.servico_id && s.ativo)) {
          qtds[item.servico_id] = item.quantidade;
          if (item.profissional_id) {
            profsMap[item.servico_id] = item.profissional_id;
          }
        }
      });
    } else if (plano.servicos_permitidos_ids && plano.servicos_permitidos_ids.length > 0) {
      plano.servicos_permitidos_ids.forEach(sid => {
        if (servicos.some(s => s.id === sid && s.ativo)) {
          qtds[sid] = Math.max(1, Math.floor(plano.qtd_procedimentos_mes / plano.servicos_permitidos_ids!.length) || 1);
        }
      });
    }
    setPlanoQuantidadesServicos(qtds);
    setPlanoProfissionaisServicos(profsMap);
    setModalPlanoAberto(true);
  };

  const alterarQtdServicoPlano = (servicoId: string, delta: number) => {
    setPlanoQuantidadesServicos(prev => {
      const atual = prev[servicoId] || 0;
      const novaQtd = Math.max(0, atual + delta);
      const updated = { ...prev };
      if (novaQtd === 0) {
        delete updated[servicoId];
      } else {
        updated[servicoId] = novaQtd;
      }

      const total = Object.values(updated).reduce((acc, q) => acc + q, 0);
      setPlanoQtdProcedimentos(total > 0 ? total : 1);
      setPlanoServicosIds(Object.keys(updated));
      return updated;
    });
  };

  const definirQtdDiretaServicoPlano = (servicoId: string, val: number) => {
    setPlanoQuantidadesServicos(prev => {
      const novaQtd = Math.max(0, val);
      const updated = { ...prev };
      if (novaQtd === 0) {
        delete updated[servicoId];
      } else {
        updated[servicoId] = novaQtd;
      }

      const total = Object.values(updated).reduce((acc, q) => acc + q, 0);
      setPlanoQtdProcedimentos(total > 0 ? total : 1);
      setPlanoServicosIds(Object.keys(updated));
      return updated;
    });
  };

  const handleSalvarPlano = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoNome.trim()) return;

    const itens_servicos: ItemServicoPlano[] = Object.entries(planoQuantidadesServicos)
      .filter(([servicoId, qtd]) => qtd > 0 && servicos.some(s => s.id === servicoId && s.ativo))
      .map(([servicoId, quantidade]) => {
        const serv = servicos.find(s => s.id === servicoId);
        return {
          servico_id: servicoId,
          nome_servico: serv?.nome || 'Serviço',
          quantidade,
          profissional_id: planoProfissionaisServicos[servicoId] || undefined
        };
      });

    // CORREÇÃO: Respeita fielmente a quantidade total de sessões editada
    const totalProcedimentos = Number(planoQtdProcedimentos) || (
      itens_servicos.length > 0
        ? itens_servicos.reduce((acc, item) => acc + item.quantidade, 0)
        : 1
    );

    const servicosPermitidosIds = itens_servicos.length > 0
      ? itens_servicos.map(i => i.servico_id)
      : planoServicosIds.filter(sid => servicos.some(s => s.id === sid && s.ativo));

    if (planoEditando) {
      updatePlanoAssinatura(planoEditando.id, {
        nome: planoNome.trim(),
        descricao: planoDescricao.trim() || undefined,
        preco_mensal: Number(planoPrecoMensal),
        qtd_procedimentos_mes: totalProcedimentos,
        validade_dias: Number(planoValidadeDias),
        servicos_permitidos_ids: servicosPermitidosIds,
        itens_servicos: itens_servicos
      });
    } else {
      addPlanoAssinatura({
        nome: planoNome.trim(),
        descricao: planoDescricao.trim() || undefined,
        preco_mensal: Number(planoPrecoMensal),
        qtd_procedimentos_mes: totalProcedimentos,
        validade_dias: Number(planoValidadeDias),
        servicos_permitidos_ids: servicosPermitidosIds,
        itens_servicos: itens_servicos,
        ativo: true
      });
    }

    setModalPlanoAberto(false);
  };

  // Serviços ordenados por nome (A a Z) e filtrados por busca e categoria
  const servicosFiltrados = useMemo(() => {
    return servicos
      .filter(s => s.ativo)
      .filter(s => {
        const matchNome = s.nome.toLowerCase().includes(buscaNome.toLowerCase().trim());
        const matchCat = filtroCategoria === 'todas' || (s.categoria || '').toLowerCase() === filtroCategoria.toLowerCase();
        return matchNome && matchCat;
      })
      .sort((a, b) => {
        const cmpNome = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        if (cmpNome !== 0) return cmpNome;
        return (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR', { sensitivity: 'base' });
      });
  }, [servicos, buscaNome, filtroCategoria]);

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header com Sub-Abas: Catálogo de Serviços & Clube VIP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-4">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">
            {abaAtiva === 'servicos' ? 'Catálogo de Serviços' : 'Clube de Assinaturas VIP'}
          </h2>
          <p className="text-xs text-[#8C7A6B]">
            {abaAtiva === 'servicos' 
              ? 'Gerencie preços, durações, depósitos de sinal e insumos vinculados' 
              : 'Gerencie clubes de assinatura recorrente com sessões semanais garantidas'}
          </p>
        </div>
        {abaAtiva === 'servicos' ? (
          <button
            onClick={handleOpenCriar}
            className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Novo Serviço</span>
          </button>
        ) : (
          <button
            onClick={abrirModalNovoPlano}
            className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Novo Plano VIP</span>
          </button>
        )}
      </div>

      {/* Navegação de Abas */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setAbaAtiva('servicos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'servicos'
              ? 'bg-[#8C6D58] text-white shadow-sm'
              : 'bg-white text-[#8C7A6B] hover:bg-[#FAF9F6] border border-[#EFECE6]'
          }`}
        >
          <AlicateIcon size={16} />
          <span>Serviços & Combos ({servicos.filter(s => s.ativo).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('clube_vip')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            abaAtiva === 'clube_vip'
              ? 'bg-[#8C6D58] text-white shadow-sm'
              : 'bg-white text-[#8C7A6B] hover:bg-[#FAF9F6] border border-[#EFECE6]'
          }`}
        >
          <Crown size={16} className={abaAtiva === 'clube_vip' ? 'text-amber-300' : 'text-amber-500'} />
          <span>Clube de Assinaturas VIP ({planosAssinatura.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: CATÁLOGO DE SERVIÇOS & COMBOS */}
      {/* ======================================================== */}
      {abaAtiva === 'servicos' && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 bg-white p-3 rounded-2xl border border-[#EFECE6] shadow-xs">
            {/* Busca por Nome */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl w-full sm:flex-1">
              <Search size={14} className="text-[#8C7A6B]" />
              <input 
                type="text"
                placeholder="Buscar serviço por nome..."
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

            {/* Filtro por Categoria */}
            <div className="w-full sm:w-64">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="w-full border border-[#EFECE6] bg-[#FAF9F6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
              >
                <option value="todas">Todas as Categorias</option>
                {[...categoriasServico].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {(buscaNome || filtroCategoria !== 'todas') && (
              <button
                onClick={() => {
                  setBuscaNome('');
                  setFiltroCategoria('todas');
                }}
                className="text-[10px] text-[#8C6D58] hover:underline font-bold whitespace-nowrap px-2"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Grid de Serviços */}
          <div className="flex-1 overflow-y-auto pr-1 pb-6">
            {servicosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-[#8C7A6B] bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm">
                <Search size={36} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nenhum serviço encontrado</h4>
                <p className="text-xs mt-1 text-[#C2B7AE]">Tente ajustar a busca por nome ou selecionar outra categoria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {servicosFiltrados.map((s) => {
                  const descLimpa = limparTextoDescricao(s.descricao);
                  return (
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
                          {descLimpa && (
                            <p className="text-[10px] text-[#8C7A6B] mt-1 leading-relaxed line-clamp-2 italic">
                              "{descLimpa}"
                            </p>
                          )}
                          
                          <div className="mt-4 space-y-2 text-xs text-[#8C7A6B]">
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-[#8C7A6B]" />
                              <span>Duração total: <strong>{s.duracao_minutos} minutos</strong></span>
                            </div>
                            {s.sinal_tipo && s.sinal_tipo !== 'nenhum' && Number(s.sinal_valor) > 0 ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70 w-fit">
                                <DollarSign size={13} className="text-amber-600 shrink-0" />
                                <span>
                                  Sinal para Reserva: <strong className="font-bold text-amber-900">
                                    {s.sinal_tipo === 'fixo' 
                                      ? formatarMoeda(Number(s.sinal_valor)) 
                                      : `${s.sinal_valor}% (${formatarMoeda((Number(s.preco) || 0) * (Number(s.sinal_valor) || 0) / 100)})`}
                                  </strong>
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-[#5A4535] bg-[#F6ECE8]/60 px-2.5 py-1 rounded-lg border border-[#EFECE6] w-fit">
                                <Check size={12} className="text-[#8C6D58] shrink-0" />
                                <span>Sem exigência de sinal (Pagamento no local)</span>
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
                            confirmarAcao({
                              titulo: 'Desativar Serviço',
                              mensagem: `Deseja realmente desativar o serviço "${s.nome}"?`,
                              tipo: 'erro',
                              textoConfirmar: 'Desativar',
                              textoCancelar: 'Cancelar',
                              onConfirm: () => deleteServico(s.id)
                            });
                          }}
                          className="px-3 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-semibold transition-all border border-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: CLUBE DE ASSINATURAS VIP */}
      {/* ======================================================== */}
      {abaAtiva === 'clube_vip' && (
        <div className="flex-1 overflow-y-auto pr-1 pb-6 space-y-4 animate-in fade-in duration-200">
          {/* KPI Cards Assinaturas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-[#EFECE6] p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8C7A6B] font-medium">Planos Ativos</span>
                <Crown size={16} className="text-amber-500" />
              </div>
              <div className="text-xl font-bold font-serif text-[#5A4535] mt-1">{planosAssinatura.length} opções</div>
              <span className="text-[10px] text-[#8C7A6B]">Planos cadastrados no salão</span>
            </div>

            <div className="bg-white border border-[#EFECE6] p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8C7A6B] font-medium">Assinantes Ativas (VIP)</span>
                <Sparkles size={16} className="text-[#8C6D58]" />
              </div>
              <div className="text-xl font-bold font-serif text-[#5A4535] mt-1">
                {assinantesAtivos.length} clientes
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">Fidelizadas no Clube Recorrente</span>
            </div>

            <div className="bg-gradient-to-br from-[#8C6D58]/10 to-[#5A4535]/10 border border-[#8C6D58]/20 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5A4535] font-semibold">MRR (Receita Recorrente)</span>
                <TrendingUp size={16} className="text-[#8C6D58]" />
              </div>
              <div className="text-xl font-bold font-serif text-[#5A4535] mt-1">
                R$ {mrrEstimado.toFixed(2)}/mês
              </div>
              <span className="text-[10px] text-[#8C7A6B]">Previsibilidade financeira garantida</span>
            </div>
          </div>

          {/* Banner da Regra de Negócio */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-[#5A4535] flex items-center gap-3">
            <Crown size={20} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-950 block">Regra do Clube VIP Ativa:</span>
              <span className="text-amber-900 text-[11px]">
                Os atendimentos do Clube VIP são sempre realizados no <strong>mesmo dia da semana e no mesmo horário</strong> todas as semanas. Ao confirmar o agendamento da cliente VIP, a agenda reserva automaticamente todas as semanas seguintes do ciclo!
              </span>
            </div>
          </div>

          {/* Grid de Planos de Assinatura */}
          {planosAssinatura.length === 0 ? (
            <div className="bg-white border border-[#EFECE6] rounded-2xl p-8 text-center space-y-3">
              <Crown size={36} className="mx-auto text-amber-500/50" />
              <h3 className="font-serif font-bold text-sm text-[#5A4535]">Nenhum Plano VIP Criado</h3>
              <p className="text-xs text-[#8C7A6B] max-w-sm mx-auto">
                Crie clubes de assinatura recorrente para garantir clientes frequentes todo mês (ex: 4 Manicures por R$ 160/mês ou 2 Manutenções por R$ 190/mês).
              </p>
              <button
                onClick={abrirModalNovoPlano}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Plus size={14} />
                <span>Criar Primeiro Plano do Clube</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planosAssinatura.map((plano) => {
                const clientesDoPlano = clientes.filter(c => c.assinatura?.plano_id === plano.id && c.assinatura.status === 'ativo');
                const itensValidos = (plano.itens_servicos || []).filter(item => servicos.some(s => s.id === item.servico_id && s.ativo));

                return (
                  <div 
                    key={plano.id}
                    className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-sm hover:border-amber-400/50 transition-all flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-100 to-transparent rounded-bl-full pointer-events-none" />
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          <Crown size={16} className="text-amber-500" />
                          <h4 className="font-serif font-bold text-base text-[#5A4535]">{plano.nome}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirModalEditarPlano(plano)}
                            className="p-1.5 hover:bg-[#FAF9F6] text-[#8C7A6B] hover:text-[#5A4535] rounded-lg transition-colors"
                            title="Editar Plano"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              confirmarAcao({
                                titulo: 'Remover Plano',
                                mensagem: `Deseja remover o plano "${plano.nome}"? Clientes já vinculadas manterão a assinatura atual.`,
                                tipo: 'erro',
                                textoConfirmar: 'Excluir',
                                onConfirm: () => deletePlanoAssinatura(plano.id)
                              });
                            }}
                            className="p-1.5 hover:bg-red-50 text-[#8C7A6B] hover:text-red-600 rounded-lg transition-colors"
                            title="Excluir Plano"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {plano.descricao && (
                        <p className="text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">{plano.descricao}</p>
                      )}

                      {/* Valor e Regras */}
                      <div className="mt-4 p-3 bg-[#FAF9F6] rounded-xl border border-[#EFECE6] space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-[#8C7A6B]">Mensalidade</span>
                          <span className="text-lg font-bold font-serif text-[#5A4535]">
                            R$ {plano.preco_mensal.toFixed(2)}<span className="text-xs font-normal text-[#8C7A6B]">/mês</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#5A4535] pt-1.5 border-t border-[#EFECE6]/60">
                          <span>Sessões inclusas:</span>
                          <span className="font-bold text-[#8C6D58]">{plano.qtd_procedimentos_mes} sessões semanais</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#5A4535] pt-1.5 border-t border-[#EFECE6]/60">
                          <span>Duração por sessão:</span>
                          <span className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                            ⏱️ {(() => {
                              const dur = (plano.itens_servicos && plano.itens_servicos.length > 0)
                                ? plano.itens_servicos.reduce((acc, it) => {
                                    const s = servicos.find(serv => serv.id === it.servico_id);
                                    return acc + (s?.duracao_minutos || 0);
                                  }, 0)
                                : (plano.servicos_permitidos_ids && plano.servicos_permitidos_ids.length > 0)
                                  ? plano.servicos_permitidos_ids.reduce((acc, sid) => {
                                      const s = servicos.find(serv => serv.id === sid);
                                      return acc + (s?.duracao_minutos || 0);
                                    }, 0)
                                  : 60;
                              
                              const profs = Array.from(new Set((plano.itens_servicos || []).map(it => it.profissional_id).filter(Boolean)));
                              if (profs.length > 1 && dur > 0) {
                                const durDividida = Math.round(dur / profs.length);
                                return `${durDividida} min (${dur}m total ÷ ${profs.length} profissionais simultâneas)`;
                              }
                              return `${dur} min`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Serviços cobertos com quantidades específicas */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-[#8C7A6B] uppercase block mb-1.5">
                          Composição das Sessões no Mês:
                        </span>
                        {itensValidos.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {itensValidos.map(item => {
                              const prof = item.profissional_id ? equipe.find(m => m.id === item.profissional_id) : null;
                              return (
                                <div 
                                  key={item.servico_id} 
                                  className="text-[11px] bg-amber-50/70 border border-amber-200/80 text-[#5A4535] px-2.5 py-1.5 rounded-xl font-medium flex items-center justify-between gap-2 shadow-2xs"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-amber-200/90 text-amber-950 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                      {item.quantidade}x
                                    </span>
                                    <span className="font-semibold">{item.nome_servico}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#8C6D58]">
                                    <span className="bg-white border border-[#EFECE6] px-1.5 py-0.5 rounded-md text-[9px] font-medium">
                                      {prof ? `👤 ${prof.nome}` : 'Qualquer profissional'}
                                    </span>
                                    <span className="text-[9px] text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded font-bold">
                                      {item.quantidade} sem.
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : plano.servicos_permitidos_ids && plano.servicos_permitidos_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {plano.servicos_permitidos_ids
                              .filter(sid => servicos.some(s => s.id === sid && s.ativo))
                              .map(sid => {
                                const s = servicos.find(item => item.id === sid);
                                return s ? (
                                  <span key={sid} className="text-[10px] bg-white border border-[#EFECE6] text-[#8C7A6B] px-1.5 py-0.5 rounded-md">
                                    {s.nome}
                                  </span>
                                ) : null;
                              })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#8C7A6B] italic">Válido para qualquer procedimento</span>
                        )}
                      </div>
                    </div>

                    {/* Footer do Card */}
                    <div className="mt-4 pt-3 border-t border-[#EFECE6] flex items-center justify-between text-xs text-[#8C7A6B]">
                      <span>Validade: {plano.validade_dias || 30} dias</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        {clientesDoPlano.length} {clientesDoPlano.length === 1 ? 'assinante' : 'assinantes'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                    {[...categoriasServico].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(cat => (
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
                        {servicos
                          .filter(s => !s.is_pacote && s.id !== servicoEdicao?.id)
                          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                          .map(s => {
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
                          {[...materiais].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })).map(mat => {
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

      {/* --- MODAL CRIAR / EDITAR PLANO VIP --- */}
      {modalPlanoAberto && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setModalPlanoAberto(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#EFECE6] flex items-center justify-between bg-[#FAF9F6] rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-amber-500" />
                <h3 className="font-serif font-bold text-sm text-[#5A4535]">
                  {planoEditando ? 'Editar Plano de Assinatura' : 'Criar Novo Plano do Clube VIP'}
                </h3>
              </div>
              <button
                onClick={() => setModalPlanoAberto(false)}
                className="p-1 text-[#8C7A6B] hover:text-[#5A4535] rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalvarPlano} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Nome do Plano *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clube VIP Fibra Gold, Clube Esmaltação Perfeita..."
                  value={planoNome}
                  onChange={(e) => setPlanoNome(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Descrição / Benefícios</label>
                <textarea
                  rows={2}
                  placeholder="Ex: 4 atendimentos no mês com mesmo horário semanal garantido..."
                  value={planoDescricao}
                  onChange={(e) => setPlanoDescricao(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Valor Mensal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={planoPrecoMensal}
                    onChange={(e) => setPlanoPrecoMensal(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Total Sessões / Mês *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planoQtdProcedimentos}
                    onChange={(e) => setPlanoQtdProcedimentos(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs font-bold text-[#8C6D58] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Validade (Dias)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={planoValidadeDias}
                    onChange={(e) => setPlanoValidadeDias(parseInt(e.target.value) || 30)}
                    className="w-full bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
              </div>

              {/* Seleção de Serviços Inclusos e Quantidades Específicas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase">
                    Serviços e Quantidades Inclusas no Mês
                  </label>
                  <span className="text-[11px] font-bold text-[#8C6D58] bg-[#F6ECE8] px-2.5 py-0.5 rounded-full border border-[#EFECE6]">
                    Total: {Object.values(planoQuantidadesServicos).reduce((a, b) => a + b, 0)} sessões/mês
                  </span>
                </div>
                <p className="text-[11px] text-[#8C7A6B] mb-2 leading-relaxed">
                  Defina a quantidade de sessões no mês e qual profissional executará cada procedimento. Se profissionais diferentes atenderem na mesma sessão, o tempo será dividido entre elas e as agendas serão bloqueadas semanalmente pelo número de semanas configurado.
                </p>

                <div className="max-h-64 overflow-y-auto border border-[#EFECE6] rounded-xl p-2 space-y-2 bg-[#FAF9F6]">
                  {servicos.filter(s => s.ativo).map((s) => {
                    const qtd = planoQuantidadesServicos[s.id] || 0;
                    const isAtivoNoPlano = qtd > 0;
                    return (
                      <div
                        key={s.id}
                        className={`w-full p-2.5 rounded-xl text-xs flex flex-col transition-all border ${
                          isAtivoNoPlano 
                            ? 'bg-amber-50/80 border-amber-300 shadow-xs' 
                            : 'bg-white border-[#EFECE6] hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isAtivoNoPlano ? 'text-[#5A4535]' : 'text-gray-700'}`}>
                                {s.nome}
                              </span>
                              {isAtivoNoPlano && (
                                <span className="text-[9px] bg-amber-200/90 text-amber-950 font-bold px-1.5 py-0.5 rounded-md">
                                  {qtd}x no mês
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8C7A6B] block mt-0.5">
                              Duração: {s.duracao_minutos} min • Avulso: R$ {s.preco.toFixed(2)}
                            </span>
                          </div>

                          {/* Stepper de Quantidade [-] [qtd] [+] */}
                          <div className="flex items-center gap-1 bg-white border border-[#EFECE6] rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => alterarQtdServicoPlano(s.id, -1)}
                              disabled={qtd <= 0}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-30 text-[#8C7A6B] transition-colors"
                              title="Diminuir quantidade"
                            >
                              <Minus size={12} />
                            </button>
                            
                            <input
                              type="number"
                              min="0"
                              value={qtd}
                              onChange={(e) => definirQtdDiretaServicoPlano(s.id, parseInt(e.target.value) || 0)}
                              className="w-10 text-center font-bold text-xs text-[#5A4535] bg-transparent focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() => alterarQtdServicoPlano(s.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md bg-[#8C6D58] hover:bg-[#725743] text-white transition-colors"
                              title="Aumentar quantidade"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Configuração da Profissional Responsável e Bloqueio */}
                        {isAtivoNoPlano && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#5A4535]">
                              <span className="font-semibold text-[#8C7A6B]">Profissional:</span>
                              <select
                                value={planoProfissionaisServicos[s.id] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPlanoProfissionaisServicos(prev => ({
                                    ...prev,
                                    [s.id]: val
                                  }));
                                }}
                                className="bg-white border border-[#EFECE6] rounded-lg px-2 py-1 text-xs text-[#5A4535] font-medium focus:ring-1 focus:ring-[#8C6D58] outline-none"
                              >
                                <option value="">Qualquer profissional</option>
                                {equipe.filter(m => m.ativo).map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.nome} ({m.especialidade || (m.perfil === 'admin' ? 'Proprietária' : 'Profissional')})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <span className="text-[10px] font-medium text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-md">
                              Bloqueia {qtd} semanas na agenda
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFECE6] flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setModalPlanoAberto(false)}
                  className="px-4 py-2 border border-[#EFECE6] text-xs font-semibold text-[#8C7A6B] hover:text-[#5A4535] rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  {planoEditando ? 'Salvar Plano' : 'Criar Plano VIP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
