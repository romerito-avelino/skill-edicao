// IDs dos presets conferidos contra Remotion/src/Root.tsx em 2026-06-07

// ─── Tipos do DNA visual ─────────────────────────────────────────────────────

export type Energia      = "lenta" | "media" | "rapida" | "explosiva";
export type Estilo       = "cinematografico" | "documental" | "dramatico" | "minimalista";
export type Complexidade = 1 | 2 | 3;

export interface DNAVisual {
  energia:      Energia;
  estilo:       Estilo;
  complexidade: Complexidade;
}

export interface ResultadoAnimacao extends DNAVisual {
  tipo:    string;
  duracao: number;
}

// ─── Presets editoriais (IDs alinhados com Root.tsx) ─────────────────────────

export const PRESETS = {
  ABERTURA:    { duracao: 9000, tipo: "titulo-particulas",     energia: "explosiva" as Energia, estilo: "cinematografico" as Estilo, complexidade: 3 as Complexidade },
  IMPACTO:     { duracao: 7000, tipo: "texto-explosao-centro", energia: "rapida"    as Energia, estilo: "dramatico"       as Estilo, complexidade: 2 as Complexidade },
  CITACAO:     { duracao: 6000, tipo: "texto-manuscrito",      energia: "lenta"     as Energia, estilo: "minimalista"     as Estilo, complexidade: 1 as Complexidade },
  TRANSICAO:   { duracao: 4500, tipo: "fade-texto-flutuante",  energia: "media"     as Energia, estilo: "documental"      as Estilo, complexidade: 1 as Complexidade },
  MAPA_MENTAL: { duracao: 9000, tipo: "nos-conectados",        energia: "media"     as Energia, estilo: "documental"      as Estilo, complexidade: 3 as Complexidade },
  TIMELINE:    { duracao: 8000, tipo: "linha-tempo-animada",   energia: "media"     as Energia, estilo: "documental"      as Estilo, complexidade: 2 as Complexidade },
  GRAFICO:     { duracao: 8000, tipo: "3d-grafico",            energia: "media"     as Energia, estilo: "documental"      as Estilo, complexidade: 3 as Complexidade },
  MAPA_GEO:    { duracao: 9000, tipo: "3d-mapa-brasil",        energia: "lenta"     as Energia, estilo: "cinematografico" as Estilo, complexidade: 3 as Complexidade },
} as const;

export type PresetKey = keyof typeof PRESETS;
export type Preset    = (typeof PRESETS)[PresetKey];

// ─── Mapa: tipo de momento → preset editorial ─────────────────────────────────

const MAPA_TIPO_MOMENTO: Record<string, PresetKey> = {
  // Momentos originais
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
  // Novos momentos narrativos
  dado_estatistico:          "MAPA_MENTAL",
  localizacao_geografica:    "TIMELINE",
  dialogo_personagem:        "CITACAO",
  acao_dramatica:            "IMPACTO",
  contexto_historico:        "TIMELINE",
  confronto:                 "IMPACTO",
  descoberta:                "ABERTURA",
  virada_narrativa:          "IMPACTO",
  pausa_reflexiva:           "CITACAO",
  introducao_personagem:     "ABERTURA",
};

export function presetParaTipoMomento(tipoMomento: string): PresetKey {
  if (MAPA_TIPO_MOMENTO[tipoMomento]) return MAPA_TIPO_MOMENTO[tipoMomento];
  if (/^abertura_/.test(tipoMomento))     return "ABERTURA";
  if (/^cl[ií]max_/.test(tipoMomento))    return "IMPACTO";
  if (/^acao_/.test(tipoMomento))         return "IMPACTO";
  if (/^reflexao_/.test(tipoMomento))     return "CITACAO";
  if (/^dialogo_/.test(tipoMomento))      return "CITACAO";
  if (/^transicao_/.test(tipoMomento))    return "TRANSICAO";
  if (/^conceito_/.test(tipoMomento))     return "MAPA_MENTAL";
  if (/^sequencia_/.test(tipoMomento))    return "TIMELINE";
  if (/^contexto_/.test(tipoMomento))     return "TIMELINE";
  if (/^dado_/.test(tipoMomento))         return "GRAFICO";
  if (/^localizacao_/.test(tipoMomento))  return "MAPA_GEO";
  return "CITACAO";
}

// ─── Ken Burns ────────────────────────────────────────────────────────────────

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

// ─── Banco de variações (IDs alinhados com Root.tsx) ─────────────────────────

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

// ─── Mapeamento tipoFrase → templates com sorteio sem repetição ───────────────

const VARIACOES_POR_TIPO_FRASE: ReadonlyArray<{
  padrao: RegExp | string;
  opcoes: readonly string[];
}> = [
  { padrao: /^reflexao_/,       opcoes: ["citacoes-v1", "citacoes-v2", "citacoes-v3"] },
  { padrao: /^cl[ií]max_/,      opcoes: ["textos-v4",   "textos-v1",  "3d-titulo-epico"] },
  { padrao: /^abertura_/,       opcoes: ["3d-titulo-epico", "textos-v1", "citacoes-v4"] },
  { padrao: /^transicao_/,      opcoes: ["linha-v1",    "linha-v2",   "fade-texto-flutuante"] },
  { padrao: /^conceito_/,       opcoes: ["mapas-v1",    "mapas-v2",   "mapas-v3"] },
  { padrao: /^sequencia_/,      opcoes: ["linha-v1",    "linha-v3",   "linha-v4"] },
  { padrao: "dado_estatistico", opcoes: ["3d-grafico",  "mapas-v2"] },
];

const OPCOES_PADRAO_POR_TIPO_FRASE = ["citacoes-v2", "textos-v2"] as const;

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
  // Mapas mentais
  "mapas-v1": 9000, "mapas-v2": 9000, "mapas-v3": 9000, "mapas-v4": 9000,
  // Textos de impacto
  "textos-v1": 7000, "textos-v2": 7000, "textos-v3": 7000, "textos-v4": 7000,
  // Linha do tempo
  "linha-v1": 8000, "linha-v2": 8000, "linha-v3": 8000, "linha-v4": 8000,
  // Citações
  "citacoes-v1": 6000, "citacoes-v2": 7000, "citacoes-v3": 6000, "citacoes-v4": 7000,
  // 3D mapas
  "3d-globo-brasil": 9000, "3d-mapa-brasil": 9000, "3d-regiao-zoom": 9000,
  // 3D objetos
  "3d-texto": 7000, "3d-grafico": 8000, "3d-esfera": 9000,
  // 3D abertura
  "3d-titulo-epico": 9000, "3d-particulas-chuva": 9000, "3d-logo-reveal": 9000,
};

// ─── DNA visual por tipo (banco de variações) ─────────────────────────────────

const DNA_POR_TIPO: Record<string, DNAVisual> = {
  // Mapas mentais
  "mapas-v1": { energia: "media",     estilo: "documental",      complexidade: 2 },
  "mapas-v2": { energia: "lenta",     estilo: "cinematografico", complexidade: 3 },
  "mapas-v3": { energia: "media",     estilo: "dramatico",       complexidade: 2 },
  "mapas-v4": { energia: "rapida",    estilo: "cinematografico", complexidade: 3 },
  // Textos de impacto
  "textos-v1": { energia: "rapida",    estilo: "documental",      complexidade: 1 },
  "textos-v2": { energia: "explosiva", estilo: "dramatico",       complexidade: 2 },
  "textos-v3": { energia: "media",     estilo: "minimalista",     complexidade: 1 },
  "textos-v4": { energia: "explosiva", estilo: "cinematografico", complexidade: 2 },
  // Linha do tempo
  "linha-v1": { energia: "media",     estilo: "documental",      complexidade: 2 },
  "linha-v2": { energia: "lenta",     estilo: "minimalista",     complexidade: 2 },
  "linha-v3": { energia: "media",     estilo: "cinematografico", complexidade: 3 },
  "linha-v4": { energia: "media",     estilo: "documental",      complexidade: 3 },
  // Citações
  "citacoes-v1": { energia: "lenta",  estilo: "documental",      complexidade: 1 },
  "citacoes-v2": { energia: "lenta",  estilo: "minimalista",     complexidade: 1 },
  "citacoes-v3": { energia: "media",  estilo: "dramatico",       complexidade: 2 },
  "citacoes-v4": { energia: "media",  estilo: "cinematografico", complexidade: 2 },
  // 3D mapas
  "3d-globo-brasil": { energia: "lenta",     estilo: "cinematografico", complexidade: 3 },
  "3d-mapa-brasil":  { energia: "media",     estilo: "documental",      complexidade: 3 },
  "3d-regiao-zoom":  { energia: "lenta",     estilo: "documental",      complexidade: 3 },
  // 3D objetos
  "3d-texto":   { energia: "media",     estilo: "cinematografico", complexidade: 2 },
  "3d-grafico": { energia: "media",     estilo: "documental",      complexidade: 3 },
  "3d-esfera":  { energia: "lenta",     estilo: "cinematografico", complexidade: 3 },
  // 3D abertura
  "3d-titulo-epico":     { energia: "explosiva", estilo: "cinematografico", complexidade: 3 },
  "3d-particulas-chuva": { energia: "rapida",    estilo: "dramatico",       complexidade: 3 },
  "3d-logo-reveal":      { energia: "lenta",     estilo: "cinematografico", complexidade: 3 },
};

const DNA_FALLBACK: DNAVisual = { energia: "media", estilo: "documental", complexidade: 2 };

// ─── Sorteio sem repetição consecutiva ───────────────────────────────────────

const ultimaVariacao: Record<string, string> = {};

function sortearVariacao(opcoes: readonly string[], categoriaKey: string): string {
  const ultima     = ultimaVariacao[categoriaKey];
  const disponiveis = opcoes.length > 1 ? opcoes.filter(v => v !== ultima) : [...opcoes];
  const escolhida  = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  ultimaVariacao[categoriaKey] = escolhida;
  return escolhida;
}

// ─── Seleção 3D contextual ────────────────────────────────────────────────────

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
  // Novos momentos
  dado_estatistico:       ["3d-grafico", "3d-texto"],
  localizacao_geografica: ["3d-globo-brasil", "3d-mapa-brasil", "3d-regiao-zoom"],
  acao_dramatica:         ["3d-titulo-epico", "3d-particulas-chuva"],
  contexto_historico:     ["3d-grafico", "3d-texto"],
  introducao_personagem:  ["3d-titulo-epico", "3d-logo-reveal"],
  confronto:              ["3d-particulas-chuva", "3d-titulo-epico"],
  descoberta:             ["3d-logo-reveal", "3d-titulo-epico"],
  pausa_reflexiva:        ["3d-esfera", "3d-texto"],
};

function escolher3DParaMomento(tipoMomento: string): string {
  const opcoes = MAPA_3D_MOMENTO[tipoMomento] ?? VARIACOES.animacoes_3d;
  return sortearVariacao(opcoes, `3d_${tipoMomento}`);
}

// ─── Seleciona template pelo tipoFrase (sorteio sem repetição consecutiva) ───

export function resolverAnimacaoPorTipoFrase(tipoFrase: string): ResultadoAnimacao {
  let opcoes: readonly string[] = OPCOES_PADRAO_POR_TIPO_FRASE;

  for (const entrada of VARIACOES_POR_TIPO_FRASE) {
    const bate = typeof entrada.padrao === "string"
      ? tipoFrase === entrada.padrao
      : entrada.padrao.test(tipoFrase);
    if (bate) { opcoes = entrada.opcoes; break; }
  }

  const tipo    = sortearVariacao(opcoes, `tpf_${tipoFrase}`);
  const duracao = DURACAO_POR_TIPO[tipo]  ?? 7000;
  const dna     = DNA_POR_TIPO[tipo]      ?? DNA_FALLBACK;
  return { tipo, duracao, ...dna };
}

// ─── Resolver animação editorial (retorna DNA completo) ───────────────────────

export function resolverAnimacaoEditorial(
  tipoAnimacao: number,
  tipoMomento: string,
  _indiceRemotion: number
): ResultadoAnimacao {
  // Modo misto (5) ou tipo sem banco → seleciona pelo tipoFrase
  if (tipoAnimacao !== 6 && (tipoAnimacao === 5 || !ANIMACOES_LEGADAS[tipoAnimacao])) {
    return resolverAnimacaoPorTipoFrase(tipoMomento);
  }

  // Sorteia variação do banco correspondente à categoria
  let tipo: string;
  if (tipoAnimacao === 1) {
    tipo = sortearVariacao(VARIACOES.textos_impacto, "textos_impacto");
  } else if (tipoAnimacao === 2) {
    // Usa tipoFrase para variedade real entre categorias
    return resolverAnimacaoPorTipoFrase(tipoMomento);
  } else if (tipoAnimacao === 3) {
    tipo = sortearVariacao(VARIACOES.linha_tempo,    "linha_tempo");
  } else if (tipoAnimacao === 6) {
    tipo = escolher3DParaMomento(tipoMomento);
    console.log(`→ Composição 3D sorteada: ${tipo}`);
  } else {
    tipo = sortearVariacao(VARIACOES.citacoes, "citacoes");
  }

  const duracao = DURACAO_POR_TIPO[tipo] ?? 7000;
  const dna     = DNA_POR_TIPO[tipo]     ?? DNA_FALLBACK;
  return { tipo, duracao, ...dna };
}

// ─── DNA visual contextual ─────────────────────────────────────────────────────

export function obterDNAVisual(tipoMomento: string, _tomEmocional: string): {
  energia: string; estilo: string; complexidade: number;
} {
  const presetKey = presetParaTipoMomento(tipoMomento);
  const preset = PRESETS[presetKey] as any;
  return {
    energia:      preset.energia      ?? "media",
    estilo:       preset.estilo       ?? "documental",
    complexidade: preset.complexidade ?? 2,
  };
}
