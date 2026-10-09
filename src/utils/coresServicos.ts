export interface CorPreset {
  hex: string;
  nome: string;
  bgSuave?: string;
}

export const PALETA_CORES_SERVICOS: CorPreset[] = [
  { hex: '#E0A96D', nome: 'Dourado / Champagne', bgSuave: '#FDF8F3' },
  { hex: '#D9777F', nome: 'Rosa Nude Clássico', bgSuave: '#FDF5F6' },
  { hex: '#EC4899', nome: 'Pink / Rosa Vibrante', bgSuave: '#FDF2F8' },
  { hex: '#F43F5E', nome: 'Framboesa / Carmim', bgSuave: '#FFF1F2' },
  { hex: '#EF4444', nome: 'Vermelho Intenso', bgSuave: '#FEF2F2' },
  { hex: '#F97316', nome: 'Coral / Laranja', bgSuave: '#FFF7ED' },
  { hex: '#F59E0B', nome: 'Âmbar / Caramelo', bgSuave: '#FFFBEB' },
  { hex: '#84CC16', nome: 'Verde Lima / Menta', bgSuave: '#F7FEE7' },
  { hex: '#10B981', nome: 'Verde Esmeralda', bgSuave: '#ECFDF5' },
  { hex: '#06B6D4', nome: 'Turquesa / Ciano', bgSuave: '#ECFEFF' },
  { hex: '#0EA5E9', nome: 'Azul Céu', bgSuave: '#F0F9FF' },
  { hex: '#3B82F6', nome: 'Azul Real', bgSuave: '#EFF6FF' },
  { hex: '#6366F1', nome: 'Índigo / Violeta', bgSuave: '#EEF2FF' },
  { hex: '#8B5CF6', nome: 'Lavanda / Roxo', bgSuave: '#F5F3FF' },
  { hex: '#A855F7', nome: 'Orquídea / Lilás', bgSuave: '#FAF5FF' },
  { hex: '#881337', nome: 'Bordô / Vinho', bgSuave: '#FFF1F2' },
  { hex: '#78350F', nome: 'Terracota / Café', bgSuave: '#FEF3C7' },
  { hex: '#5A4535', nome: 'Moka / Marrom Salão', bgSuave: '#FAF4ED' },
  { hex: '#64748B', nome: 'Cinza Ardósia', bgSuave: '#F8FAFC' }
];

export const obterCorDoServico = (
  servico?: { id?: string; nome?: string; categoria?: string; cor?: string } | null, 
  indexFallback: number = 0
): string => {
  if (servico?.cor && typeof servico.cor === 'string' && servico.cor.trim()) {
    return servico.cor.trim();
  }
  if (!servico) return '#8C6D58';

  const nome = (servico.nome || '').toLowerCase();
  const cat = (servico.categoria || '').toLowerCase();

  // Mapeamento semântico por técnica ou tipo
  if (nome.includes('fibra') || cat.includes('fibra')) return '#E0A96D'; // Dourado
  if (nome.includes('esmaltação em gel') || (nome.includes('gel') && !nome.includes('banho'))) return '#EC4899'; // Pink
  if (nome.includes('banho em gel') || nome.includes('banho de gel')) return '#F43F5E'; // Framboesa
  if (nome.includes('manuten') || cat.includes('manuten')) return '#A855F7'; // Roxo / Lavanda
  if (nome.includes('combo') || cat.includes('combo') || nome.includes('pé e mão') || nome.includes('mão + pé')) return '#3B82F6'; // Azul
  if (nome.includes('pedicure') || cat.includes('pe') || nome.includes('pé')) return '#10B981'; // Verde
  if (nome.includes('nail art') || nome.includes('decora') || cat.includes('decor')) return '#F59E0B'; // Âmbar
  if (nome.includes('blindagem')) return '#06B6D4'; // Turquesa
  if (nome.includes('manicure') || cat.includes('mao') || nome.includes('mão')) return '#D9777F'; // Rosa Suave
  if (nome.includes('alongamento')) return '#E0A96D'; // Dourado
  if (nome.includes('remov')) return '#64748B'; // Cinza

  const fallbackList = ['#E0A96D', '#EC4899', '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#06B6D4', '#D9777F', '#84CC16', '#F97316'];
  return fallbackList[indexFallback % fallbackList.length];
};
