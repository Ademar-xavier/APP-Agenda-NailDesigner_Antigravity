// Serviço de Integração com WhatsApp via QR Code (Z-API / Evolution API / Gateway Personalizado)
// Não requer aprovação nem verificação de empresa no Meta for Developers
import { QrCodeWhatsAppConfig } from '../types';

const STORAGE_KEY = 'nail_qrcode_whatsapp_config';

export const obterConfigQrCodeWhatsApp = (overrideConfig?: QrCodeWhatsAppConfig): QrCodeWhatsAppConfig => {
  if (overrideConfig && (overrideConfig.instancia || overrideConfig.apiUrl)) {
    return overrideConfig;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}

  return {
    ativo: false,
    provedor: 'zapi',
    instancia: '',
    token: '',
    clientToken: '',
    apiUrl: '',
    numeroAlertaProfissional: '',
    notificarClienteAoAgendar: true,
    notificarProfissionalAoAgendar: true
  };
};

export const salvarConfigQrCodeWhatsApp = (config: QrCodeWhatsAppConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar config do WhatsApp QR Code:', e);
  }
};

// Envia mensagem via API serverless da Vercel (bypassing CORS)
export const enviarMensagemWhatsAppQrCode = async (
  destinatario: string,
  texto: string,
  configOverride?: QrCodeWhatsAppConfig
): Promise<{ sucesso: boolean; mensagem: string }> => {
  if (!destinatario || !texto) {
    return { sucesso: false, mensagem: 'Destinatário ou mensagem ausentes.' };
  }

  const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  const endpoint = isVercelHost
    ? '/api/enviar-whatsapp-qrcode'
    : 'https://sheilasantos-agenda.vercel.app/api/enviar-whatsapp-qrcode';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinatario,
        mensagem: texto,
        config: configOverride
      })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        sucesso: false,
        mensagem: json.erro || `Erro ${res.status} ao disparar mensagem`
      };
    }

    return {
      sucesso: !!json.sucesso,
      mensagem: json.mensagem || (json.sucesso ? 'Enviado com sucesso!' : 'Falha no disparo')
    };
  } catch (err: any) {
    console.error('[WhatsApp QR Code] Falha na requisição:', err);
    return {
      sucesso: false,
      mensagem: err.message || 'Erro de conexão ao enviar WhatsApp via QR Code'
    };
  }
};
