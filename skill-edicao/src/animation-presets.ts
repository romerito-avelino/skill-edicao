export const PRESETS = {
  ABERTURA:   { duracao: 9000, tipo: "titulo-particulas" },
  IMPACTO:    { duracao: 7000, tipo: "texto-explosao-centro" },
  CITACAO:    { duracao: 6000, tipo: "texto-manuscrito" },
  TRANSICAO:  { duracao: 4500, tipo: "fade-texto-flutuante" },
  MAPA_MENTAL:{ duracao: 9000, tipo: "nos-conectados" },
  TIMELINE:   { duracao: 8000, tipo: "linha-tempo-animada" },
} as const;

export type PresetKey = keyof typeof PRESETS;
export type Preset = (typeof PRESETS)[PresetKey];

const MAPA_TIPO_MOMENTO: Record<string, PresetKey> = {
  abertura_historia:         "ABERTURA",
  climax_emocional:          "IMPACTO",
  "clímax_emocional":        "IMPACTO",
  desfecho:                  "IMPACTO",
  reflexao_arrependimento:   "CITACAO",
  reflexao_melancolia:       "CITACAO",
  abertura_esperanca:        "CITACAO",
  transicao_historia:        "TRANSICAO",
  conceito_explicacao:       "MAPA_MENTAL",
  sequencia_temporal:        "TIMELINE",
};

export function presetParaTipoMomento(tipoMomento: string): PresetKey {
  if (MAPA_TIPO_MOMENTO[tipoMomento]) return MAPA_TIPO_MOMENTO[tipoMomento];
  if (/^abertura_/.test(tipoMomento)) return "ABERTURA";
  if (/^cl[ií]max_/.test(tipoMomento)) return "IMPACTO";
  if (/^reflexao_/.test(tipoMomento)) return "CITACAO";
  if (/^transicao_/.test(tipoMomento)) return "TRANSICAO";
  if (/^conceito_/.test(tipoMomento)) return "MAPA_MENTAL";
  if (/^sequencia_/.test(tipoMomento)) return "TIMELINE";
  return "CITACAO";
}

export type DirecaoKenBurns = "zoom_in" | "zoom_out" | "pan_direita" | "pan_esquerda";

const KB_ALEATORIO: DirecaoKenBurns[] = [
  "zoom_in", "zoom_out", "pan_direita", "pan_esquerda",
];

export function kenBurnsParaTom(tomVisual: number, tipoMomento: string): DirecaoKenBurns {
  if (tomVisual === 1 || /^cl[ií]max_/.test(tipoMomento)) return "zoom_in";
  if (tomVisual === 2) return "zoom_out";
  if (tomVisual === 3) return "pan_esquerda";
  return KB_ALEATORIO[Math.floor(Math.random() * KB_ALEATORIO.length)];
}

// Banco de variações por categoria editorial
const VARIACOES = {
  textos_impacto: ["textos-v1", "textos-v2", "textos-v3", "textos-v4"],
  mapas_mentais:  ["mapas-v1",  "mapas-v2",  "mapas-v3",  "mapas-v4"],
  linha_tempo:    ["linha-v1",  "linha-v2",  "linha-v3",  "linha-v4"],
  citacoes:       ["citacoes-v1", "citacoes-v2", "citacoes-v3", "citacoes-v4"],
  animacoes_3d:   [
    "3d-globo-brasil", "3d-mapa-brasil", "3d-regiao-zoom",
    "3d-texto", "3d-grafico", "3d-esfera",
    "3d-titulo-epico", "3d-particulas-chuva", "3d-logo-reveal",
  ],
} as const;

// Fallback para composições legadas (sem variação)
const ANIMACOES_LEGADAS: Record<number, string[]> = {
  1: ["texto-explosao-centro", "titulo-particulas"],
  2: ["nos-conectados"],
  3: ["linha-tempo-animada"],
  4: ["texto-manuscrito", "fade-texto-flutuante"],
};

const DURACAO_POR_TIPO: Record<string, number> = {
  // Legadas
  "texto-explosao-centro": 7000,
  "titulo-particulas":     9000,
  "nos-conectados":        9000,
  "linha-tempo-animada":   8000,
  "texto-manuscrito":      6000,
  "fade-texto-flutuante":  4500,
  // Banco de variações — mapas mentais
  "mapas-v1": 9000, "mapas-v2": 9000, "mapas-v3": 9000, "mapas-v4": 9000,
  // Banco de variações — textos de impacto
  "textos-v1": 7000, "textos-v2": 7000, "textos-v3": 7000, "textos-v4": 7000,
  // Banco de variações — linha do tempo
  "linha-v1": 8000, "linha-v2": 8000, "linha-v3": 8000, "linha-v4": 8000,
  // Banco de variações — citações
  "citacoes-v1": 6000, "citacoes-v2": 7000, "citacoes-v3": 6000, "citacoes-v4": 7000,
  // Banco de variações — 3D (Three.js)
  "3d-globo-brasil": 9000, "3d-mapa-brasil": 9000, "3d-regiao-zoom": 9000,
  "3d-texto": 7000, "3d-grafico": 8000, "3d-esfera": 9000,
  "3d-titulo-epico": 9000, "3d-particulas-chuva": 9000, "3d-logo-reveal": 9000,
};

// Guarda a última variação usada por categoria para evitar repetição consecutiva
const ultimaVariacao: Record<string, string> = {};

function sortearVariacao(opcoes: readonly string[], categoriaKey: string): string {
  const ultima = ultimaVariacao[categoriaKey];
  const disponiveis = opcoes.length > 1 ? opcoes.filter(v => v !== ultima) : [...opcoes];
  const escolhida = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  ultimaVariacao[categoriaKey] = escolhida;
  return escolhida;
}

const MAPA_3D_MOMENTO: Record<string, readonly string[]> = {
  abertura_historia:       ["3d-titulo-epico", "3d-logo-reveal"],
  abertura_esperanca:      ["3d-titulo-epico", "3d-logo-reveal"],
  desfecho:                ["3d-particulas-chuva", "3d-titulo-epico"],
  climax_emocional:        ["3d-titulo-epico", "3d-particulas-chuva"],
  "clímax_emocional":      ["3d-titulo-epico", "3d-particulas-chuva"],
  conceito_explicacao:     ["3d-esfera", "3d-grafico", "3d-texto"],
  sequencia_temporal:      ["3d-grafico", "3d-texto"],
  reflexao_arrependimento: ["3d-esfera", "3d-texto"],
  reflexao_melancolia:     ["3d-esfera", "3d-particulas-chuva"],
};

function escolher3DParaMomento(tipoMomento: string): string {
  const opcoes = MAPA_3D_MOMENTO[tipoMomento] ?? VARIACOES.animacoes_3d;
  return sortearVariacao(opcoes, `3d_${tipoMomento}`);
}

export function resolverAnimacaoEditorial(
  tipoAnimacao: number,
  tipoMomento: string,
  indiceRemotion: number
): { tipo: string; duracao: number } {
  // Modo misto automático: usa preset baseado no tipo de momento
  // tipoAnimacao === 6 (3D) é excluído do early return e tratado abaixo
  if (tipoAnimacao !== 6 && (tipoAnimacao === 5 || !ANIMACOES_LEGADAS[tipoAnimacao])) {
    const presetKey = presetParaTipoMomento(tipoMomento);
    const preset = PRESETS[presetKey];
    return { tipo: preset.tipo, duracao: preset.duracao };
  }

  // Sorteia uma variação do banco correspondente à categoria escolhida
  let tipo: string;
  if (tipoAnimacao === 1) {
    tipo = sortearVariacao(VARIACOES.textos_impacto, "textos_impacto");
  } else if (tipoAnimacao === 2) {
    tipo = sortearVariacao(VARIACOES.mapas_mentais, "mapas_mentais");
  } else if (tipoAnimacao === 3) {
    tipo = sortearVariacao(VARIACOES.linha_tempo, "linha_tempo");
  } else if (tipoAnimacao === 6) {
    tipo = escolher3DParaMomento(tipoMomento);
    console.log(`→ Composição 3D sorteada: ${tipo}`);
  } else {
    tipo = sortearVariacao(VARIACOES.citacoes, "citacoes");
  }

  return { tipo, duracao: DURACAO_POR_TIPO[tipo] ?? 7000 };
}
