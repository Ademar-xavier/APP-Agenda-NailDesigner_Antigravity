import React, { useState, useRef, useEffect } from 'react';
import { Cliente, Anamnese } from '../types';
import { 
  X, 
  Check, 
  AlertTriangle, 
  FileText, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Heart, 
  Calendar,
  Sparkles
} from 'lucide-react';

interface ModalAnamneseProps {
  cliente: Cliente;
  isOpen: boolean;
  onClose: () => void;
  onSalvar: (anamnese: Anamnese) => void;
}

export const ModalAnamnese: React.FC<ModalAnamneseProps> = ({
  cliente,
  isOpen,
  onClose,
  onSalvar
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [temAssinatura, setTemAssinatura] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(!cliente.anamnese);

  // Estados do Formulário de Saúde
  const [possuiAlergia, setPossuiAlergia] = useState(cliente.anamnese?.possui_alergia || false);
  const [detalhesAlergia, setDetalhesAlergia] = useState(cliente.anamnese?.detalhes_alergia || cliente.alergias || '');
  const [diabetica, setDiabetica] = useState(cliente.anamnese?.diabetica || false);
  const [gestante, setGestante] = useState(cliente.anamnese?.gestante || false);
  const [micoseOuFungo, setMicoseOuFungo] = useState(cliente.anamnese?.micose_ou_fungo || false);
  const [habitoRoer, setHabitoRoer] = useState(cliente.anamnese?.habito_roer || false);
  const [problemasCirculatorios, setProblemasCirculatorios] = useState(cliente.anamnese?.problemas_circulatorios || false);
  const [medicamentos, setMedicamentos] = useState(cliente.anamnese?.medicamentos_uso_continuo || '');
  const [procedimentosAnteriores, setProcedimentosAnteriores] = useState(cliente.anamnese?.procedimentos_anteriores || '');
  const [observacoes, setObservacoes] = useState(cliente.anamnese?.observacoes_adicionais || '');
  const [termoAceite, setTermoAceite] = useState(cliente.anamnese?.termo_aceite || false);
  const [dispensarAssinaturaFisica, setDispensarAssinaturaFisica] = useState(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Sincroniza dados se cliente mudar
  useEffect(() => {
    if (cliente.anamnese) {
      setPossuiAlergia(cliente.anamnese.possui_alergia);
      setDetalhesAlergia(cliente.anamnese.detalhes_alergia || '');
      setDiabetica(cliente.anamnese.diabetica);
      setGestante(cliente.anamnese.gestante);
      setMicoseOuFungo(cliente.anamnese.micose_ou_fungo);
      setHabitoRoer(cliente.anamnese.habito_roer);
      setProblemasCirculatorios(cliente.anamnese.problemas_circulatorios || false);
      setMedicamentos(cliente.anamnese.medicamentos_uso_continuo || '');
      setProcedimentosAnteriores(cliente.anamnese.procedimentos_anteriores || '');
      setObservacoes(cliente.anamnese.observacoes_adicionais || '');
      setTermoAceite(cliente.anamnese.termo_aceite);
      setTemAssinatura(!!cliente.anamnese.assinatura_base64);
      setModoEdicao(false);
    } else {
      setPossuiAlergia(false);
      setDetalhesAlergia(cliente.alergias || '');
      setDiabetica(false);
      setGestante(false);
      setMicoseOuFungo(false);
      setHabitoRoer(false);
      setProblemasCirculatorios(false);
      setMedicamentos('');
      setProcedimentosAnteriores('');
      setObservacoes('');
      setTermoAceite(false);
      setTemAssinatura(false);
      setModoEdicao(true);
    }
  }, [cliente, isOpen]);

  // Inicializa o canvas de assinatura
  useEffect(() => {
    if (isOpen && modoEdicao && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#2D2319';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, modoEdicao]);

  if (!isOpen) return null;

  // Lógica do Canvas Touch e Mouse
  const obterCoordenadas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
    return { x: 0, y: 0 };
  };

  const iniciarDesenho = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = obterCoordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setTemAssinatura(true);
  };

  const desenhar = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = obterCoordenadas(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finalizarDesenho = () => {
    setIsDrawing(false);
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setTemAssinatura(false);
  };

  const handleSalvar = () => {
    setErroValidacao(null);
    let assinaturaFinal = cliente.anamnese?.assinatura_base64 || '';
    if (modoEdicao && canvasRef.current && temAssinatura) {
      assinaturaFinal = canvasRef.current.toDataURL('image/png');
    }

    if (!assinaturaFinal && modoEdicao && !dispensarAssinaturaFisica) {
      setErroValidacao('Por favor, assine no quadro abaixo ou marque a opção de dispensar assinatura touch (consentimento verbal).');
      return;
    }

    if (!assinaturaFinal && dispensarAssinaturaFisica) {
      assinaturaFinal = 'CONSENTIMENTO_VERBAL_' + new Date().toISOString();
    }

    if (!termoAceite) {
      setErroValidacao('É necessário marcar a caixa declarando concordância com os termos informados.');
      return;
    }

    const novaAnamnese: Anamnese = {
      id: cliente.anamnese?.id || `anamnese_${Date.now()}`,
      cliente_id: cliente.id,
      data_preenchimento: new Date().toISOString(),
      possui_alergia: possuiAlergia,
      detalhes_alergia: possuiAlergia ? detalhesAlergia : undefined,
      diabetica,
      gestante,
      micose_ou_fungo: micoseOuFungo,
      habito_roer: habitoRoer,
      problemas_circulatorios: problemasCirculatorios,
      medicamentos_uso_continuo: medicamentos || undefined,
      procedimentos_anteriores: procedimentosAnteriores || undefined,
      observacoes_adicionais: observacoes || undefined,
      assinatura_base64: assinaturaFinal,
      termo_aceite: termoAceite
    };

    onSalvar(novaAnamnese);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#FCFAF7] border border-[#E8DFC8] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho Elegante */}
        <div className="bg-gradient-to-r from-[#2D2319] via-[#423425] to-[#2D2319] text-[#F9F6EE] px-6 py-5 flex items-center justify-between border-b border-[#C5A880]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C5A880]/20 flex items-center justify-center border border-[#C5A880]/40 text-[#D4B996]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#F9F6EE] flex items-center gap-2">
                Ficha de Anamnese Digital
                <Sparkles className="w-4 h-4 text-[#D4B996]" />
              </h2>
              <p className="text-xs text-[#C5A880]">
                Cliente: <strong className="text-white">{cliente.nome}</strong> · {cliente.telefone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#C5A880] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Formulário */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-[#2D2319]">
          
          {/* Status Atual se já existir */}
          {cliente.anamnese && !modoEdicao && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Anamnese Assinada e Válida</h4>
                  <p className="text-xs text-emerald-700">
                    Preenchida e assinada em {new Date(cliente.anamnese.data_preenchimento).toLocaleDateString('pt-BR')} às {new Date(cliente.anamnese.data_preenchimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModoEdicao(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Atualizar Ficha
              </button>
            </div>
          )}

          {/* Questionário Clínico / Cuidados */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#C5A880]" />
              Condições de Saúde e Contraindicações
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Alergias */}
              <div className={`p-3.5 rounded-xl border transition-all ${possuiAlergia ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#E8DFC8]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#423425]">Possui Alergia a Produtos Químicos?</span>
                  <button
                    type="button"
                    disabled={!modoEdicao}
                    onClick={() => setPossuiAlergia(!possuiAlergia)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${possuiAlergia ? 'bg-amber-600 justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                  </button>
                </div>
                {possuiAlergia && (
                  <input
                    type="text"
                    disabled={!modoEdicao}
                    value={detalhesAlergia}
                    onChange={(e) => setDetalhesAlergia(e.target.value)}
                    placeholder="Quais alergias? (gel, monômero, esmalte...)"
                    className="mt-2 w-full text-xs px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>

              {/* Diabetes */}
              <div className={`p-3.5 rounded-xl border transition-all ${diabetica ? 'bg-rose-50 border-rose-300' : 'bg-white border-[#E8DFC8]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#423425] block">É Diabética?</span>
                    <span className="text-[10px] text-[#8C7A6B]">Requer cuidado redobrado na cutilagem</span>
                  </div>
                  <button
                    type="button"
                    disabled={!modoEdicao}
                    onClick={() => setDiabetica(!diabetica)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${diabetica ? 'bg-rose-600 justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                  </button>
                </div>
              </div>

              {/* Micose ou Fungos */}
              <div className={`p-3.5 rounded-xl border transition-all ${micoseOuFungo ? 'bg-red-50 border-red-300' : 'bg-white border-[#E8DFC8]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#423425] block">Micose ou Fungo nas Unhas?</span>
                    <span className="text-[10px] text-[#8C7A6B]">Contraindica alongamento em gel</span>
                  </div>
                  <button
                    type="button"
                    disabled={!modoEdicao}
                    onClick={() => setMicoseOuFungo(!micoseOuFungo)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${micoseOuFungo ? 'bg-red-600 justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                  </button>
                </div>
              </div>

              {/* Hábito de Roer */}
              <div className={`p-3.5 rounded-xl border transition-all ${habitoRoer ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#E8DFC8]'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#423425] block">Hábito de Roer Unhas?</span>
                    <span className="text-[10px] text-[#8C7A6B]">Onicofagia</span>
                  </div>
                  <button
                    type="button"
                    disabled={!modoEdicao}
                    onClick={() => setHabitoRoer(!habitoRoer)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${habitoRoer ? 'bg-[#8C7A6B] justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                  </button>
                </div>
              </div>

              {/* Gestante / Lactante */}
              <div className={`p-3.5 rounded-xl border transition-all ${gestante ? 'bg-purple-50 border-purple-300' : 'bg-white border-[#E8DFC8]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#423425]">Está Gestante ou Amamentando?</span>
                  <button
                    type="button"
                    disabled={!modoEdicao}
                    onClick={() => setGestante(!gestante)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${gestante ? 'bg-purple-600 justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                  </button>
                </div>
              </div>

              {/* Problemas Circulatórios */}
              <div className={`p-3.5 rounded-xl border transition-all ${problemasCirculatorios ? 'bg-blue-50 border-blue-300' : 'bg-white border-[#E8DFC8]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#423425]">Problemas Circulatórios?</span>
                  <button
                    type="button"
                    disabled={!modoEdicao}
                    onClick={() => setProblemasCirculatorios(!problemasCirculatorios)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${problemasCirculatorios ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
                  </button>
                </div>
              </div>

            </div>

            {/* Campos de Texto Adicionais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-[#423425] block mb-1">Medicamentos de uso contínuo:</label>
                <input
                  type="text"
                  disabled={!modoEdicao}
                  value={medicamentos}
                  onChange={(e) => setMedicamentos(e.target.value)}
                  placeholder="Ex: Roacutan, anticoagulantes..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFC8] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C5A880]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#423425] block mb-1">Procedimentos anteriores nas unhas:</label>
                <input
                  type="text"
                  disabled={!modoEdicao}
                  value={procedimentosAnteriores}
                  onChange={(e) => setProcedimentosAnteriores(e.target.value)}
                  placeholder="Ex: Já fez fibra antes, remoção incorreta..."
                  className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFC8] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C5A880]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#423425] block mb-1">Observações técnicas da profissional:</label>
              <textarea
                rows={2}
                disabled={!modoEdicao}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Lâmina ungueal sensível, recomendada manutenção a cada 18 dias..."
                className="w-full text-xs px-3 py-2 bg-white border border-[#E8DFC8] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C5A880]"
              />
            </div>
          </div>

          {/* Termo de Consentimento Legal */}
          <div className="bg-[#F4EFEA] border border-[#E8DFC8] rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-[#423425] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
              Termo de Consentimento & Responsabilidade
            </h4>
            <p className="text-[11px] leading-relaxed text-[#6E5D4F]">
              Declaro que as informações acima são verdadeiras e que fui informada sobre os cuidados necessários com as unhas artificiais/esmaltação, prazos ideais de manutenção e riscos decorrentes de tentativas de remoção mecânica em casa sem auxílio profissional.
            </p>
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                disabled={!modoEdicao}
                checked={termoAceite}
                onChange={(e) => setTermoAceite(e.target.checked)}
                className="w-4 h-4 rounded text-[#8C7A6B] focus:ring-[#C5A880] border-[#C5A880]"
              />
              <span className="text-xs font-semibold text-[#2D2319]">
                Li e concordo com os termos e cuidados informados.
              </span>
            </label>
          </div>

          {/* Área de Assinatura Touch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-[#C5A880]" />
                Assinatura da Cliente (Touch na Tela)
              </label>
              {modoEdicao && (
                <button
                  type="button"
                  onClick={limparAssinatura}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Assinatura
                </button>
              )}
            </div>

            {modoEdicao ? (
              <div className="space-y-2">
                <div className="relative border-2 border-dashed border-[#C5A880] bg-white rounded-xl overflow-hidden shadow-inner touch-none">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    style={{ touchAction: 'none' }}
                    onMouseDown={iniciarDesenho}
                    onMouseMove={desenhar}
                    onMouseUp={finalizarDesenho}
                    onMouseLeave={finalizarDesenho}
                    onTouchStart={iniciarDesenho}
                    onTouchMove={desenhar}
                    onTouchEnd={finalizarDesenho}
                    className="w-full h-36 cursor-crosshair block"
                  />
                  {!temAssinatura && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center px-4">
                      <span className="text-xs text-[#C5A880]/80 font-medium">
                        Assine com o dedo no celular/tablet ou mouse aqui
                      </span>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-[#6E5D4F] select-none">
                  <input
                    type="checkbox"
                    checked={dispensarAssinaturaFisica}
                    onChange={(e) => {
                      setDispensarAssinaturaFisica(e.target.checked);
                      if (e.target.checked) setErroValidacao(null);
                    }}
                    className="w-4 h-4 rounded text-[#8C7A6B] focus:ring-[#C5A880] border-[#C5A880]"
                  />
                  <span>Dispensar assinatura touch no momento (Consentimento verbal / via WhatsApp)</span>
                </label>
              </div>
            ) : (
              <div className="border border-[#E8DFC8] bg-white rounded-xl p-3 flex items-center justify-center shadow-inner">
                {cliente.anamnese?.assinatura_base64?.startsWith('data:image') ? (
                  <img
                    src={cliente.anamnese.assinatura_base64}
                    alt="Assinatura da Cliente"
                    className="max-h-28 object-contain"
                  />
                ) : cliente.anamnese?.assinatura_base64 ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Consentimento Verbal / Remoto Registrado</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Nenhuma assinatura capturada.</span>
                )}
              </div>
            )}
          </div>

          {/* Mensagem de Erro de Validação */}
          {erroValidacao && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="font-medium">{erroValidacao}</span>
            </div>
          )}

        </div>

        {/* Rodapé de Ações */}
        <div className="bg-[#F4EFEA] px-6 py-4 border-t border-[#E8DFC8] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#8C7A6B] hover:text-[#2D2319] transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {modoEdicao ? (
              <button
                type="button"
                onClick={handleSalvar}
                className="px-5 py-2.5 bg-gradient-to-r from-[#2D2319] to-[#423425] hover:from-[#423425] hover:to-[#5A4535] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Check className="w-4 h-4 text-[#D4B996]" />
                Salvar e Registrar Ficha
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModoEdicao(true)}
                className="px-5 py-2.5 bg-[#423425] hover:bg-[#5A4535] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-[#D4B996]" />
                Editar Ficha
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
