// Integração Oficial com a Meta Cloud API (WhatsApp Business)
// Suporta 1.000 conversas gratuitas por mês com botões interativos clicáveis

export interface MetaWhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  ativo: boolean;
}

export interface MetaButtonOption {
  id: string;
  title: string; // Máximo 20 caracteres segundo as regras da Meta
}

const STORAGE_KEY = 'nail_meta_whatsapp_config';

// Carrega as credenciais salvas (ou lê das variáveis de ambiente .env se houver)
export const obterConfigMetaWhatsApp = (): MetaWhatsAppConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erro ao ler config da Meta:', e);
  }

  return {
    phoneNumberId: (import.meta as any).env?.VITE_META_PHONE_NUMBER_ID || '',
    accessToken: (import.meta as any).env?.VITE_META_WHATSAPP_TOKEN || '',
    ativo: false
  };
};

export const salvarConfigMetaWhatsApp = (config: MetaWhatsAppConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar config da Meta:', e);
  }
};

// Formata e limpa o número para o padrão internacional (ex: 5535999999999)
export const normalizarTelefoneWhatsApp = (telefone: string): string => {
  const digits = telefone.replace(/\D/g, '');
  if (digits.startsWith('55')) {
    return digits;
  }
  return '55' + digits;
};

// Envia mensagem interativa com botões clicáveis oficiais
export const enviarMensagemBotaoMeta = async ({
  destinatario,
  textoCorpo,
  botoes,
  headerText,
  footerText = 'Sheila Santos Nails Designer'
}: {
  destinatario: string;
  textoCorpo: string;
  botoes: MetaButtonOption[];
  headerText?: string;
  footerText?: string;
}): Promise<{ sucesso: boolean; mensagem: string }> => {
  const config = obterConfigMetaWhatsApp();

  if (!config.phoneNumberId || !config.accessToken) {
    return {
      sucesso: false,
      mensagem: 'Credenciais da Meta (Phone Number ID ou Token) não configuradas.'
    };
  }

  const to = normalizarTelefoneWhatsApp(destinatario);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: headerText ? { type: 'text', text: headerText } : undefined,
      body: { text: textoCorpo },
      footer: { text: footerText.substring(0, 60) },
      action: {
        buttons: botoes.slice(0, 3).map(b => ({
          type: 'reply',
          reply: {
            id: b.id,
            title: b.title.substring(0, 20)
          }
        }))
      }
    }
  };

  try {
    const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro retornado pela Meta Cloud API:', data);
      const msgErro = data?.error?.message || 'Falha ao enviar mensagem pela Meta.';
      return { sucesso: false, mensagem: msgErro };
    }

    return {
      sucesso: true,
      mensagem: 'Mensagem com botões enviada com sucesso pelo WhatsApp oficial da Meta!'
    };
  } catch (error: any) {
    console.error('Falha de rede ao conectar à Meta Cloud API:', error);
    return {
      sucesso: false,
      mensagem: error.message || 'Erro de conexão com os servidores da Meta.'
    };
  }
};

// Envia mensagem simples de texto (ex: confirmação ou agradecimento)
export const enviarMensagemTextoMeta = async (
  destinatario: string,
  texto: string
): Promise<{ sucesso: boolean; mensagem: string }> => {
  const config = obterConfigMetaWhatsApp();

  if (!config.phoneNumberId || !config.accessToken) {
    return {
      sucesso: false,
      mensagem: 'Credenciais da Meta (Phone Number ID ou Token) não configuradas.'
    };
  }

  const to = normalizarTelefoneWhatsApp(destinatario);

  try {
    const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: texto }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { sucesso: false, mensagem: data?.error?.message || 'Erro no envio de texto.' };
    }

    return { sucesso: true, mensagem: 'Mensagem de texto enviada com sucesso!' };
  } catch (error: any) {
    return { sucesso: false, mensagem: error.message || 'Erro de rede.' };
  }
};
