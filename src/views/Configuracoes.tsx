import React, { useState } from 'react';
import { 
  Settings, 
  Clock, 
  MessageSquare, 
  Users, 
  Save, 
  Check, 
  Crown,
  Instagram,
  MapPin,
  Mail,
  Phone,
  AlertTriangle,
  Plus,
  X,
  User as UserIcon,
  Globe,
  RefreshCw,
  Bookmark,
  Trash2
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { GoogleSyncModal } from '../components/GoogleSyncModal';

export const Configuracoes: React.FC = () => {
  const { 
    configSalao, 
    updateConfigSalao, 
    equipe, 
    addEquipe, 
    toggleEquipeAtivo,
    googleConnected,
    googleUserEmail,
    googleLastSync,
    desconectarGoogleAgenda
  } = useAppState();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'expediente' | 'mensagens' | 'equipe'>('geral');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);

  // Form Geral Fields
  const [nome, setNome] = useState(configSalao.nome);
  const [proprietaria, setProprietaria] = useState(configSalao.proprietaria);
  const [telefone, setTelefone] = useState(configSalao.telefone);
  const [email, setEmail] = useState(configSalao.email);
  const [endereco, setEndereco] = useState(configSalao.endereco);
  const [instagram, setInstagram] = useState(configSalao.instagram);
  const [chavePix, setChavePix] = useState(configSalao.chave_pix);
  const [instrucoesPix, setInstrucoesPix] = useState(configSalao.instrucoes_pix);
  const [cancelamentoLimite, setCancelamentoLimite] = useState(configSalao.regras.cancelamento_limite_horas);
  const [sinalObrigatorio, setSinalObrigatorio] = useState(configSalao.regras.sinal_obrigatorio_geral);

  // Expediente
  const [horarios, setHorarios] = useState(configSalao.horarios_trabalho);

  // Templates
  const [templateConfirmacao, setTemplateConfirmacao] = useState(configSalao.templates_whatsapp.confirmacao);
  const [templateLembrete, setTemplateLembrete] = useState(configSalao.templates_whatsapp.lembrete);
  const [templateManutencao, setTemplateManutencao] = useState(configSalao.templates_whatsapp.retorno_manutencao);

  // --- EQUIPE MODAL STATE ---
  const [isEquipeModalOpen, setIsEquipeModalOpen] = useState(false);
  const [novoMembroNome, setNovoMembroNome] = useState('');
  const [novoMembroFone, setNovoMembroFone] = useState('');
  const [novoMembroPerfil, setNovoMembroPerfil] = useState<'admin' | 'profissional'>('profissional');

  const handleSalvarGeral = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigSalao({
      nome,
      proprietaria,
      telefone,
      email,
      endereco,
      instagram,
      chave_pix: chavePix,
      instrucoes_pix: instrucoesPix,
      regras: {
        ...configSalao.regras,
        cancelamento_limite_horas: cancelamentoLimite,
        sinal_obrigatorio_geral: sinalObrigatorio
      }
    });
    triggerSuccess();
  };

  const handleSalvarExpediente = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigSalao({
      horarios_trabalho: horarios
    });
    triggerSuccess();
  };

  const handleSalvarMensagens = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigSalao({
      templates_whatsapp: {
        ...configSalao.templates_whatsapp,
        confirmacao: templateConfirmacao,
        lembrete: templateLembrete,
        retorno_manutencao: templateManutencao
      }
    });
    triggerSuccess();
  };

  const handleAdicionarMembro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMembroNome || !novoMembroFone) return;

    addEquipe({
      nome: novoMembroNome,
      telefone: novoMembroFone,
      email: novoMembroNome.toLowerCase().replace(/\s+/g, '') + '@agenda.com',
      perfil: novoMembroPerfil
    });

    setNovoMembroNome('');
    setNovoMembroFone('');
    setNovoMembroPerfil('profissional');
    setIsEquipeModalOpen(false);
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const diasSemanaNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col h-screen overflow-hidden pb-24 md:pb-0 bg-[#FAF9F6]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFECE6] pb-4 mb-6">
        <div>
          <h2 className="font-serif font-bold text-xl md:text-2xl text-[#5A4535]">Configurações do Salão</h2>
          <p className="text-xs text-[#8C7A6B]">Personalize expediente, chaves Pix, regras de sinal e mensagens automáticas</p>
        </div>
        
        {saveSuccess && (
          <div className="bg-[#EBF7EE] text-[#2B7A4B] border border-[#C2EAD0] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
            <Check size={16} />
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden pb-6">
        
        {/* Navigation Sidebar Tabs */}
        <div className="lg:w-64 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-[#EFECE6] pr-0 lg:pr-4 h-fit">
          {[
            { id: 'geral', label: 'Dados Gerais & Pix', icon: Settings },
            { id: 'expediente', label: 'Horários de Trabalho', icon: Clock },
            { id: 'mensagens', label: 'Mensagens WhatsApp', icon: MessageSquare },
            { id: 'equipe', label: 'Equipe & Permissões', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#8C6D58] text-white shadow-sm' 
                    : 'bg-white lg:bg-transparent border lg:border-none border-[#EFECE6] text-[#5A4535] hover:bg-white'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 bg-white rounded-2xl border border-[#EFECE6] p-6 shadow-sm overflow-y-auto">
          
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <>
              <form onSubmit={handleSalvarGeral} className="space-y-6">
                <h3 className="font-serif font-bold text-base text-[#5A4535] border-b border-[#FAF9F6] pb-2">Configurações Gerais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Nome Comercial do Salão</label>
                  <input 
                    type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Nome da Proprietária</label>
                  <input 
                    type="text" required value={proprietaria} onChange={(e) => setProprietaria(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Telefone WhatsApp</label>
                  <input 
                    type="text" required value={telefone} onChange={(e) => setTelefone(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">E-mail Comercial</label>
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Endereço Completo</label>
                  <input 
                    type="text" required value={endereco} onChange={(e) => setEndereco(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">Instagram Link/Nome</label>
                  <input 
                    type="text" required value={instagram} onChange={(e) => setInstagram(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6]"
                  />
                </div>
              </div>

              {/* Regras e Sinal Pix */}
              <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-[#EFECE6] space-y-4">
                <h4 className="font-serif font-bold text-xs text-[#5A4535] flex items-center gap-1">
                  <span>Regras de Sinal & Pix</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Chave Pix para Recebimento</label>
                    <input 
                      type="text" required value={chavePix} onChange={(e) => setChavePix(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Políticas / Horas limite para Cancelar</label>
                    <input 
                      type="number" required value={cancelamentoLimite} onChange={(e) => setCancelamentoLimite(Number(e.target.value))}
                      className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] bg-white"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase mb-1">Instruções de Pagamento Pix</label>
                    <textarea 
                      rows={2} value={instrucoesPix} onChange={(e) => setInstrucoesPix(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-lg px-2.5 py-1.5 text-xs text-[#5A4535] bg-white resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      type="checkbox" id="sinal_obr" checked={sinalObrigatorio} onChange={(e) => setSinalObrigatorio(e.target.checked)}
                      className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58]"
                    />
                    <label htmlFor="sinal_obr" className="text-xs text-[#5A4535] font-semibold cursor-pointer">
                      Exigir sinal de agendamento por padrão para novas clientes
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#EFECE6]">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Save size={14} />
                  <span>Salvar Dados Gerais</span>
                </button>
              </div>
            </form>

            {/* Seção de Integração com Google Agenda */}
            <div className="mt-8 pt-8 border-t border-[#EFECE6] space-y-4">
              <div className="flex items-center justify-between border-b border-[#FAF9F6] pb-2">
                <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-2">
                  <Globe size={18} className="text-[#8C6D58]" />
                  <span>Google Agenda (Sincronização)</span>
                </h3>
              </div>
              <p className="text-xs text-[#8C7A6B]">
                Sincronize sua agenda de compromissos e traga todos os dados de clientes para o aplicativo.
              </p>

              {!googleConnected ? (
                <div className="bg-[#FAF9F6] border border-[#EFECE6] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Desconectado
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#5A4535] mt-1">Conta: sheilaalicelara18@gmail.com</p>
                    <p className="text-[10px] text-[#8C7A6B]">Clique em conectar para trazer seus compromissos e clientes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGoogleSyncModalOpen(true)}
                    className="flex items-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                  >
                    <RefreshCw size={13} />
                    <span>Conectar e Sincronizar</span>
                  </button>
                </div>
              ) : (
                <div className="bg-[#EBF7EE] border border-[#C2EAD0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#2B7A4B] text-white border border-[#2B7A4B] text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        Conectado
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#2B7A4B] mt-1">Sincronizado com: {googleUserEmail}</p>
                    {googleLastSync && (
                      <p className="text-[10px] text-[#2B7A4B] opacity-80">Última sincronização: {googleLastSync}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsGoogleSyncModalOpen(true)}
                      className="flex items-center gap-1.5 bg-[#2B7A4B] hover:bg-[#205C38] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <RefreshCw size={13} />
                      <span>Sincronizar Eventos</span>
                    </button>
                    <button
                      type="button"
                      onClick={desconectarGoogleAgenda}
                      className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      <span>Desconectar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Developer credentials warning info */}
              <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1"><AlertTriangle size={12} /> Nota de Configuração de Produção</p>
                <p>Por padrão no protótipo, o login usa chaves de API virtuais e importa com sucesso os agendamentos da conta informada. Para vincular chaves oficiais do Google Cloud de produção do seu próprio negócio, acesse a documentação do Google API Console.</p>
              </div>
            </div>
          </>
        )}

          {/* TAB 2: EXPEDIENTE */}
          {activeTab === 'expediente' && (
            <form onSubmit={handleSalvarExpediente} className="space-y-6">
              <h3 className="font-serif font-bold text-base text-[#5A4535] border-b border-[#FAF9F6] pb-2">Horários de Funcionamento</h3>
              
              <div className="space-y-3">
                {Object.keys(horarios).map((dayKey) => {
                  const dayIdx = Number(dayKey);
                  const config = horarios[dayIdx];
                  return (
                    <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#EFECE6] rounded-xl gap-3 bg-[#FAF9F6]">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={config.ativo}
                          onChange={(e) => {
                            setHorarios(prev => ({
                              ...prev,
                              [dayIdx]: { ...config, ativo: e.target.checked }
                            }));
                          }}
                          className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                        />
                        <span className="text-xs font-bold text-[#5A4535] w-24">{diasSemanaNomes[dayIdx]}</span>
                      </div>

                      {config.ativo ? (
                        <div className="flex items-center gap-2 text-xs text-[#8C7A6B]">
                          <span>Início:</span>
                          <input 
                            type="time" 
                            value={config.inicio}
                            onChange={(e) => {
                              setHorarios(prev => ({
                                ...prev,
                                [dayIdx]: { ...config, inicio: e.target.value }
                              }));
                            }}
                            className="border border-[#EFECE6] rounded px-2 py-1 text-xs text-[#5A4535]"
                          />
                          <span className="ml-2">Fim:</span>
                          <input 
                            type="time" 
                            value={config.fim}
                            onChange={(e) => {
                              setHorarios(prev => ({
                                ...prev,
                                [dayIdx]: { ...config, fim: e.target.value }
                              }));
                            }}
                            className="border border-[#EFECE6] rounded px-2 py-1 text-xs text-[#5A4535]"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[#D37F64] uppercase text-[9px] bg-[#F6ECE8] px-2 py-1 rounded">
                          Fechado / Sem expediente
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-[#EFECE6]">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Save size={14} />
                  <span>Salvar Agenda</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MENSAGENS */}
          {activeTab === 'mensagens' && (
            <form onSubmit={handleSalvarMensagens} className="space-y-6">
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Templates de WhatsApp</h3>
                <p className="text-[11px] text-[#8C7A6B] mt-0.5">Use as tags chaves como `{'{cliente}'}`, `{'{servico}'}`, `{'{data}'}`, `{'{hora}'}` para preenchimento automático das mensagens.</p>
              </div>

              <div className="space-y-4">
                {/* Template Confirmação */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">
                    Confirmação de Agendamento (Sinal Pix)
                  </label>
                  <textarea 
                    rows={4} 
                    value={templateConfirmacao} 
                    onChange={(e) => setTemplateConfirmacao(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] resize-none"
                  />
                </div>

                {/* Template Lembrete */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">
                    Lembrete de Horário (24 horas antes)
                  </label>
                  <textarea 
                    rows={4} 
                    value={templateLembrete} 
                    onChange={(e) => setTemplateLembrete(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] resize-none"
                  />
                </div>

                {/* Template Retorno Manutenção */}
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] uppercase mb-1">
                    Aviso de Retorno / Manutenção Vencida
                  </label>
                  <textarea 
                    rows={4} 
                    value={templateManutencao} 
                    onChange={(e) => setTemplateManutencao(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-[#FAF9F6] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#EFECE6]">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Save size={14} />
                  <span>Salvar Mensagens</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: EQUIPE (FULLY UPDATED LIKE IMAGE 3) */}
          {activeTab === 'equipe' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-[#FAF9F6] pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#5A4535]">Usuários e permissões</h3>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">Gerencie os profissionais que utilizam o sistema</p>
                </div>
                <button
                  onClick={() => setIsEquipeModalOpen(true)}
                  className="flex items-center gap-1 bg-[#8C6D58] hover:bg-[#725743] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>Adicionar</span>
                </button>
              </div>

              {/* Lista de Membros da Equipe */}
              <div className="space-y-3">
                {equipe.map((membro) => {
                  const iniciais = membro.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  
                  return (
                    <div 
                      key={membro.id} 
                      className="p-4 border border-[#EFECE6] rounded-2xl flex items-center justify-between gap-3 bg-white hover:border-[#8C6D58] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F6ECE8] text-[#8C6D58] border border-[#F3ECE0] flex items-center justify-center font-bold text-xs">
                          {iniciais}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#5A4535] flex items-center gap-2">
                            <span>{membro.nome}</span>
                          </h4>
                          <p className="text-xs text-[#8C7A6B] mt-0.5">
                            {membro.perfil === 'admin' 
                              ? 'Administradora' 
                              : 'Profissional · Sem Acesso A Dados Financeiros Globais'}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch Ativo */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEquipeAtivo(membro.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            membro.ativo ? 'bg-[#8C6D58]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              membro.ativo ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-xs font-semibold text-[#8C7A6B]">
                          {membro.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODAL ADICIONAR PROFISSIONAL (LIKE IMAGE 4) --- */}
      {isEquipeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#EFECE6] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-5 border-b border-[#EFECE6] pb-3">
              <h3 className="font-serif font-bold text-base text-[#5A4535]">Adicionar profissional</h3>
              <button 
                onClick={() => setIsEquipeModalOpen(false)}
                className="p-1 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdicionarMembro} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Nome</label>
                <input 
                  type="text" required placeholder="Digite o nome..."
                  value={novoMembroNome} onChange={(e) => setNovoMembroNome(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Telefone</label>
                <input 
                  type="text" required placeholder="(35) 99999-9999"
                  value={novoMembroFone} onChange={(e) => setNovoMembroFone(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Perfil de acesso</label>
                <select
                  value={novoMembroPerfil}
                  onChange={(e) => setNovoMembroPerfil(e.target.value as 'admin' | 'profissional')}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-white focus:outline-none focus:border-[#8C6D58]"
                >
                  <option value="profissional">Profissional da equipe</option>
                  <option value="admin">Administradora</option>
                </select>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] mt-6">
                <button
                  type="button"
                  onClick={() => setIsEquipeModalOpen(false)}
                  className="px-4 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGoogleSyncModalOpen && (
        <GoogleSyncModal onClose={() => setIsGoogleSyncModalOpen(false)} />
      )}
    </div>
  );
};
