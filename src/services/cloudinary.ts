/**
 * Serviço de Upload e Hospedagem de Imagens via Cloudinary (CDN)
 * Descarrega o banco de dados do Supabase salvando apenas URLs leves.
 */

const CLOUDINARY_CLOUD_NAME = 'szbyg4k9';
const CLOUDINARY_UPLOAD_PRESET = 'salao_app';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

/**
 * Faz upload de um File, Blob ou string Base64 para o Cloudinary e retorna a URL HTTPS segura.
 * Se já for uma URL HTTP/HTTPS, retorna a própria URL sem re-enviar.
 */
export const uploadImagemCloudinary = async (
  source: File | Blob | string,
  pasta: string = 'salao_geral'
): Promise<string> => {
  // Se for vazio ou nulo, retorna vazio
  if (!source) return '';

  // Se já for uma URL externa (Cloudinary, Unsplash, HTTPS), não precisa subir novamente
  if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
    return source;
  }

  // 1. Validação de Segurança (OWASP File Upload Protection)
  // Limita tamanho a no máximo 5 MB e restringe a formatos de imagem permitidos
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  if (source instanceof File || source instanceof Blob) {
    if (source.size > MAX_FILE_SIZE) {
      console.warn(`Arquivo excede o limite de 5MB (${(source.size / (1024 * 1024)).toFixed(1)}MB). Upload cancelado.`);
      throw new Error('O arquivo excede o tamanho máximo permitido de 5MB.');
    }
    if (source.type && !source.type.startsWith('image/')) {
      console.warn(`Tentativa de upload de formato não permitido: ${source.type}.`);
      throw new Error('Apenas arquivos de imagem (JPG, PNG, WebP) são permitidos.');
    }
  }

  try {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();

    formData.append('file', source);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (pasta) {
      formData.append('folder', pasta);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      console.error('Falha no upload Cloudinary:', response.status, errorJson);
      throw new Error(errorJson?.error?.message || `Erro ${response.status} ao enviar imagem para o Cloudinary`);
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary, usando fallback:', error);
    // Fallback: se falhar o upload (ex: offline), preserva a string local para não travar o app do usuário
    if (typeof source === 'string') {
      return source;
    }
    return '';
  }
};
