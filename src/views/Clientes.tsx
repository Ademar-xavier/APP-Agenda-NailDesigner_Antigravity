import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  Cake, 
  FileText, 
  Sparkles, 
  Scissors,
  CheckCircle,
  XCircle,
  MessageCircle,
  Camera,
  ChevronRight,
  ArrowLeft,
  Settings,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Cliente } from '../types';
import { 
  supabase, 
  salvarFotoClienteSupabase, 
  deletarFotoClienteSupabase 
} from '../services/supabase';

// Compressão e redimensionamento automático de imagens (garante salvamento imediato e evita estouro de cota)
const comprimirImagem = (file: File, maxDim = 1200, qualidade = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', qualidade));
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

interface ClientesProps {
  selectedClienteIdForDetails: string | null;
  setSelectedClienteIdForDetails: (id: string | null) => void;
}

export const Clientes: React.FC<ClientesProps> = ({
  selectedClienteIdForDetails,
  setSelectedClienteIdForDetails
}) => {
  const { 
    clientes, 
    agendamentos, 
    addCliente, 
    updateCliente,
    deleteCliente,
    tecnicas,
    formatos,
    obterServicosDeAgendamento,
    configSalao
  } = useAppState();

  const [busca, setBusca] = useState('');
  const [novoClienteModal, setNovoClienteModal] = useState(false);
  const [clienteEdicao, setClienteEdicao] = useState<Cliente | null>(null);
  
  // Estado para edição/criação
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [aniversario, setAniversario] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [alergias, setAlergias] = useState('');
  
  // Preferências
  const [formato, setFormato] = useState('Quadrada');
  const [tamanho, setTamanho] = useState('Médio');
  const [tecnica, setTecnica] = useState('Gel');
  const [cores, setCores] = useState('');
  const [estilo, setEstilo] = useState('');
  
  // Fotos de Acompanhamento (Antes / Depois) com Persistência
  interface FotoCliente {
    id: string;
    url: string;
    tipo: 'antes' | 'depois';
    criado_em: string;
  }

  const [fotosClientes, setFotosClientes] = useState<{ [clienteId: string]: FotoCliente[] }>(() => {
    try {
      const saved = localStorage.getItem('nail_cliente_fotos_v2');
      if (saved) return JSON.parse(saved);
      return {
        'c1': [
          { id: 'f1', url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400', tipo: 'antes', criado_em: '2026-08-20T10:00:00Z' },
          { id: 'f2', url: 'https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=400', tipo: 'depois', criado_em: '2026-08-20T12:00:00Z' }
        ]
      };
    } catch (e) {
      return {};
    }
  });

  const [filtroFotos, setFiltroFotos] = useState<'todas' | 'antes' | 'depois'>('todas');
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const [targetTipoUpload, setTargetTipoUpload] = useState<'antes' | 'depois' | null>(null);
  const targetTipoUploadRef = useRef<'antes' | 'depois' | null>(null);

  // Carrega fotos salvas do Supabase na inicialização
  useEffect(() => {
    try {
      supabase.from('fotos_clientes').select('*').then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setFotosClientes(prev => {
            const next = { ...prev };
            data.forEach((f: any) => {
              const list = next[f.cliente_id] || [];
              if (!list.some(existing => existing.id === f.id)) {
                next[f.cliente_id] = [...list, {
                  id: f.id,
                  url: f.url,
                  tipo: (f.tipo as 'antes' | 'depois') || 'depois',
                  criado_em: f.criado_em
                }];
              }
            });
            return next;
          });
        }
      });
    } catch (e) {
      console.error('Erro ao buscar fotos do Supabase:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nail_cliente_fotos_v2', JSON.stringify(fotosClientes));
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }, [fotosClientes]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpenCriar = () => {
    setClienteEdicao(null);
    setNome('');
    setTelefone('');
    setEmail('');
    setAniversario('');
    setObservacoes('');
    setAlergias('');
    setFormato(formatos[0] || 'Quadrada');
    setTamanho('Médio');
    setTecnica(tecnicas[0] || 'Gel');
    setCores('');
    setEstilo('');
    setNovoClienteModal(true);
  };

  const handleOpenEditar = (cli: Cliente) => {
    setClienteEdicao(cli);
    setNome(cli.nome);
    setTelefone(cli.telefone);
    setEmail(cli.email || '');
    setAniversario(cli.aniversario || '');
    setObservacoes(cli.observacoes || '');
    setAlergias(cli.alergias || '');
    setFormato(cli.preferencias?.formato || 'Quadrada');
    setTamanho(cli.preferencias?.tamanho || 'Médio');
    setTecnica(cli.preferencias?.tecnica || tecnicas[0] || 'Gel');
    setCores(cli.preferencias?.cores || '');
    setEstilo(cli.preferencias?.estilo || '');
    setNovoClienteModal(true);
  };

  const handleSalvarCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) return;

    const payload = {
      nome,
      telefone,
      email: email || undefined,
      aniversario: aniversario || undefined,
      observacoes: observacoes || undefined,
      alergias: alergias || undefined,
      preferencias: {
        formato,
        tamanho,
        tecnica,
        cores: cores || undefined,
        estilo: estilo || undefined
      },
      consentimento_imagem: true
    };

    if (clienteEdicao) {
      updateCliente(clienteEdicao.id, payload);
    } else {
      addCliente(payload);
    }

    setNovoClienteModal(false);
  };

  // Keyboard Escape listener to close modal or details in Clientes.tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (novoClienteModal) {
          setNovoClienteModal(false);
        } else if (selectedClienteIdForDetails) {
          setSelectedClienteIdForDetails(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [novoClienteModal, selectedClienteIdForDetails, setSelectedClienteIdForDetails]);

  const handleExcluirCliente = (id: string) => {
    if (confirm('Tem certeza de que deseja excluir permanentemente o cadastro desta cliente?')) {
      deleteCliente(id);
      setSelectedClienteIdForDetails(null);
    }
  };

  // Upload real de fotos (múltiplas fotos com seleção Antes/Depois)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedClienteIdForDetails) return;

    const currentTipo = targetTipoUploadRef.current || targetTipoUpload;
    const fileArray = Array.from(files);

    // Comprime as fotos para evitar estouro de cota e garantir persistência imediata
    const promises = fileArray.map(file => comprimirImagem(file));
    const base64List = await Promise.all(promises);
    const validBase64 = base64List.filter(b => b.length > 0);

    if (validBase64.length === 0) return;

    // Se o usuário clicou especificamente em "+ Antes" ou "+ Depois", salva imediatamente
    if (currentTipo) {
      const novasFotos: FotoCliente[] = validBase64.map(url => ({
        id: 'foto_' + Math.random().toString(36).substring(2, 9),
        url,
        tipo: currentTipo,
        criado_em: new Date().toISOString()
      }));

      setFotosClientes(prev => {
        const fotosExistentes = prev[selectedClienteIdForDetails] || [];
        const atualizadas = [...fotosExistentes, ...novasFotos];
        const novoObjeto = { ...prev, [selectedClienteIdForDetails]: atualizadas };

        try {
          localStorage.setItem('nail_cliente_fotos_v2', JSON.stringify(novoObjeto));
        } catch (err) {
          console.error('Erro ao gravar fotos no localStorage:', err);
        }

        // Sincroniza cada foto no Supabase
        novasFotos.forEach(f => {
          salvarFotoClienteSupabase({
            id: f.id,
            cliente_id: selectedClienteIdForDetails,
            url: f.url,
            tipo: f.tipo,
            criado_em: f.criado_em
          });
        });

        return novoObjeto;
      });

      targetTipoUploadRef.current = null;
      setTargetTipoUpload(null);
    } else {
      // Abre modal de seleção para o usuário decidir se são fotos do Antes ou do Depois
      setPendingUploads(validBase64);
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleConfirmPendingUpload = (tipo: 'antes' | 'depois') => {
    if (!selectedClienteIdForDetails || pendingUploads.length === 0) return;

    const novasFotos: FotoCliente[] = pendingUploads.map(url => ({
      id: 'foto_' + Math.random().toString(36).substring(2, 9),
      url,
      tipo,
      criado_em: new Date().toISOString()
    }));

    setFotosClientes(prev => {
      const fotosExistentes = prev[selectedClienteIdForDetails] || [];
      const atualizadas = [...fotosExistentes, ...novasFotos];
      const novoObjeto = { ...prev, [selectedClienteIdForDetails]: atualizadas };

      try {
        localStorage.setItem('nail_cliente_fotos_v2', JSON.stringify(novoObjeto));
      } catch (err) {
        console.error('Erro ao gravar fotos no localStorage:', err);
      }

      novasFotos.forEach(f => {
        salvarFotoClienteSupabase({
          id: f.id,
          cliente_id: selectedClienteIdForDetails,
          url: f.url,
          tipo: f.tipo,
          criado_em: f.criado_em
        });
      });

      return novoObjeto;
    });

    setPendingUploads([]);
  };

  const handleToggleFotoTipo = (fotoId: string) => {
    if (!selectedClienteIdForDetails) return;
    setFotosClientes(prev => {
      const atualizadas = (prev[selectedClienteIdForDetails] || []).map(f => {
        if (f.id === fotoId) {
          const novoTipo = f.tipo === 'antes' ? 'depois' : 'antes';
          salvarFotoClienteSupabase({
            id: f.id,
            cliente_id: selectedClienteIdForDetails,
            url: f.url,
            tipo: novoTipo,
            criado_em: f.criado_em
          });
          return { ...f, tipo: novoTipo as 'antes' | 'depois' };
        }
        return f;
      });

      const novoObjeto = { ...prev, [selectedClienteIdForDetails]: atualizadas };
      try {
        localStorage.setItem('nail_cliente_fotos_v2', JSON.stringify(novoObjeto));
      } catch (err) {
        console.error(err);
      }
      return novoObjeto;
    });
  };

  const handleDeleteFoto = (fotoId: string) => {
    if (!selectedClienteIdForDetails) return;
    if (confirm('Deseja excluir esta foto?')) {
      deletarFotoClienteSupabase(fotoId);
      setFotosClientes(prev => {
        const atualizadas = (prev[selectedClienteIdForDetails] || []).filter(f => f.id !== fotoId);
        const novoObjeto = { ...prev, [selectedClienteIdForDetails]: atualizadas };
        try {
          localStorage.setItem('nail_cliente_fotos_v2', JSON.stringify(novoObjeto));
        } catch (err) {
          console.error(err);
        }
        return novoObjeto;
      });
    }
  };

  const triggerFileInput = (tipo?: 'antes' | 'depois') => {
    targetTipoUploadRef.current = tipo || null;
    setTargetTipoUpload(tipo || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Filtrar clientes e ordenar por ordem alfabética de A a Z
  const clientesFiltrados = clientes
    .filter(c => 
      c.nome.toLowerCase().includes(busca.toLowerCase()) || 
      c.telefone.includes(busca) ||
      c.preferencias?.tecnica?.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const clienteSelecionado = clientes.find(c => c.id === selectedClienteIdForDetails);

  // Histórico de agendamentos da cliente
  const historicoCliente = agendamentos
    .filter(a => a.cliente_id === selectedClienteIdForDetails)
    .sort((a, b) => b.inicio.localeCompare(a.inicio));

  // KPIs da cliente
  const totalAgendamentos = historicoCliente.length;
  const concluidos = historicoCliente.filter(a => a.status === 'concluido');
  const faltas = historicoCliente.filter(a => a.status === 'falta');
  const totalGasto = concluidos.reduce((acc, a) => acc + a.valor_total, 0);

  // Enviar Lembrete / Mensagem no WhatsApp
  const handleEnviarMensagemWhatsApp = (cliente: Cliente, tipo: 'retorno_manutencao' | 'geral', extra?: any) => {
    let msg = '';
    const fone = cliente.telefone.replace(/\D/g, '');

    if (tipo === 'retorno_manutencao') {
      msg = configSalao.templates_whatsapp.retorno_manutencao
        .replace('{cliente}', cliente.nome)
        .replace('{dias_visita}', String(extra?.dias || 20))
        .replace('{servico}', extra?.servico || 'Alongamento')
        .replace('{link_agendamento}', `https://agenda-sheila.com.br/agendar`);
    } else {
      msg = `Olá, ${cliente.nome}! Tudo bem? Gostaria de agendar seu horário conosco?`;
    }

    const url = `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Hidden file input for uploading actual photos (multi-file support) */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        multiple
        onChange={handlePhotoSelect} 
        className="hidden" 
      />

      {clienteSelecionado ? (
        // --- TELA DETALHADA DA CLIENTE ---
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header de Detalhes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EFECE6] pb-4 mb-4 gap-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedClienteIdForDetails(null)}
                className="p-1.5 border border-[#EFECE6] rounded-xl hover:bg-white text-[#8C7A6B] transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg md:text-xl text-[#5A4535]">{clienteSelecionado.nome}</h2>
                <p className="text-xs text-[#8C7A6B]">Visualizando ficha e preferências de esmaltação</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditar(clienteSelecionado)}
                className="flex items-center gap-1.5 bg-white border border-[#EFECE6] text-[#8C6D58] hover:bg-[#FAF9F6] px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Edit2 size={13} />
                <span>Editar Cadastro</span>
              </button>
              <button
                onClick={() => handleExcluirCliente(clienteSelecionado.id)}
                className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-700 hover:bg-red-100 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Trash2 size={13} />
                <span>Excluir Cadastro</span>
              </button>
              <button
                onClick={() => handleEnviarMensagemWhatsApp(clienteSelecionado, 'geral')}
                className="flex items-center gap-1.5 bg-[#4FA97A] hover:bg-[#419266] text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <MessageCircle size={14} />
                <span>Chamar</span>
              </button>
            </div>
          </div>

          {/* Grid Principal de Conteúdo */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pr-1 pb-6">
            {/* Coluna Esquerda: Dados de Cadastro e Preferências */}
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#EFECE6] pb-2">
                  Dados Cadastrais
                </h3>
                
                <div className="space-y-3 text-xs text-[#5A4535]">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[#8C6D58]" />
                    <span>{clienteSelecionado.telefone}</span>
                  </div>
                  {clienteSelecionado.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-[#8C6D58]" />
                      <span>{clienteSelecionado.email}</span>
                    </div>
                  )}
                  {clienteSelecionado.aniversario && (
                    <div className="flex items-center gap-2">
                      <Cake size={14} className="text-[#8C6D58]" />
                      <span>Aniversário: {new Date(clienteSelecionado.aniversario + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                  )}
                  
                  {/* Restrições / Alergias */}
                  <div className="pt-2">
                    <span className="block font-bold text-[10px] uppercase text-[#D37F64] mb-1">Restrições e Alergias</span>
                    <p className={`p-2.5 rounded-lg border text-xs font-medium ${
                      clienteSelecionado.alergias 
                        ? 'bg-[#FDF2F2] border-[#FDE2E2] text-[#C81E1E]' 
                        : 'bg-[#F2F8F4] border-[#DCEFE3] text-[#2B7A4B]'
                    }`}>
                      {clienteSelecionado.alergias || 'Nenhuma restrição registrada'}
                    </p>
                  </div>

                  {/* Observações internas */}
                  <div>
                    <span className="block font-bold text-[10px] uppercase text-[#8C7A6B] mb-1">Observações Internas</span>
                    <p className="p-2.5 bg-[#FAF9F6] border border-[#EFECE6] rounded-lg text-xs italic">
                      {clienteSelecionado.observacoes || 'Sem observações.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ficha Técnica de Unha */}
              <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#EFECE6] pb-2 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-[#8C6D58]" />
                  <span>Ficha Técnica / Preferências</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#8C7A6B] block">Formato:</span>
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.formato || 'Não Informado'}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6B] block">Tamanho:</span>
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.tamanho || 'Não Informado'}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6B] block">Técnica Principal:</span>
                    <span className="font-bold text-[#8C6D58] bg-[#F6ECE8] px-2 py-0.5 rounded-lg border border-[#F3ECE0] inline-block mt-0.5">
                      {clienteSelecionado.preferencias?.tecnica || 'Gel'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6B] block">Estilo Predominante:</span>
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.estilo || 'Não Informado'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#8C7A6B] block">Cores Preferidas:</span>
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.cores || 'Sem restrição de cores'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Central e Direita: Linha do tempo e galeria */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* KPIs & Histórico */}
              <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4 h-fit">
                <h3 className="font-serif font-bold text-sm text-[#5A4535] border-b border-[#EFECE6] pb-2">
                  Resumo Financeiro e Visitas
                </h3>
                
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#EFECE6]">
                    <span className="block text-[9px] font-medium text-[#8C7A6B] uppercase">Gasto Total</span>
                    <span className="block font-bold text-xs text-[#5A4535] mt-1">{formatarMoeda(totalGasto)}</span>
                  </div>
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#EFECE6]">
                    <span className="block text-[9px] font-medium text-[#8C7A6B] uppercase">Visitas</span>
                    <span className="block font-bold text-xs text-[#5A4535] mt-1">{concluidos.length}</span>
                  </div>
                  <div className="bg-[#FAF9F6] p-2.5 rounded-xl border border-[#EFECE6]">
                    <span className="block text-[9px] font-medium text-[#8C7A6B] uppercase">Faltas</span>
                    <span className={`block font-bold text-xs mt-1 ${faltas.length > 0 ? 'text-[#C81E1E]' : 'text-[#2B7A4B]'}`}>
                      {faltas.length}
                    </span>
                  </div>
                </div>

                <h4 className="font-serif font-bold text-xs text-[#5A4535] mb-2">Linha do Tempo</h4>
                {totalAgendamentos === 0 ? (
                  <p className="text-xs text-[#8C7A6B] italic text-center py-4">Nenhum atendimento no histórico.</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {historicoCliente.map((a) => {
                      const servs = obterServicosDeAgendamento(a.id);
                      const servText = servs.map(s => s.nome).join(', ');
                      
                      return (
                        <div key={a.id} className="p-3 border border-[#EFECE6] rounded-xl flex items-center justify-between gap-3 bg-[#FAF9F6]">
                          <div>
                            <span className="block text-[10px] font-semibold text-[#8C7A6B]">
                              {new Date(a.inicio).toLocaleDateString('pt-BR')} às {a.inicio.split('T')[1].substring(0, 5)}
                            </span>
                            <span className="block font-medium text-xs text-[#5A4535] mt-0.5">{servText}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="block font-extrabold text-xs text-[#5A4535]">{formatarMoeda(a.valor_total)}</span>
                            <span className={`inline-block text-[9px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded ${
                              a.status === 'concluido' ? 'bg-[#E2E3E5] text-[#383D41]' :
                              a.status === 'falta' ? 'bg-[#FDF2F9] text-[#9B2C2C]' :
                              a.status === 'confirmado' ? 'bg-[#EBF7EE] text-[#2B7A4B]' :
                              'bg-[#FFF9E6] text-[#B78103]'
                            }`}>
                              {a.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Fotos / Galeria */}
              {(() => {
                const todasFotosCliente = fotosClientes[clienteSelecionado.id] || [];
                const fotosExibidas = todasFotosCliente.filter(f => {
                  if (filtroFotos === 'antes') return f.tipo === 'antes';
                  if (filtroFotos === 'depois') return f.tipo === 'depois';
                  return true;
                });
                const totalAntes = todasFotosCliente.filter(f => f.tipo === 'antes').length;
                const totalDepois = todasFotosCliente.filter(f => f.tipo === 'depois').length;

                return (
                  <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFECE6] pb-3">
                      <div>
                        <h3 className="font-serif font-bold text-sm text-[#5A4535]">
                          Fotos de Acompanhamento
                        </h3>
                        <p className="text-[10px] text-[#8C7A6B]">
                          {todasFotosCliente.length} foto(s) cadastradas
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => triggerFileInput('antes')}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-all shadow-xs active:scale-95"
                          title="Adicionar uma ou mais fotos do Antes"
                        >
                          <Camera size={12} />
                          <span>+ Antes</span>
                        </button>
                        <button
                          onClick={() => triggerFileInput('depois')}
                          className="flex items-center gap-1 text-[10px] font-bold text-white bg-[#8C6D58] hover:bg-[#725743] px-2.5 py-1.5 rounded-lg transition-all shadow-xs active:scale-95"
                          title="Adicionar uma ou mais fotos do Depois"
                        >
                          <Sparkles size={12} />
                          <span>+ Depois</span>
                        </button>
                      </div>
                    </div>

                    {/* Filtros de Fotos */}
                    {todasFotosCliente.length > 0 && (
                      <div className="flex items-center gap-1.5 border-b border-[#F5F2EB] pb-2">
                        <button
                          onClick={() => setFiltroFotos('todas')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            filtroFotos === 'todas'
                              ? 'bg-[#5A4535] text-white shadow-xs'
                              : 'bg-[#FAF9F6] text-[#8C7A6B] hover:bg-[#EFECE6]'
                          }`}
                        >
                          Todas ({todasFotosCliente.length})
                        </button>
                        <button
                          onClick={() => setFiltroFotos('antes')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            filtroFotos === 'antes'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100'
                          }`}
                        >
                          📸 Antes ({totalAntes})
                        </button>
                        <button
                          onClick={() => setFiltroFotos('depois')}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                            filtroFotos === 'depois'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100'
                          }`}
                        >
                          ✨ Depois ({totalDepois})
                        </button>
                      </div>
                    )}

                    {fotosExibidas.length === 0 ? (
                      <div className="text-center py-8 text-[#8C7A6B]">
                        <Camera size={36} className="mx-auto text-[#E8DEC9] mb-2" />
                        <p className="text-xs">
                          {todasFotosCliente.length === 0 
                            ? 'Nenhuma foto adicionada ainda.' 
                            : 'Nenhuma foto nesta categoria.'}
                        </p>
                        <p className="text-[10px] text-[#A8988B] mt-1">
                          Você pode selecionar múltiplas fotos do celular ou computador de uma só vez.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {fotosExibidas.map((foto) => (
                          <div key={foto.id} className="rounded-xl overflow-hidden border border-[#EFECE6] aspect-square relative bg-[#FAF9F6] group">
                            <img 
                              src={foto.url} 
                              alt={`Foto unhas ${foto.tipo}`} 
                              className="w-full h-full object-cover" 
                            />
                            
                            {/* Botão de Excluir */}
                            <button
                              onClick={() => handleDeleteFoto(foto.id)}
                              title="Excluir foto"
                              className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100 shadow-sm"
                            >
                              <Trash2 size={11} />
                            </button>

                            {/* Badge Antes / Depois (Clicável para alternar) */}
                            <button
                              onClick={() => handleToggleFotoTipo(foto.id)}
                              title="Clique para alternar entre Antes e Depois"
                              className={`absolute bottom-1.5 left-1.5 text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-xs transition-transform active:scale-95 ${
                                foto.tipo === 'antes' 
                                  ? 'bg-amber-600/90 hover:bg-amber-700 text-white' 
                                  : 'bg-emerald-600/90 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {foto.tipo === 'antes' ? '📸 Antes' : '✨ Depois'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      ) : (
        // --- LISTAGEM DE CLIENTES ---
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-6">
            <div>
              <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Clientes ({clientes.length})</h2>
              <p className="text-xs text-[#8C7A6B]">Gerencie fichas técnicas, alergias e a galeria de unhas de cada cliente</p>
            </div>

            <button
              onClick={handleOpenCriar}
              className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Nova Cliente</span>
            </button>
          </div>

          {/* Barra de Filtro */}
          <div className="bg-white border border-[#EFECE6] rounded-2xl px-3 py-2 flex items-center gap-2 mb-6 shadow-sm max-w-md">
            <Search size={16} className="text-[#C2B7AE]" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou técnica..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-[#5A4535] placeholder-[#C2B7AE] w-full focus:ring-0"
            />
          </div>

          {/* Grid de Cards dos Clientes */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-1 pb-6">
            {clientesFiltrados.length === 0 ? (
              <div className="col-span-full text-center py-12 text-[#8C7A6B]">
                <Users size={48} className="mx-auto text-[#E8DEC9] mb-3" />
                <h4 className="font-semibold text-sm">Nenhuma cliente encontrada</h4>
              </div>
            ) : (
              clientesFiltrados.map((c) => {
                const cliAgendamentos = agendamentos.filter(a => a.cliente_id === c.id && a.status === 'concluido');
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClienteIdForDetails(c.id)}
                    className="bg-white p-5 rounded-2xl border border-[#EFECE6] hover:border-[#8C6D58] cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-[#5A4535]">{c.nome}</h3>
                          <p className="text-[10px] text-[#8C7A6B] mt-0.5">{c.telefone}</p>
                        </div>
                        {c.preferencias?.tecnica && (
                          <span className="text-[9px] font-bold text-[#8C6D58] bg-[#F6ECE8] px-2 py-0.5 rounded-lg border border-[#F3ECE0]">
                            {c.preferencias.tecnica}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[#8C7A6B] border-t border-[#FAF9F6] pt-2.5">
                        <div>
                          <span>Formato:</span>
                          <span className="block font-semibold text-[#5A4535]">{c.preferencias?.formato || '-'}</span>
                        </div>
                        <div>
                          <span>Tamanho:</span>
                          <span className="block font-semibold text-[#5A4535]">{c.preferencias?.tamanho || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] border-t border-[#EFECE6] pt-3">
                      <span className="text-[#8C7A6B]">Visitas: <strong className="text-[#5A4535]">{cliAgendamentos.length}</strong></span>
                      <span className="text-[#8C6D58] font-bold flex items-center gap-0.5">
                        <span>Ficha Completa</span>
                        <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* --- MODAL NOVA/EDITAR CLIENTE --- */}
      {novoClienteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setNovoClienteModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#EFECE6] p-6 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#5A4535]">{clienteEdicao ? 'Editar Cliente' : 'Nova Cliente'}</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Cadastre uma cliente e suas preferências de esmaltação/técnica</p>
              </div>
              <button 
                onClick={() => setNovoClienteModal(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarCliente} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Amanda Santos"
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">WhatsApp</label>
                    <input 
                      type="text" 
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="Ex: (11) 99999-9999"
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Email (Opcional)</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: amanda@email.com"
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Aniversário (Opcional)</label>
                    <input 
                      type="date" 
                      value={aniversario}
                      onChange={(e) => setAniversario(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] bg-[#FAF9F6]"
                    />
                  </div>
                </div>

                {/* Ficha técnica */}
                <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#EFECE6] space-y-3">
                  <h4 className="font-serif font-bold text-xs text-[#5A4535] border-b border-[#EFECE6] pb-1.5">Ficha e Preferências de Unha</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Formato</label>
                      <select
                        value={formato}
                        onChange={(e) => setFormato(e.target.value)}
                        className="w-full border border-[#EFECE6] rounded-lg px-2 py-1.5 text-xs text-[#5A4535] bg-white focus:outline-none"
                      >
                        {formatos.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Tamanho</label>
                      <select
                        value={tamanho}
                        onChange={(e) => setTamanho(e.target.value)}
                        className="w-full border border-[#EFECE6] rounded-lg px-2 py-1.5 text-xs text-[#5A4535] bg-white focus:outline-none"
                      >
                        <option value="Curto">Curto</option>
                        <option value="Médio">Médio</option>
                        <option value="Longo">Longo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Técnica</label>
                      <select
                        value={tecnica}
                        onChange={(e) => setTecnica(e.target.value)}
                        className="w-full border border-[#EFECE6] rounded-lg px-2 py-1.5 text-xs text-[#5A4535] bg-white focus:outline-none"
                      >
                        {tecnicas.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Cores Preferidas</label>
                      <input 
                        type="text" 
                        value={cores}
                        onChange={(e) => setCores(e.target.value)}
                        placeholder="Ex: Tons pastéis, Vermelho..."
                        className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Estilo (Opcional)</label>
                      <input 
                        type="text" 
                        value={estilo}
                        onChange={(e) => setEstilo(e.target.value)}
                        placeholder="Ex: Minimalista / Delicado..."
                        className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Restrições / Alergias</label>
                  <input 
                    type="text" 
                    value={alergias}
                    onChange={(e) => setAlergias(e.target.value)}
                    placeholder="Ex: Alergia a esmaltes comuns contendo tolueno..."
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Observações Internas</label>
                  <textarea 
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Instruções específicas para o atendimento..."
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none bg-[#FAF9F6] resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] p-6 bg-white rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setNovoClienteModal(false)}
                  className="px-4 py-2.5 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA ESCOLHER ANTES OU DEPOIS DAS FOTOS SELECIONADAS */}
      {pendingUploads.length > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#EFECE6] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F0] text-[#8C6D58] flex items-center justify-center mx-auto shadow-inner">
              <Camera size={24} />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#5A4535]">
                {pendingUploads.length} {pendingUploads.length === 1 ? 'Foto Selecionada' : 'Fotos Selecionadas'}
              </h3>
              <p className="text-xs text-[#8C7A6B] mt-1">
                Como você deseja categorizar {pendingUploads.length === 1 ? 'esta foto' : 'estas fotos'} na ficha da cliente?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmPendingUpload('antes')}
                className="p-4 rounded-2xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex flex-col items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center">
                  <Camera size={16} />
                </div>
                <span>Fotos do Antes</span>
                <span className="text-[9px] font-normal text-amber-700">Estado inicial</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmPendingUpload('depois')}
                className="p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs flex flex-col items-center gap-1.5 transition-all shadow-xs active:scale-95"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <span>Fotos do Depois</span>
                <span className="text-[9px] font-normal text-emerald-700">Resultado final</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPendingUploads([])}
              className="text-xs text-[#8C7A6B] hover:text-[#5A4535] underline pt-1 block mx-auto transition-colors"
            >
              Cancelar e descartar seleção
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
