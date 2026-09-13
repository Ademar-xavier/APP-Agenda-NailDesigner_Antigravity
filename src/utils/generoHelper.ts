// Módulo utilitário para detecção inteligente de gênero e concordância gramatical

// Lista abrangente de primeiros nomes masculinos populares no Brasil
const NOMES_MASCULINOS = new Set([
  'ademar', 'adilson', 'adriano', 'afonso', 'alan', 'alberto', 'alcides', 'alessandro', 
  'alex', 'alexandre', 'alisson', 'almir', 'aloisio', 'alvaro', 'amilcar', 'andre', 
  'anderson', 'antonio', 'anthony', 'arlindo', 'arnaldo', 'arthur', 'artur', 'augusto', 
  'ayrton', 'benicio', 'benjamin', 'bento', 'bernardo', 'breno', 'bruno', 'bryan', 
  'caio', 'carlos', 'cauã', 'caua', 'celso', 'cesar', 'cleber', 'claudio', 'cleiton', 
  'cristiano', 'cristovao', 'daniel', 'danilo', 'davi', 'david', 'denis', 'diego', 
  'diogo', 'djalma', 'domingos', 'douglas', 'eder', 'edgard', 'edmilson', 'edson', 
  'eduardo', 'elias', 'elio', 'elton', 'emanuel', 'emerson', 'enrico', 'enzo', 
  'erick', 'erico', 'estevao', 'evandro', 'everton', 'ezequiel', 'fabiano', 'fabio', 
  'fabricio', 'felipe', 'felix', 'fernando', 'filipe', 'flavio', 'francisco', 'gabriel', 
  'gael', 'george', 'geraldo', 'gerson', 'gilberto', 'gilmar', 'giovani', 'giovanni', 
  'glaucio', 'guilherme', 'gustavo', 'heitor', 'helio', 'henrique', 'hugo', 'iago', 
  'ian', 'igor', 'isaac', 'isac', 'ivan', 'jaime', 'jair', 'jamil', 'jean', 
  'jefferson', 'joao', 'joaquim', 'joel', 'jonas', 'jonathan', 'jorge', 'jose', 
  'josue', 'juliano', 'julio', 'kaio', 'kaua', 'kauan', 'kleber', 'leandro', 
  'leo', 'leonardo', 'lorenzo', 'luan', 'lucas', 'luciano', 'lucio', 'luigi', 
  'luis', 'luiz', 'manoel', 'manuel', 'marcelo', 'marcio', 'marco', 'marcos', 
  'marcus', 'mario', 'mateus', 'matheus', 'mauricio', 'mauro', 'michel', 'miguel', 
  'murilo', 'nathan', 'nelson', 'nestor', 'nicolas', 'nilson', 'nilton', 'noah', 
  'olavo', 'orlando', 'oscar', 'osmar', 'osvaldo', 'otavio', 'pablo', 'paulo', 
  'pedro', 'pietro', 'rafael', 'raimundo', 'ramiro', 'ramon', 'raul', 'reginaldo', 
  'reinaldo', 'renan', 'renato', 'ricardo', 'roberval', 'roberto', 'robson', 
  'rodolfo', 'rodrigo', 'rogerio', 'romulo', 'ronaldo', 'ronnie', 'rubens', 
  'samuel', 'sandro', 'sergio', 'sidney', 'silvio', 'tales', 'thales', 'teodoro', 
  'theo', 'thiago', 'tiago', 'ueliton', 'ulisses', 'vagner', 'valdemar', 'valdir', 
  'valmir', 'valter', 'vicente', 'victor', 'vinicius', 'vitor', 'vladimir', 
  'wagner', 'waldir', 'walter', 'washington', 'wellington', 'wesley', 'willian', 
  'william', 'wilson', 'yago', 'yan', 'yuri'
]);

// Lista abrangente de primeiros nomes femininos populares no Brasil
const NOMES_FEMININOS = new Set([
  'adriana', 'agata', 'agatha', 'alana', 'alessandra', 'alice', 'aline', 'amanda', 
  'ana', 'analu', 'andreia', 'andressa', 'anita', 'aparecida', 'ariane', 'ariel', 
  'barbara', 'beatriz', 'bianca', 'bruna', 'camila', 'carla', 'carolina', 'caroline', 
  'catarina', 'cecilia', 'cibele', 'clara', 'clarice', 'claudia', 'cleide', 'cristiane', 
  'cristina', 'daiane', 'daniela', 'daniele', 'debora', 'denise', 'edna', 'elaine', 
  'elena', 'eliane', 'elisa', 'elisangela', 'elza', 'emanuela', 'emily', 'erica', 
  'eva', 'evelyn', 'fabiana', 'fatima', 'fernanda', 'flavia', 'franciele', 'gabriela', 
  'gabriele', 'geovana', 'gessica', 'gilmara', 'giovanna', 'gisele', 'helen', 'helena', 
  'heloisa', 'ines', 'ingrid', 'isabel', 'isabela', 'isabella', 'isadora', 'isis', 
  'ivone', 'izabel', 'jacqueline', 'janaína', 'janaina', 'jaqueline', 'jessica', 
  'joana', 'jordana', 'josiane', 'julia', 'juliana', 'jussara', 'kamila', 'karina', 
  'karla', 'katia', 'kelly', 'lara', 'larissa', 'laura', 'lavinia', 'layla', 
  'leila', 'leticia', 'lidia', 'ligia', 'lilian', 'livia', 'lorena', 'lorrane', 
  'luana', 'luciana', 'lucilene', 'ludmila', 'luisa', 'luiza', 'madalena', 'maira', 
  'mais', 'maite', 'mara', 'marcela', 'marcia', 'margarete', 'maria', 'mariana', 
  'marilia', 'marina', 'marisa', 'marlene', 'marta', 'michele', 'mirela', 'monica', 
  'nadia', 'naiara', 'natalia', 'nathalia', 'nayara', 'nicole', 'noemi', 'nubia', 
  'olivia', 'paloma', 'pamela', 'paola', 'patricia', 'paula', 'priscila', 'rafaela', 
  'raissa', 'raquel', 'rayane', 'rebeca', 'regina', 'renata', 'rita', 'roberta', 
  'rosana', 'rosangela', 'rose', 'roseli', 'sabrina', 'samara', 'samira', 'sandra', 
  'sara', 'sarah', 'sheila', 'silvia', 'simone', 'sofia', 'sophia', 'stefany', 
  'sueli', 'suzana', 'tais', 'talita', 'tamires', 'tatiana', 'tatiane', 'thais', 
  'thalita', 'valeria', 'vanessa', 'vera', 'veronica', 'vitoria', 'vivian', 'viviane', 
  'yasmin', 'yara'
]);

/**
 * Remove acentuação e caracteres especiais para comparação fonética/textual limpa
 */
export const normalizarNomeParaComparacao = (nome: string): string => {
  if (!nome) return '';
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Extrai o primeiro nome de um nome completo
 */
export const extrairPrimeiroNome = (nomeCompleto: string): string => {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  return partes[0] || '';
};

/**
 * Detecta o gênero com base no primeiro nome fornecido
 */
export const detectarGeneroPorNome = (nomeCompleto?: string): 'masculino' | 'feminino' | null => {
  if (!nomeCompleto) return null;
  const primeiroNome = extrairPrimeiroNome(nomeCompleto);
  const limpo = normalizarNomeParaComparacao(primeiroNome);
  if (!limpo) return null;

  if (NOMES_MASCULINOS.has(limpo)) return 'masculino';
  if (NOMES_FEMININOS.has(limpo)) return 'feminino';

  return null;
};

/**
 * Determina o gênero efetivo combinando:
 * 1. Escolha explícita/manual (se houver)
 * 2. Cadastro prévio do cliente no sistema
 * 3. Heurística pelo primeiro nome
 * 4. Fallback padrão ('feminino')
 */
export const obterGeneroEfetivo = (params: {
  sexoInformado?: 'feminino' | 'masculino' | string | null;
  sexoClienteExistente?: 'feminino' | 'masculino' | string | null;
  sexoModificadoManualmente?: boolean;
  nome?: string;
  fallback?: 'feminino' | 'masculino';
}): 'masculino' | 'feminino' => {
  const {
    sexoInformado,
    sexoClienteExistente,
    sexoModificadoManualmente = false,
    nome,
    fallback = 'feminino'
  } = params;

  // Se o usuário interagiu e alterou manualmente, respeitar estritamente
  if (sexoModificadoManualmente && (sexoInformado === 'masculino' || sexoInformado === 'feminino')) {
    return sexoInformado;
  }

  // Se o cliente já está cadastrado no sistema como masculino, nunca rebaixar
  if (sexoClienteExistente === 'masculino') {
    return 'masculino';
  }

  // Se o sexo informado for masculino
  if (sexoInformado === 'masculino') {
    return 'masculino';
  }

  // Se o nome for indiscutivelmente masculino na heurística brasileira
  if (nome) {
    const detectado = detectarGeneroPorNome(nome);
    if (detectado === 'masculino') {
      return 'masculino';
    }
  }

  // Se o cliente existente já estiver salvo como feminino
  if (sexoClienteExistente === 'feminino') {
    return 'feminino';
  }

  return fallback;
};

/**
 * Auxiliar para concordância de gênero gramatical
 */
export const formatarTratamentoGenero = (sexo?: 'feminino' | 'masculino' | string | null, nome?: string) => {
  const isMasc = sexo === 'masculino' || (!sexo && detectarGeneroPorNome(nome) === 'masculino');
  return {
    isMasc,
    artigo: isMasc ? 'O cliente' : 'A cliente',
    artigoMinusculo: isMasc ? 'o cliente' : 'a cliente',
    saudacao: isMasc ? 'Bem-vindo' : 'Bem-vinda',
    saudacaoMinuscula: isMasc ? 'bem-vindo' : 'bem-vinda',
    obrigado: isMasc ? 'Obrigado' : 'Obrigada',
    obrigadoMinusculo: isMasc ? 'obrigado' : 'obrigada',
    querido: isMasc ? 'Querido' : 'Querida',
    amigo: isMasc ? 'Amigo' : 'Amiga',
    confirmado: isMasc ? 'confirmado' : 'confirmada',
    reconhecido: isMasc ? 'Reconhecido' : 'Reconhecida',
    reconhecidoMinusculo: isMasc ? 'reconhecido' : 'reconhecida',
  };
};
