import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Cliente } from '../types';

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
    obterServicosDeAgendamento,
    configSalao
  } = useAppState();

  const [busca, setBusca] = useState('');
  const [novoClienteModal, setNovoClienteModal] = useState(false);
  
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
  
  // Fotos Mock
  const [fotosMock, setFotosMock] = useState<{ [clienteId: string]: string[] }>({
    'c1': ['https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400', 'https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=400'],
    'c2': ['https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400'],
    'c4': ['https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400']
  });

  const formatarMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSalvarCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone) return;

    addCliente({
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
    });

    // Reset
    setNome('');
    setTelefone('');
    setEmail('');
    setAniversario('');
    setObservacoes('');
    setAlergias('');
    setNovoClienteModal(false);
  };

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.telefone.includes(busca) ||
    c.preferencias?.tecnica?.toLowerCase().includes(busca.toLowerCase())
  );

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

  // Simular upload de foto
  const handleSimulatePhotoUpload = () => {
    if (!selectedClienteIdForDetails) return;
    
    // Lista de imagens mock de nail art
    const mockImages = [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
      'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400',
      'https://images.unsplash.com/photo-1632345031435-8797b2d58045?w=400',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400'
    ];
    
    const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
    
    setFotosMock(prev => ({
      ...prev,
      [selectedClienteIdForDetails]: [...(prev[selectedClienteIdForDetails] || []), randomImg]
    }));
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {clienteSelecionado ? (
        // --- TELA DETALHADA DA CLIENTE ---
        <div className="flex-1 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header de Detalhes */}
          <div className="flex items-center justify-between border-b border-[#EFECE6] pb-4 mb-4 gap-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedClienteIdForDetails(null)}
                className="p-1.5 border border-[#EFECE6] rounded-xl hover:bg-white text-[#8C7A6B] transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="font-serif font-bold text-lg md:text-xl text-[#5A4535]">{clienteSelecionado.nome}</h2>
                <p className="text-xs text-[#8C7A6B]">Visualizando ficha da cliente</p>
              </div>
            </div>
            
            <button
              onClick={() => handleEnviarMensagemWhatsApp(clienteSelecionado, 'geral')}
              className="flex items-center gap-1.5 bg-[#4FA97A] hover:bg-[#419266] text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <MessageCircle size={14} />
              <span>Chamar no Whats</span>
            </button>
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
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.formato || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6B] block">Tamanho:</span>
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.tamanho || 'Não informado'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#8C7A6B] block">Técnica Preferida:</span>
                    <span className="font-bold text-[#5A4535]">{clienteSelecionado.preferencias?.tecnica || 'Não informada'}</span>
                  </div>
                  {clienteSelecionado.preferencias?.cores && (
                    <div className="col-span-2">
                      <span className="text-[#8C7A6B] block">Cores Mais Usadas:</span>
                      <span className="font-semibold text-[#5A4535]">{clienteSelecionado.preferencias.cores}</span>
                    </div>
                  )}
                  {clienteSelecionado.preferencias?.estilo && (
                    <div className="col-span-2">
                      <span className="text-[#8C7A6B] block">Estilo:</span>
                      <span className="font-semibold text-[#5A4535]">{clienteSelecionado.preferencias.estilo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Central: Histórico / Linha do tempo */}
            <div className="space-y-6 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              
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
              <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-[#EFECE6] pb-2">
                  <h3 className="font-serif font-bold text-sm text-[#5A4535]">
                    Fotos de Acompanhamento
                  </h3>
                  <button
                    onClick={handleSimulatePhotoUpload}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#8C6D58] bg-[#F6ECE8] hover:bg-[#ebdace] px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Camera size={12} />
                    <span>Adicionar Foto</span>
                  </button>
                </div>

                {!(fotosMock[clienteSelecionado.id]?.length > 0) ? (
                  <div className="text-center py-8 text-[#8C7A6B]">
                    <Camera size={36} className="mx-auto text-[#E8DEC9] mb-2" />
                    <p className="text-xs">Nenhuma foto adicionada ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {fotosMock[clienteSelecionado.id].map((url, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-[#EFECE6] aspect-square relative bg-[#FAF9F6]">
                        <img 
                          src={url} 
                          alt={`Foto unhas ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-1 right-1 bg-black bg-opacity-65 text-white text-[8px] px-1 rounded">
                          {idx === 0 ? 'Antes' : 'Depois'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      ) : (
        // --- LISTA DE CLIENTES ---
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-4">
            <div>
              <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Base de Clientes</h2>
              <p className="text-xs text-[#8C7A6B]">Visualize preferências, linha do tempo e envie lembretes</p>
            </div>
            <button
              onClick={() => setNovoClienteModal(true)}
              className="flex items-center justify-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Nova Cliente</span>
            </button>
          </div>

          {/* Caixa de Busca */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#EFECE6] rounded-2xl mb-4 max-w-md shadow-sm">
            <Search size={16} className="text-[#8C7A6B]" />
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

      {/* --- MODAL NOVA CLIENTE --- */}
      {novoClienteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#EFECE6] my-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4 border-b border-[#EFECE6] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#5A4535]">Nova Cliente</h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Cadastre uma cliente e suas preferências de esmaltação/técnica</p>
              </div>
              <button 
                onClick={() => setNovoClienteModal(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarCliente} className="space-y-4">
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
                      <option value="Quadrada">Quadrada</option>
                      <option value="Amendoada">Amendoada</option>
                      <option value="Oval">Oval</option>
                      <option value="Stiletto">Stiletto</option>
                      <option value="Redonda">Redonda</option>
                      <option value="Bailarina">Bailarina</option>
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
                      <option value="Gel">Gel</option>
                      <option value="Fibra de Vidro">Fibra de Vidro</option>
                      <option value="Banho de Gel">Banho de Gel</option>
                      <option value="Blindagem">Blindagem</option>
                      <option value="Esmaltação em Gel">Esmaltação em Gel</option>
                      <option value="Mão Simples">Mão Simples</option>
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

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
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
    </div>
  );
};
