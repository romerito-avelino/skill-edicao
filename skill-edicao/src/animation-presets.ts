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

// Mapeamento de categoria editorial (tipoAnimacao 1-4) para listas de composições
const ANIMACOES_CATEGORIA: Record<number, string[]> = {
  1: ["texto-explosao-centro", "titulo-particulas"],
  2: ["nos-conectados"],
  3: ["linha-tempo-animada"],
  4: ["texto-manuscrito", "fade-texto-flutuante"],
};

const DURACAO_POR_TIPO: Record<string, number> = {
  "texto-explosao-centro": 7000,
  "titulo-particulas":     9000,
  "nos-conectados":        9000,
  "linha-tempo-animada":   8000,
  "texto-manuscrito":      6000,
  "fade-texto-flutuante":  4500,
};

export function resolverAnimacaoEditorial(
  tipoAnimacao: number,
  tipoMomento: string,
  indiceRemotion: number
): { tipo: string; duracao: number } {
  if (tipoAnimacao === 5 || !ANIMACOES_CATEGORIA[tipoAnimacao]) {
    const presetKey = presetParaTipoMomento(tipoMomento);
    const preset = PRESETS[presetKey];
    return { tipo: preset.tipo, duracao: preset.duracao };
  }
  const opcoes = ANIMACOES_CATEGORIA[tipoAnimacao];
  const tipo = opcoes[indiceRemotion % opcoes.length];
  return { tipo, duracao: DURACAO_POR_TIPO[tipo] ?? 7000 };
}
