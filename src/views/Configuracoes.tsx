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
  Trash2,
  Key,
  Lock,
  Shield,
  Bot,
  Send,
  Smartphone,
  Copy,
  Sparkles,
  Cloud,
  UploadCloud,
  ExternalLink,
  Calendar,
  Edit2,
  Eye,
  EyeOff,
  Info,
  ShieldCheck
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { GoogleSyncModal } from '../components/GoogleSyncModal';
import { Usuario } from '../types';
import { 
  obterConfigMetaWhatsApp, 
  salvarConfigMetaWhatsApp, 
  enviarMensagemBotaoMeta 
} from '../services/metaWhatsApp';
import { 
  obterLicencaAtual, 
  revogarLicenca, 
  ativarChaveLicenca, 
  LicencaInfo 
} from '../services/licencaService';
import { salvarConfiguracoesSupabase } from '../services/supabase';

export const Configuracoes: React.FC = () => {
  const { 
    configSalao, 
    updateConfigSalao, 
    servicos,
    equipe, 
    addEquipe, 
    updateEquipe,
    deleteEquipe,
    toggleEquipeAtivo,
    googleConnected,
    googleUserEmail,
    googleLastSync,
    desconectarGoogleAgenda,
    limparAgendamentosSimuladosGoogle,
    isSyncingCloud,
    lastCloudSyncTime,
    sincronizarComNuvem,
    enviarDadosParaNuvem,
    mostrarAlerta,
    confirmarAcao
  } = useAppState();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'expediente' | 'mensagens' | 'equipe' | 'meta_whatsapp' | 'licenca'>('geral');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Estados de feedback de salvamento na nuvem
  const [salvandoExpediente, setSalvandoExpediente] = useState(false);
  const [expedienteSalvoSucesso, setExpedienteSalvoSucesso] = useState(false);
  const [toastNotificacao, setToastNotificacao] = useState<{ mensagem: string; tipo: 'sucesso' | 'info' | 'erro' } | null>(null);

  const exibirToast = (mensagem: string, tipo: 'sucesso' | 'info' | 'erro' = 'sucesso') => {
    setToastNotificacao({ mensagem, tipo });
    setTimeout(() => setToastNotificacao(null), 4000);
  };

  // --- LICENÇA & ASSINATURA STATE ---
  const [licencaAtual, setLicencaAtual] = useState<LicencaInfo | null>(() => obterLicencaAtual());
  const [novaChaveInput, setNovaChaveInput] = useState('');
  const [licencaFeedback, setLicencaFeedback] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  const handleAtualizarLicenca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaChaveInput.trim()) return;
    const res = await ativarChaveLicenca(novaChaveInput, configSalao.nome);
    setLicencaFeedback(res);
    if (res.sucesso && res.licenca) {
      setLicencaAtual(res.licenca);
      setNovaChaveInput('');
      triggerSuccess();
    }
  };

  const handleRevogarLicenca = () => {
    confirmarAcao({
      titulo: 'Desativar Licença',
      mensagem: 'Tem certeza que deseja desativar a licença deste aparelho? O aplicativo será bloqueado até que uma nova chave seja inserida.',
      tipo: 'erro',
      textoConfirmar: 'Desativar',
      textoCancelar: 'Cancelar',
      onConfirm: () => {
        revogarLicenca();
        setLicencaAtual(null);
        window.location.reload();
      }
    });
  };

  const handleCopiarLink = () => {
    const url = 'https://sheilasantos-agenda.netlify.app';
    navigator.clipboard.writeText(url).then(() => {
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2500);
      mostrarAlerta({
        titulo: 'Link Copiado com Sucesso!',
        mensagem: 'O link de agendamento online exclusivo do seu salão foi copiado!\n\nEle está pronto para você colar no WhatsApp das suas clientes ou colocar na Bio do Instagram.',
        link: url,
        tipo: 'sucesso',
        textoBotao: 'Excelente, entendido!'
      });
    }).catch(() => {
      mostrarAlerta({
        titulo: 'Link de Agendamento Online',
        mensagem: 'Copie o link exclusivo do salão abaixo para enviar às suas clientes ou colocar na Bio do Instagram:',
        link: url,
        tipo: 'info',
        textoBotao: 'Fechar'
      });
    });
  };

  const handleVerLinkAgendamento = () => {
    window.location.hash = 'agendar';
  };

  const handleLimparCache = async () => {
    confirmarAcao({
      titulo: 'Limpar Cache do App',
      mensagem: 'Deseja limpar os arquivos temporários de cache e recarregar a versão mais recente da nuvem?\n\n(Seus clientes, serviços e agendamentos no banco Supabase NÃO serão perdidos!)',
      tipo: 'aviso',
      textoConfirmar: 'Limpar e Recarregar',
      textoCancelar: 'Cancelar',
      onConfirm: async () => {
        try {
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
          }
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.unregister();
            }
          }
        } catch (e) {
          console.error('Erro ao limpar caches:', e);
        }
        window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
      }
    });
  };

  const handleSincronizarNuvem = async () => {
    const res = await sincronizarComNuvem(true);
    setSyncFeedback(res.sucesso ? 'Sincronizado!' : 'Erro');
    setTimeout(() => setSyncFeedback(null), 3000);
    mostrarAlerta({
      titulo: res.sucesso ? 'Sincronização Concluída' : 'Erro de Sincronização',
      mensagem: res.mensagem,
      tipo: res.sucesso ? 'sucesso' : 'erro'
    });
  };

  const handleEnviarDadosNuvem = async () => {
    confirmarAcao({
      titulo: 'Enviar Dados para a Nuvem',
      mensagem: 'Deseja enviar todos os clientes, agendamentos e serviços deste aparelho para o banco de dados na nuvem?',
      tipo: 'aviso',
      textoConfirmar: 'Enviar Agora',
      textoCancelar: 'Cancelar',
      onConfirm: async () => {
        const res = await enviarDadosParaNuvem();
        mostrarAlerta({
          titulo: res.sucesso ? 'Upload Concluído' : 'Aviso',
          mensagem: res.mensagem,
          tipo: res.sucesso ? 'sucesso' : 'erro'
        });
      }
    });
  };

  // --- META WHATSAPP CONFIG STATE ---
  const [metaConfig, setMetaConfig] = useState(obterConfigMetaWhatsApp());
  const [metaPhoneId, setMetaPhoneId] = useState(metaConfig.phoneNumberId === 'admin' ? '' : metaConfig.phoneNumberId);
  const [metaToken, setMetaToken] = useState(metaConfig.phoneNumberId === 'admin' ? '' : metaConfig.accessToken);
  const [showMetaToken, setShowMetaToken] = useState(false);
  const [metaAtivo, setMetaAtivo] = useState(metaConfig.ativo);
  const [metaNumeroTeste, setMetaNumeroTeste] = useState(configSalao.telefone || '');
  const [metaTestando, setMetaTestando] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ sucesso: boolean; mensagem: string } | null>(null);

  const handleSalvarMetaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const novaConfig = {
      phoneNumberId: metaPhoneId.trim(),
      accessToken: metaToken.trim(),
      ativo: metaAtivo
    };
    salvarConfigMetaWhatsApp(novaConfig);
    setMetaConfig(novaConfig);
    triggerSuccess();
  };

  const handleTestarEnvioMeta = async () => {
    if (!metaNumeroTeste.trim()) {
      mostrarAlerta({
        titulo: 'Telefone Obrigatório',
        mensagem: 'Por favor, informe o número de WhatsApp com DDD para realizar o teste de envio.',
        tipo: 'aviso'
      });
      return;
    }
    setMetaTestando(true);
    setMetaTestResult(null);

    const resultado = await enviarMensagemBotaoMeta({
      destinatario: metaNumeroTeste,
      headerText: '✨ Agendamento Sheila Santos',
      textoCorpo: 'Olá! Este é um teste oficial do robô de agendamentos com botões clicáveis.\n\nPor favor, toque em um dos botões abaixo para simular sua confirmação:',
      botoes: [
        { id: 'btn_teste_confirmar', title: '✅ Confirmar Horário' },
        { id: 'btn_teste_cancelar', title: '❌ Cancelar / Remarcar' }
      ]
    });

    setMetaTestando(false);
    setMetaTestResult(resultado);
  };

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
  const [novoMembroSenha, setNovoMembroSenha] = useState('');
  const [novoMembroPerfil, setNovoMembroPerfil] = useState<'admin' | 'profissional'>('profissional');
  const [novoMembroServicos, setNovoMembroServicos] = useState<string[]>([]);

  // --- ALTERAR SENHA MODAL STATE ---
  const [isAlterarSenhaModalOpen, setIsAlterarSenhaModalOpen] = useState(false);
  const [membroParaAlterarSenha, setMembroParaAlterarSenha] = useState<Usuario | null>(null);
  const [novaSenhaInput, setNovaSenhaInput] = useState('');

  // --- EDITAR DADOS & SERVIÇOS DO MEMBRO ---
  const [isEditarMembroModalOpen, setIsEditarMembroModalOpen] = useState(false);
  const [membroEditando, setMembroEditando] = useState<Usuario | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editFone, setEditFone] = useState('');
  const [editPerfil, setEditPerfil] = useState<'admin' | 'profissional'>('profissional');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editServicosHabilitados, setEditServicosHabilitados] = useState<string[]>([]);

  const formatarMoedaLocal = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const handleAbrirEditarMembro = (membro: Usuario) => {
    setMembroEditando(membro);
    setEditNome(membro.nome);
    setEditFone(membro.telefone || '');
    setEditPerfil(membro.perfil);
    setEditAtivo(membro.ativo);
    setEditServicosHabilitados(membro.servicos_habilitados || []);
    setIsEditarMembroModalOpen(true);
  };

  const handleSalvarEdicaoMembro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membroEditando || !editNome.trim()) return;

    updateEquipe(membroEditando.id, {
      nome: editNome.trim(),
      telefone: editFone.trim(),
      perfil: editPerfil,
      ativo: editAtivo,
      servicos_habilitados: editServicosHabilitados
    });

    setIsEditarMembroModalOpen(false);
    setMembroEditando(null);
    exibirToast(`✅ Dados e serviços da profissional ${editNome} salvos e sincronizados com a nuvem!`);
    triggerSuccess();
  };

  const handleSalvarGeral = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
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
    };
    updateConfigSalao(updated);
    try {
      await salvarConfiguracoesSupabase({ configSalao: { ...configSalao, ...updated } });
      exibirToast('✅ Dados do salão e chave Pix salvos e sincronizados com a nuvem!');
    } catch (e) {
      exibirToast('⚠️ Dados salvos localmente!');
    }
    triggerSuccess();
  };

  const handleSalvarExpediente = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoExpediente(true);
    updateConfigSalao({
      horarios_trabalho: horarios
    });
    try {
      await salvarConfiguracoesSupabase({
        configSalao: {
          ...configSalao,
          horarios_trabalho: horarios
        }
      });
      setExpedienteSalvoSucesso(true);
      exibirToast('✅ Horários de funcionamento salvos e sincronizados com a nuvem!');
      setTimeout(() => setExpedienteSalvoSucesso(false), 3000);
    } catch (err) {
      exibirToast('⚠️ Horários salvos localmente!');
    } finally {
      setSalvandoExpediente(false);
      triggerSuccess();
    }
  };

  const handleSalvarMensagens = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTemplates = {
      ...configSalao.templates_whatsapp,
      confirmacao: templateConfirmacao,
      lembrete: templateLembrete,
      retorno_manutencao: templateManutencao
    };
    updateConfigSalao({
      templates_whatsapp: updatedTemplates
    });
    try {
      await salvarConfiguracoesSupabase({
        configSalao: {
          ...configSalao,
          templates_whatsapp: updatedTemplates
        }
      });
      exibirToast('✅ Mensagens do WhatsApp salvas e sincronizadas com a nuvem!');
    } catch (e) {
      exibirToast('⚠️ Mensagens salvas localmente!');
    }
    triggerSuccess();
  };

  const handleAdicionarMembro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMembroNome || !novoMembroFone) return;

    addEquipe({
      nome: novoMembroNome,
      telefone: novoMembroFone,
      email: novoMembroNome.toLowerCase().replace(/\s+/g, '') + '@agenda.com',
      perfil: novoMembroPerfil,
      senha: novoMembroSenha.trim() || (novoMembroPerfil === 'admin' ? 'admin' : '1234'),
      servicos_habilitados: novoMembroServicos
    });

    setNovoMembroNome('');
    setNovoMembroFone('');
    setNovoMembroSenha('');
    setNovoMembroPerfil('profissional');
    setNovoMembroServicos([]);
    setIsEquipeModalOpen(false);
    exibirToast(`✅ Profissional ${novoMembroNome} cadastrada e sincronizada com a nuvem!`);
    triggerSuccess();
  };

  const handleSalvarNovaSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!membroParaAlterarSenha || !novaSenhaInput.trim()) return;

    updateEquipe(membroParaAlterarSenha.id, {
      senha: novaSenhaInput.trim()
    });

    setIsAlterarSenhaModalOpen(false);
    setMembroParaAlterarSenha(null);
    setNovaSenhaInput('');
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
            { id: 'equipe', label: 'Equipe & Permissões', icon: Users },
            { id: 'meta_whatsapp', label: 'Robô WhatsApp Meta', icon: Bot },
            { id: 'licenca', label: 'Licença & Assinatura', icon: Key }
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
            <div className="space-y-6">
              {/* CARD DE LINKS DO SALÃO & SINCRONIZAÇÃO EM NUVEM (MOVIDO DO MENU LATERAL) */}
              <div className="bg-gradient-to-r from-[#FAF8F5] to-[#F5ECE5] border border-[#E8DEC9] rounded-2xl p-5 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8DEC9]/60 pb-3">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#5A4535] flex items-center gap-2">
                      <Cloud size={16} className="text-[#8C6D58]" />
                      <span>Links Oficiais do Salão & Sincronização em Nuvem</span>
                    </h4>
                    <p className="text-xs text-[#8C7A6B] mt-0.5">
                      {lastCloudSyncTime ? `Última sincronização com Supabase: hoje às ${lastCloudSyncTime}` : 'Conexão em tempo real com o banco de dados Supabase'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit shrink-0">
                    ● Nuvem Conectada
                  </span>
                </div>

                {/* Os 3 botões movidos do menu lateral */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* 1. Sincronizar com a Nuvem */}
                  <button
                    type="button"
                    onClick={handleSincronizarNuvem}
                    disabled={isSyncingCloud}
                    className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E5D5C5] hover:border-[#8C6D58] rounded-xl text-xs font-bold text-[#5A4535] hover:text-[#8C6D58] transition-all shadow-xs active:scale-98"
                    title="Baixar clientes e agendamentos atualizados da nuvem"
                  >
                    <RefreshCw size={14} className={`text-[#8C6D58] ${isSyncingCloud ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCloud ? 'Sincronizando...' : syncFeedback || 'Sincronizar com a Nuvem'}</span>
                  </button>

                  {/* 2. Copiar Link para Clientes */}
                  <button
                    type="button"
                    onClick={handleCopiarLink}
                    className="flex items-center justify-center gap-2 p-3 bg-[#F4EBE1] border border-[#E5D5C5] hover:bg-[#EBDDCF] rounded-xl text-xs font-bold text-[#6D4C3D] transition-all shadow-xs active:scale-98"
                    title="Copiar o link oficial para colar no WhatsApp das clientes ou Instagram"
                  >
                    {copiadoLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span>{copiadoLink ? 'Link Copiado!' : 'Copiar Link p/ Clientes'}</span>
                  </button>

                  {/* 3. Ver Página de Agendamento */}
                  <button
                    type="button"
                    onClick={handleVerLinkAgendamento}
                    className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E5D5C5] hover:border-[#8C6D58] rounded-xl text-xs font-semibold text-[#8C6D58] hover:bg-[#FAF9F6] transition-colors shadow-xs"
                    title="Abrir a página pública que as suas clientes acessam"
                  >
                    <ExternalLink size={14} />
                    <span>Ver Página de Agendamento</span>
                  </button>
                </div>

                {/* Opção Adicional: Enviar Dados deste Computador para a Nuvem e Limpar Cache */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E8DEC9]/40">
                  <span className="text-[11px] text-[#8C7A6B]">
                    Sincronização & Manutenção deste aparelho:
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleEnviarDadosNuvem}
                      disabled={isSyncingCloud}
                      className="text-xs font-bold text-[#8C6D58] hover:text-[#5A4535] underline underline-offset-4 flex items-center gap-1.5 transition-colors"
                    >
                      <UploadCloud size={14} />
                      <span>Enviar Dados para a Nuvem</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLimparCache}
                      className="text-xs font-bold text-red-600 hover:text-red-700 underline underline-offset-4 flex items-center gap-1.5 transition-colors"
                      title="Apaga arquivos temporários e recarrega a versão mais nova do app"
                    >
                      <RefreshCw size={12} />
                      <span>Limpar Cache & Recarregar</span>
                    </button>
                  </div>
                </div>
              </div>

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
                      type="number" required 
                      value={cancelamentoLimite === 0 ? '' : cancelamentoLimite} onChange={(e) => setCancelamentoLimite(Number(e.target.value))}
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

              {/* Modo de Produção Oficial & Ferramenta de Limpeza */}
              <div className="p-3.5 bg-[#F4F9F5] border border-[#D5EBD9] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#2A5C38]">
                <div className="space-y-0.5">
                  <span className="font-bold flex items-center gap-1 text-[#205C38]">
                    <ShieldCheck size={14} className="text-[#2B7A4B]" />
                    Modo de Produção Oficial Ativado
                  </span>
                  <p className="text-[11px] text-[#4A7855] leading-relaxed">
                    Sincronização direta com a Google Calendar API oficial ou por arquivo .ics sem dados simulados ou duplicados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    confirmarAcao({
                      titulo: 'Limpar Testes',
                      mensagem: 'Deseja remover da agenda todos os compromissos antigos gerados pelo teste de simulação?',
                      tipo: 'aviso',
                      textoConfirmar: 'Remover Testes',
                      onConfirm: () => {
                        limparAgendamentosSimuladosGoogle();
                        exibirToast('🧹 Agendamentos antigos de simulação removidos!');
                      }
                    });
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs"
                >
                  <Trash2 size={13} />
                  <span>Limpar Testes Antigos</span>
                </button>
              </div>
            </div>
          </div>
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

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#EFECE6]">
                <div className="text-xs">
                  {expedienteSalvoSucesso ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <Check size={14} /> Horários salvos e sincronizados na nuvem!
                    </span>
                  ) : salvandoExpediente ? (
                    <span className="text-amber-600 font-medium flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                      <Cloud size={14} className="animate-spin" /> Conectando ao banco de dados...
                    </span>
                  ) : (
                    <span className="text-[#8C7A6B] text-[11px]">
                      Os horários configurados atualizam a disponibilidade online automaticamente.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={salvandoExpediente}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-300 ${
                    expedienteSalvoSucesso
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20 scale-105'
                      : 'bg-[#8C6D58] hover:bg-[#725743] text-white'
                  }`}
                >
                  {salvandoExpediente ? (
                    <>
                      <Cloud size={15} className="animate-spin" />
                      <span>Salvando na Nuvem...</span>
                    </>
                  ) : expedienteSalvoSucesso ? (
                    <>
                      <Check size={15} />
                      <span>Salvo com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Salvar Horários de Trabalho</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: MENSAGENS */}
          {activeTab === 'mensagens' && (
            <form onSubmit={handleSalvarMensagens} className="space-y-6">
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535]">Templates de WhatsApp</h3>
                <p className="text-[11px] text-[#8C7A6B] mt-0.5">
                  Tags dinâmicas suportadas: <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#EFECE6] text-[#8C6D58]">{'{cliente}'}</code>, <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#EFECE6] text-[#8C6D58]">{'{servico}'}</code>, <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#EFECE6] text-[#8C6D58]">{'{data}'}</code>, <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#EFECE6] text-[#8C6D58]">{'{hora}'}</code>, <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#EFECE6] text-[#8C6D58]">{'{link_confirmacao}'}</code>.
                  <span className="block text-[10px] text-emerald-700 font-semibold mt-1">
                    ✨ O link público de confirmação em 1 toque é incluído automaticamente nas mensagens de confirmação e lembrete!
                  </span>
                </p>
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
                      className="p-4 border border-[#EFECE6] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:border-[#8C6D58] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F6ECE8] text-[#8C6D58] border border-[#F3ECE0] flex items-center justify-center font-bold text-xs shrink-0">
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
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {membro.telefone && (
                              <span className="text-[10px] text-[#8C7A6B] bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#EFECE6]">
                                📱 {membro.telefone}
                              </span>
                            )}
                            {(!membro.servicos_habilitados || membro.servicos_habilitados.length === 0) ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                ✨ Realiza todos os serviços
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#8C6D58] bg-[#F6ECE8] px-2 py-0.5 rounded-md border border-[#EFECE6]">
                                💅 {membro.servicos_habilitados.length} serviço{membro.servicos_habilitados.length > 1 ? 's' : ''} habilitado{membro.servicos_habilitados.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações: Editar + Alterar Senha + Toggle Ativo */}
                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditarMembro(membro)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                        >
                          <Edit2 size={13} />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setMembroParaAlterarSenha(membro);
                            setNovaSenhaInput(membro.senha || '');
                            setIsAlterarSenhaModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] border border-[#EFECE6] hover:border-[#8C6D58] text-[#8C6D58] rounded-xl text-xs font-bold transition-colors"
                        >
                          <Key size={13} />
                          <span>Alterar Senha</span>
                        </button>

                        <div className="flex items-center gap-2 pl-2 border-l border-[#EFECE6]">
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

                        {equipe.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              confirmarAcao({
                                titulo: 'Remover Usuário',
                                mensagem: `Deseja realmente remover o usuário ${membro.nome}?`,
                                tipo: 'erro',
                                textoConfirmar: 'Remover',
                                onConfirm: () => deleteEquipe(membro.id)
                              });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-1"
                            title="Remover usuário"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB META WHATSAPP CLOUD API OFICIAL */}
          {activeTab === 'meta_whatsapp' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-[#FAF9F6] pb-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-2">
                    <Bot size={18} className="text-[#8C6D58]" />
                    <span>Robô Oficial WhatsApp da Meta (Cloud API)</span>
                  </h3>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">
                    Envie lembretes e confirmações com botões clicáveis oficiais e 1.000 conversas gratuitas por mês.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    metaConfig.ativo && metaConfig.phoneNumberId && metaConfig.accessToken
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {metaConfig.ativo && metaConfig.phoneNumberId && metaConfig.accessToken
                      ? '● Meta API Ativa'
                      : '○ Em Configuração'}
                  </span>
                </div>
              </div>

              {/* Banner de Destaque Oficial */}
              <div className="bg-gradient-to-r from-[#FAF8F5] to-[#F5ECE5] border border-[#E8DEC9] rounded-2xl p-4.5 space-y-3">
                <h4 className="font-bold text-xs text-[#5A4535] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#8C6D58]" />
                  <span>Vantagens do Padrão Oficial Meta para seu Salão e Comercialização:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[11px] text-[#6D4C3D]">
                  <div className="bg-white/80 p-3 rounded-xl border border-[#EFECE6]">
                    <span className="font-bold block text-[#5A4535] mb-0.5">🎁 1.000 msgs/mês Grátis</span>
                    A Meta oferece franquia gratuita renovada todo mês para cada salão.
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-[#EFECE6]">
                    <span className="font-bold block text-[#5A4535] mb-0.5">🔘 Botões Clicáveis</span>
                    A cliente recebe os botões <strong>[Confirmar]</strong> e <strong>[Cancelar]</strong> na tela.
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-[#EFECE6]">
                    <span className="font-bold block text-[#5A4535] mb-0.5">☁️ 24h na Nuvem</span>
                    Funciona mesmo com o computador e celular desligados.
                  </div>
                </div>
              </div>

              {/* Formulário de Configuração de Credenciais */}
              <form onSubmit={handleSalvarMetaConfig} className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="font-bold text-xs text-[#5A4535] uppercase tracking-wider">
                  Credenciais da Meta (Meta for Developers)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">
                      Phone Number ID (ID do Número de Telefone)
                    </label>
                    <input 
                      type="text" 
                      name="meta_whatsapp_phone_number_id_input"
                      autoComplete="off"
                      placeholder="Ex: 104829104810294"
                      value={metaPhoneId} 
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl px-3.5 py-2.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] font-mono"
                    />
                    <p className="text-[10px] text-[#A19488] mt-1">
                      Encontrado no painel da Meta em WhatsApp &gt; Configuração da API (apenas números).
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-[#8C7A6B]">
                        Token de Acesso (Access Token)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMetaToken(!showMetaToken)}
                        className="text-[10px] text-[#8C6D58] hover:underline flex items-center gap-1 font-semibold"
                      >
                        {showMetaToken ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showMetaToken ? 'Ocultar' : 'Visualizar'}</span>
                      </button>
                    </div>
                    <input 
                      type={showMetaToken ? 'text' : 'password'}
                      name="meta_whatsapp_access_token_input"
                      autoComplete="new-password"
                      placeholder="Cole aqui seu Token permanente ou temporário (inicia com EAA...)"
                      value={metaToken} 
                      onChange={(e) => setMetaToken(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl px-3.5 py-2.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] font-mono"
                    />
                    <p className="text-[10px] text-[#A19488] mt-1">
                      Token gerado na aba de desenvolvedor da Meta.
                    </p>
                  </div>
                </div>

                {/* Nota Esclarecedora sobre o WhatsApp Business Account ID */}
                <div className="bg-[#FFF9FB] border border-[#FAD0DC] p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#5A4535]">
                  <Info size={15} className="text-[#DB7093] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#C71585] text-xs block">
                      Não achou o campo "WhatsApp Business Account ID"?
                    </span>
                    <p className="text-[11px] text-[#8C7A6B] leading-relaxed">
                      Não se preocupe! O seu aplicativo <strong>não precisa do Business Account ID</strong>. Para enviar mensagens oficiais e interativas pela API da Meta, o sistema utiliza <strong>exclusivamente o Phone Number ID e o Token de Acesso</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#FAF9F6]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMetaAtivo(!metaAtivo)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        metaAtivo ? 'bg-[#8C6D58]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          metaAtivo ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold text-[#5A4535]">
                      Ativar Envio Automático com Botões Clicáveis
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                  >
                    <Save size={14} />
                    <span>Salvar Credenciais da Meta</span>
                  </button>
                </div>
              </form>

              {/* Área de Teste de Envio */}
              <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-xs space-y-4">
                <h4 className="font-bold text-xs text-[#5A4535] uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={14} className="text-[#8C6D58]" />
                  <span>Testar Envio de Mensagem com Botões Clicáveis</span>
                </h4>
                <p className="text-xs text-[#8C7A6B]">
                  Envie uma mensagem de teste para o seu próprio WhatsApp para ver como a sua cliente vai receber os botões na tela!
                </p>

                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">
                      Número do WhatsApp com DDD (apenas números)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: 35997141856"
                      value={metaNumeroTeste} 
                      onChange={(e) => setMetaNumeroTeste(e.target.value)}
                      className="w-full border border-[#EFECE6] rounded-xl px-3.5 py-2.5 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestarEnvioMeta}
                    disabled={metaTestando}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-98"
                  >
                    <Send size={13} className={metaTestando ? 'animate-spin' : ''} />
                    <span>{metaTestando ? 'Disparando...' : 'Enviar Teste com Botões'}</span>
                  </button>
                </div>

                {metaTestResult && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                    metaTestResult.sucesso 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {metaTestResult.sucesso ? <Check size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-bold">{metaTestResult.sucesso ? 'Sucesso!' : 'Atenção'}</p>
                      <p className="mt-0.5">{metaTestResult.mensagem}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Webhook para Receber Cliques das Clientes */}
              <div className="bg-white border border-[#EFECE6] rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-[#5A4535] uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={14} className="text-[#8C6D58]" />
                  <span>Configuração do Webhook na Meta (Recebimento Automático de Respostas)</span>
                </h4>
                <p className="text-xs text-[#8C7A6B]">
                  Para que a Meta avise seu app quando a cliente clicar em <strong>[Confirmar]</strong> ou <strong>[Cancelar]</strong>, cole esses dados no painel da Meta em <strong>WhatsApp &gt; Configuração &gt; Webhook</strong>:
                </p>

                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C7A6B] mb-1">
                      URL de Retorno de Chamada (Callback URL)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value="https://sheilasantos-agenda.netlify.app/.netlify/functions/whatsapp-webhook"
                        className="flex-1 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs font-mono text-[#5A4535]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('https://sheilasantos-agenda.netlify.app/.netlify/functions/whatsapp-webhook');
                          exibirToast('URL do Webhook copiada com sucesso!');
                        }}
                        className="px-3 py-2 bg-[#F4EBE1] hover:bg-[#EBDDCF] text-[#6D4C3D] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        title="Copiar URL"
                      >
                        <Copy size={13} />
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8C7A6B] mb-1">
                      Token de Verificação (Verify Token)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value="sheila_nail_webhook_secret"
                        className="flex-1 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl px-3 py-2 text-xs font-mono text-[#5A4535]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('sheila_nail_webhook_secret');
                          exibirToast('Token de verificação copiado com sucesso!');
                        }}
                        className="px-3 py-2 bg-[#F4EBE1] hover:bg-[#EBDDCF] text-[#6D4C3D] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        title="Copiar Token"
                      >
                        <Copy size={13} />
                        <span>Copiar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guia Rápido de Configuração Passo a Passo */}
              <div className="bg-[#FAF8F5] border border-[#F3ECE0] rounded-2xl p-5 space-y-3">
                <h4 className="font-serif font-bold text-sm text-[#5A4535] flex items-center gap-2">
                  <span>📖 Como Obter suas Credenciais Gratuitas da Meta em 3 Passos:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-[#6D4C3D] leading-relaxed">
                  <li>
                    Acesse o portal oficial <strong>developers.facebook.com</strong> e faça login com sua conta do Facebook.
                  </li>
                  <li>
                    Clique em <strong>Meus Aplicativos &gt; Criar Aplicativo</strong>, selecione a opção <strong>Outro</strong> e em seguida <strong>Comercial</strong>.
                  </li>
                  <li>
                    Na tela de produtos, clique em <strong>Configurar</strong> no card do <strong>WhatsApp</strong>.
                  </li>
                  <li>
                    Na aba <strong>WhatsApp &gt; Configuração da API</strong>, você verá na tela o seu <strong>Identificador do número de telefone (Phone Number ID)</strong> e o seu <strong>Token de acesso temporário</strong> para testar na hora!
                  </li>
                  <li>
                    Copie os dois valores, cole nos campos acima e clique em <strong>Salvar Credenciais da Meta</strong>!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 6: LICENÇA & ASSINATURA */}
          {activeTab === 'licenca' && (
            <div className="space-y-6">
              <div className="border-b border-[#FAF9F6] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-2">
                    <Key size={18} className="text-[#8C6D58]" />
                    <span>Licença de Uso & Assinatura do Aplicativo</span>
                  </h3>
                  <p className="text-xs text-[#8C7A6B] mt-0.5">
                    Informações sobre a chave de ativação, titularidade e validade deste dispositivo
                  </p>
                </div>
                {licencaAtual?.ativa && (
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    ● Licença Ativa
                  </span>
                )}
              </div>

              {/* Card de Status da Licença Atual */}
              <div className="bg-gradient-to-br from-[#FAF8F5] to-[#F5ECE5] border border-[#E8DEC9] rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#8C6D58] flex items-center justify-center text-white shadow-md">
                      {licencaAtual?.tipo === 'vitalicio' ? <Crown size={22} /> : <Calendar size={22} />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#8C7A6B] uppercase tracking-wider block">
                        Modalidade Atual
                      </span>
                      <h4 className="font-serif font-bold text-lg text-[#5A4535]">
                        {licencaAtual?.tipo === 'vitalicio' 
                          ? '👑 Acesso Vitalício (Sem Expiração)' 
                          : licencaAtual?.tipo === 'mensal'
                          ? '📅 Assinatura Mensal'
                          : '⏱️ Período de Avaliação / Degustação'}
                      </h4>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-white border border-[#E5D5C5] text-[#5A4535] shadow-2xs">
                    {licencaAtual?.chave || 'CHAVE NÃO DEFINIDA'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E8DEC9]/60">
                  <div className="bg-white/80 p-3 rounded-xl border border-[#E8DEC9]">
                    <span className="text-[10px] text-[#8C7A6B] font-bold block uppercase">Titular Registrado</span>
                    <span className="text-xs font-bold text-[#5A4535]">{licencaAtual?.titular || 'Sheila Santos'}</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-[#E8DEC9]">
                    <span className="text-[10px] text-[#8C7A6B] font-bold block uppercase">Data de Ativação</span>
                    <span className="text-xs font-bold text-[#5A4535]">
                      {licencaAtual?.dataAtivacao ? new Date(licencaAtual.dataAtivacao).toLocaleDateString('pt-BR') : 'Hoje'}
                    </span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-[#E8DEC9]">
                    <span className="text-[10px] text-[#8C7A6B] font-bold block uppercase">Validade / Expiração</span>
                    <span className="text-xs font-bold text-[#5A4535]">
                      {licencaAtual?.tipo === 'vitalicio' 
                        ? 'Vitalício (Permanente)' 
                        : licencaAtual?.diasRestantes !== undefined
                        ? `${licencaAtual.diasRestantes} dias restantes`
                        : 'Ativa'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback de Atualização */}
              {licencaFeedback && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  licencaFeedback.sucesso 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {licencaFeedback.sucesso ? <Check size={16} /> : <AlertTriangle size={16} />}
                  <span>{licencaFeedback.mensagem}</span>
                </div>
              )}

              {/* Formulário para Atualizar ou Trocar a Chave */}
              <form onSubmit={handleAtualizarLicenca} className="bg-white border border-[#EFECE6] rounded-2xl p-5 space-y-4">
                <h4 className="font-serif font-bold text-sm text-[#5A4535]">Atualizar ou Inserir Nova Chave de Licença</h4>
                <p className="text-xs text-[#8C7A6B]">
                  Se você comprou uma nova licença vitalícia ou renovou sua mensalidade, digite a nova chave abaixo:
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="EX: SHEILA-VIP-2026 OU VITA-XXXX-XXXX"
                    value={novaChaveInput}
                    onChange={(e) => setNovaChaveInput(e.target.value.toUpperCase())}
                    className="flex-1 border border-[#EFECE6] rounded-xl px-4 py-2.5 text-xs text-[#5A4535] bg-[#FAF9F6] font-mono uppercase font-bold"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Key size={14} />
                    <span>Aplicar Nova Chave</span>
                  </button>
                </div>
              </form>

              {/* Ações Comerciais e Suporte */}
              <div className="bg-[#FAF8F5] border border-[#F3ECE0] rounded-2xl p-5 space-y-4">
                <h4 className="font-serif font-bold text-sm text-[#5A4535]">Comprar Novas Licenças ou Suporte</h4>
                <p className="text-xs text-[#6D4C3D] leading-relaxed">
                  Para adquirir licenças adicionais para outros aparelhos da sua equipe, renovar planos mensais ou transferir titularidade, fale diretamente com o suporte comercial.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent('Olá! Gostaria de falar sobre renovação e compra de licenças do App Agenda Nail Designer.');
                      window.open(`https://wa.me/5535997141856?text=${msg}`, '_blank');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20BA5C] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>Falar com Suporte de Licenças no WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRevogarLicenca}
                    className="w-full sm:w-auto px-4 py-2.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Desativar Licença deste Aparelho</span>
                  </button>
                </div>
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

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Senha de acesso inicial</label>
                <input 
                  type="text" 
                  placeholder="Digite a senha (padrão: admin)..."
                  value={novoMembroSenha} 
                  onChange={(e) => setNovoMembroSenha(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              {/* Serviços que realiza */}
              <div className="pt-2 border-t border-[#EFECE6]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#8C7A6B]">Serviços Habilitados</label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setNovoMembroServicos(servicos.filter(s => s.ativo).map(s => s.id))}
                      className="text-[#8C6D58] hover:underline font-bold"
                    >
                      Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setNovoMembroServicos([])}
                      className="text-gray-400 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl text-xs">
                  {servicos.filter(s => s.ativo).map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-white">
                      <input
                        type="checkbox"
                        checked={novoMembroServicos.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNovoMembroServicos(prev => [...prev, s.id]);
                          } else {
                            setNovoMembroServicos(prev => prev.filter(id => id !== s.id));
                          }
                        }}
                        className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58] h-3.5 w-3.5"
                      />
                      <span className="text-[#5A4535]">{s.nome}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-[#8C7A6B] mt-1 italic">
                  * Se nenhum for marcado, ela realiza todos os serviços.
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6] mt-4">
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

      {/* --- MODAL EDITAR PROFISSIONAL & SERVIÇOS --- */}
      {isEditarMembroModalOpen && membroEditando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EFECE6] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[#EFECE6] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-2">
                  <Edit2 size={16} className="text-[#8C6D58]" />
                  <span>Editar Profissional</span>
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">Altere dados cadastrais e os serviços que ela realiza</p>
              </div>
              <button 
                onClick={() => setIsEditarMembroModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoMembro} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Nome Completo</label>
                <input 
                  type="text" required 
                  value={editNome} onChange={(e) => setEditNome(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={editFone} onChange={(e) => setEditFone(e.target.value)}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Perfil de Acesso</label>
                  <select
                    value={editPerfil}
                    onChange={(e) => setEditPerfil(e.target.value as 'admin' | 'profissional')}
                    className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] bg-white focus:outline-none focus:border-[#8C6D58]"
                  >
                    <option value="profissional">Profissional da equipe</option>
                    <option value="admin">Administradora</option>
                  </select>
                </div>
              </div>

              {/* SELEÇÃO DE SERVIÇOS REALIZADOS */}
              <div className="pt-2 border-t border-[#EFECE6]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold text-[#5A4535]">Serviços Habilitados</label>
                    <p className="text-[11px] text-[#8C7A6B]">Procedimentos disponíveis para agendamento dela</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setEditServicosHabilitados(servicos.filter(s => s.ativo).map(s => s.id))}
                      className="text-[#8C6D58] hover:underline font-bold"
                    >
                      Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setEditServicosHabilitados([])}
                      className="text-gray-400 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-[#FAF9F6] border border-[#EFECE6] rounded-xl">
                  {servicos.filter(s => s.ativo).map(s => {
                    const isChecked = editServicosHabilitados.includes(s.id);
                    return (
                      <label 
                        key={s.id} 
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-white border-[#8C6D58]/50 shadow-2xs' 
                            : 'bg-white/50 border-transparent opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditServicosHabilitados(prev => [...prev, s.id]);
                              } else {
                                setEditServicosHabilitados(prev => prev.filter(id => id !== s.id));
                              }
                            }}
                            className="rounded border-[#EFECE6] text-[#8C6D58] focus:ring-[#8C6D58] h-4 w-4"
                          />
                          <div>
                            <span className="font-bold text-[#5A4535]">{s.nome}</span>
                            <span className="text-[10px] text-[#8C7A6B] block">{s.duracao_minutos} min • {s.categoria}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#8C6D58]">
                          {formatarMoedaLocal(s.preco)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#8C7A6B] mt-1.5 italic">
                  * Se nenhum serviço for marcado, ela estará disponível para todos os serviços cadastrados.
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
                <button
                  type="button"
                  onClick={() => setIsEditarMembroModalOpen(false)}
                  className="px-4 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL ALTERAR SENHA DE USUÁRIO --- */}
      {isAlterarSenhaModalOpen && membroParaAlterarSenha && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#EFECE6]">
            <div className="flex justify-between items-center mb-4 border-b border-[#EFECE6] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#5A4535] flex items-center gap-2">
                  <Lock size={16} className="text-[#8C6D58]" />
                  <span>Alterar Senha</span>
                </h3>
                <p className="text-xs text-[#8C7A6B] mt-0.5">{membroParaAlterarSenha.nome}</p>
              </div>
              <button 
                onClick={() => setIsAlterarSenhaModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#FAF9F6] text-[#8C7A6B]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaSenha} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] mb-1.5">Nova Senha de Acesso</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Digite a nova senha..."
                  value={novaSenhaInput} 
                  onChange={(e) => setNovaSenhaInput(e.target.value)}
                  className="w-full border border-[#EFECE6] rounded-xl px-3 py-2 text-xs text-[#5A4535] focus:outline-none focus:border-[#8C6D58] font-mono"
                />
                <p className="text-[11px] text-[#A19488] mt-1.5">
                  Essa senha será exigida na tela de login para este perfil.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-[#EFECE6]">
                <button
                  type="button"
                  onClick={() => setIsAlterarSenhaModalOpen(false)}
                  className="px-4 py-2 border border-[#EFECE6] text-[#8C7A6B] text-xs font-bold rounded-xl hover:bg-[#FAF9F6]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#8C6D58] hover:bg-[#725743] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Salvar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGoogleSyncModalOpen && (
        <GoogleSyncModal onClose={() => setIsGoogleSyncModalOpen(false)} />
      )}

      {/* TOAST FLUTUANTE DE CONFIRMAÇÃO DE SALVAMENTO NA NUVEM */}
      {toastNotificacao && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
            toastNotificacao.tipo === 'sucesso'
              ? 'bg-[#1C1917] text-emerald-400 border-emerald-500/40 shadow-emerald-950/40'
              : 'bg-[#1C1917] text-amber-300 border-amber-500/40'
          }`}>
            <Cloud size={16} className="text-emerald-400 shrink-0" />
            <span>{toastNotificacao.mensagem}</span>
          </div>
        </div>
      )}
    </div>
  );
};
