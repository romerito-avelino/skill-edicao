import * as fs from "fs";
import * as path from "path";
import { parsearSRT, resumirSRT, Segmento } from "./srt-parser";
import { processarTodosSegmentos, InfoCanal, PaletaThumbnail, SegmentoProcessado, TipoAsset } from "./visual-selector";
import { ConfigEditorial } from "./editorial";
import { kenBurnsParaTom, resolverAnimacaoEditorial } from "./animation-presets";

export interface ConfigCanal {
  id: string;
  nome: string;
  tipoPadrao: string;
  paleta: {
    primaria: string;
    secundaria: string;
    destaque: string;
    texto: string;
    fundo: string;
  };
  persona: string;
  estiloNarrativo: string;
  tomProibido?: string[];
  gatilhos?: string[];
  publicoAlvo?: string;
  nicho?: string;
}

export interface ConfigProjeto {
  nome: string;
  pasta: string;
  srtArquivo: string;
  pacoteDadosArquivo: string;
  thumbArquivo: string;
  canal?: ConfigCanal;
  pasta_saida?: string;
}

export interface PlanoSegmento {
  numero: number;
  segmentoId: string;
  clipId: string;
  inicio: string;
  fim: string;
  texto: string;
  terco: "agressivo" | "duvidoso" | "esperancoso";
  tipoVisual: TipoAsset;
  queryPexels: string | null;
  promptImagem: string | null;
  animacao: string;
  tipoFrase: string;
  fraseImpacto: string | null;
  duracao: number;
  observacoes: string;
}

export interface PlanoEdicao {
  projeto: string;
  geradoEm: string;
  configEditorial: ConfigEditorial;
  segmentos: PlanoSegmento[];
}

function msParaSRT(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
}

function normalizarTerco(terco: string): "agressivo" | "duvidoso" | "esperancoso" {
  if (terco === "agressivo") return "agressivo";
  if (terco === "duvidoso") return "duvidoso";
  return "esperancoso";
}

function ferramentasAtivas(config: ConfigEditorial): TipoAsset[] {
  const f: TipoAsset[] = [];
  if (config.usarVideoStock) f.push("video_stock");
  if (config.usarImagemIA)   f.push("imagem_ia");
  if (config.usarRemotion)   f.push("remotion_animacao");
  return f.length > 0 ? f : ["video_stock", "imagem_ia", "remotion_animacao"];
}

function escolherTipo(
  tipoMomento: string,
  ferramentas: TipoAsset[],
  indiceSegmento: number
): TipoAsset {
  if (ferramentas.length === 1) return ferramentas[0];

  if (ferramentas.length === 3) {
    const temRemotion   = ferramentas.includes("remotion_animacao");
    const temImagemIA   = ferramentas.includes("imagem_ia");
    const temVideoStock = ferramentas.includes("video_stock");

    if (/^abertura_|^cl[ií]max_|^desfecho/.test(tipoMomento) && temRemotion) {
      return "remotion_animacao";
    }
    if (/^reflexao_|^conceito_/.test(tipoMomento) && temImagemIA) {
      return "imagem_ia";
    }
    if (temVideoStock) return "video_stock";
    return ferramentas[0];
  }

  // 2 ferramentas: alternância respeitando tipo de cena
  const [a, b] = ferramentas;
  const preferencias: Partial<Record<string, TipoAsset>> = {};
  if (ferramentas.includes("remotion_animacao")) {
    preferencias.abertura = "remotion_animacao";
    preferencias.climax   = "remotion_animacao";
    preferencias.desfecho = "remotion_animacao";
  }
  if (ferramentas.includes("imagem_ia")) {
    preferencias.reflexao = "imagem_ia";
    preferencias.conceito = "imagem_ia";
  }

  const prefixo = tipoMomento.split("_")[0];
  if (preferencias[prefixo] && ferramentas.includes(preferencias[prefixo]!)) {
    return preferencias[prefixo]!;
  }
  return indiceSegmento % 2 === 0 ? a : b;
}

function derivarDados(
  clipOriginal: any,
  novoTipo: TipoAsset,
  textoSegmento: string
): { queryPexels: string | null; promptImagem: string | null; fraseImpacto: string | null } {
  let queryPexels: string | null = null;
  let promptImagem: string | null = null;
  let fraseImpacto: string | null = null;

  if (novoTipo === "video_stock") {
    queryPexels = clipOriginal.queries?.[0] ?? null;
    promptImagem = clipOriginal.fallback_prompt ?? clipOriginal.prompt ?? null;
  } else if (novoTipo === "imagem_ia") {
    promptImagem = clipOriginal.prompt ?? clipOriginal.fallback_prompt ?? null;
    if (!promptImagem) promptImagem = clipOriginal.queries?.[0] ?? null;
  } else {
    fraseImpacto = clipOriginal.texto_animado ?? null;
    if (!fraseImpacto) {
      const primeira = textoSegmento.split(/[.!?]/)[0].trim();
      fraseImpacto = primeira.length > 5 ? primeira : textoSegmento.substring(0, 60);
    }
  }

  return { queryPexels, promptImagem, fraseImpacto };
}

function calcularCotas(
  totalClips: number,
  ferramentas: TipoAsset[],
  distribuicao: ConfigEditorial["distribuicao"]
): Record<string, number> {
  const cotas: Record<string, number> = {
    video_stock: 0,
    remotion_animacao: 0,
    imagem_ia: 0,
  };

  for (const f of ferramentas) {
    cotas[f] = Math.round(totalClips * distribuicao[f as keyof typeof distribuicao] / 100);
  }

  // Corrige arredondamento: ajusta a ferramenta com maior % para bater o total
  const somaAtual = Object.values(cotas).reduce((a, b) => a + b, 0);
  const diff = totalClips - somaAtual;
  if (diff !== 0) {
    const maior = ferramentas.reduce((a, b) =>
      distribuicao[a as keyof typeof distribuicao] >= distribuicao[b as keyof typeof distribuicao] ? a : b
    );
    cotas[maior] += diff;
  }

  return cotas;
}

function escolherTipoEspacado(
  tipoPreferido: TipoAsset,
  ferramentas: TipoAsset[],
  cotas: Record<string, number>,
  usados: Record<string, number>,
  posicaoGlobal: number,
  totalClips: number
): TipoAsset {
  if (ferramentas.length === 1) return ferramentas[0];

  const deficit = (f: TipoAsset): number => {
    const esperado = cotas[f] * (posicaoGlobal + 1) / totalClips;
    return esperado - (usados[f] || 0);
  };

  const disponiveis = ferramentas.filter(f => (usados[f] || 0) < cotas[f]);
  if (disponiveis.length === 0) return tipoPreferido;

  // Usa o tipo preferido se ele não está significativamente adiantado
  if (disponiveis.includes(tipoPreferido) && deficit(tipoPreferido) > -0.5) {
    return tipoPreferido;
  }

  // Escolhe a ferramenta com maior déficit (mais atrasada em relação à cota)
  return disponiveis.reduce((melhor, f) => deficit(f) > deficit(melhor) ? f : melhor);
}

function calcularPosicoesRemotion(totalClips: number, cotaRemotion: number): Set<number> {
  const posicoes = new Set<number>();
  if (cotaRemotion <= 0) return posicoes;
  const intervalo = totalClips / cotaRemotion;
  for (let i = 0; i < cotaRemotion; i++) {
    posicoes.add(Math.floor((i + 0.5) * intervalo));
  }
  return posicoes;
}

function mapearParaPlano(
  segmentosProcessados: SegmentoProcessado[],
  segmentos: Segmento[],
  config: ConfigEditorial
): PlanoSegmento[] {
  const plano: PlanoSegmento[] = [];
  const ferramentas = ferramentasAtivas(config);

  const totalClips = segmentosProcessados.reduce((acc, sp) => acc + sp.clips.length, 0);
  const cotas = calcularCotas(totalClips, ferramentas, config.distribuicao);
  const usados: Record<string, number> = { video_stock: 0, remotion_animacao: 0, imagem_ia: 0 };

  // Pré-calcula posições uniformes para Remotion: um a cada ~(total/cota) clips,
  // começando no meio do primeiro intervalo — evita concentração no início/fim.
  const posicoesRemotion = calcularPosicoesRemotion(totalClips, cotas["remotion_animacao"] ?? 0);
  const ferramentasSemRemotion = ferramentas.filter(f => f !== "remotion_animacao") as TipoAsset[];

  let numero = 1;
  let posicaoGlobal = 0;
  let indiceRemotion = 0;

  for (const sp of segmentosProcessados) {
    const original = segmentos.find(s => s.id === sp.id);
    const terco = normalizarTerco(sp.terco);

    // Bug 1: herdados do clip -01 para clips subsequentes do mesmo segmento
    let herdadoQueryPexels: string | null = null;
    let herdadoPromptImagem: string | null = null;
    let herdadoFraseImpacto: string | null = null;

    for (const clip of sp.clips) {
      const clipInicio = sp.inicio_ms + (clip.inicio_relativo_ms || 0);
      const clipFim    = sp.inicio_ms + (clip.fim_relativo_ms || sp.duracao_ms);

      let tipoFinal: TipoAsset;
      if (!ferramentas.includes("remotion_animacao")) {
        const tipoPreferido = escolherTipo(sp.tipo_momento, ferramentas, posicaoGlobal);
        tipoFinal = escolherTipoEspacado(tipoPreferido, ferramentas, cotas, usados, posicaoGlobal, totalClips);
      } else if (posicoesRemotion.has(posicaoGlobal)) {
        tipoFinal = "remotion_animacao";
      } else if (ferramentasSemRemotion.length > 0) {
        const tipoPreferido = escolherTipo(sp.tipo_momento, ferramentasSemRemotion, posicaoGlobal);
        tipoFinal = escolherTipoEspacado(tipoPreferido, ferramentasSemRemotion, cotas, usados, posicaoGlobal, totalClips);
      } else {
        tipoFinal = "remotion_animacao";
      }

      let { queryPexels, promptImagem, fraseImpacto } = derivarDados(
        clip, tipoFinal, original?.texto ?? sp.texto
      );

      // Bug 1: herda do clip -01 se os campos estiverem nulos
      if (!queryPexels)  queryPexels  = herdadoQueryPexels;
      if (!promptImagem) promptImagem = herdadoPromptImagem;
      if (!fraseImpacto) fraseImpacto = herdadoFraseImpacto;

      // Atualiza herdados para clips seguintes
      if (queryPexels)  herdadoQueryPexels  = queryPexels;
      if (promptImagem) herdadoPromptImagem = promptImagem;
      if (fraseImpacto) herdadoFraseImpacto = fraseImpacto;

      // Fallback último recurso: gera query/prompt baseado no texto do segmento
      if (tipoFinal === "video_stock" && !queryPexels) {
        queryPexels = (original?.texto ?? sp.texto)
          .replace(/[^\w\s]/g, " ")
          .trim()
          .split(/\s+/)
          .slice(0, 5)
          .join(" ");
        herdadoQueryPexels = queryPexels;
      }
      if (tipoFinal === "imagem_ia" && !promptImagem) {
        const palavras = (original?.texto ?? sp.texto)
          .replace(/[^\w\s]/g, " ")
          .trim()
          .split(/\s+/)
          .slice(0, 5)
          .join(" ");
        promptImagem = `cinematic scene, ${palavras}, natural light, high quality`;
        herdadoPromptImagem = promptImagem;
      }

      let animacao = "none";
      let duracao = clip.duracao_ms;

      if (tipoFinal === "remotion_animacao") {
        const { tipo, duracao: d } = resolverAnimacaoEditorial(config.tipoAnimacao, sp.tipo_momento, indiceRemotion);
        animacao = tipo;
        duracao = d;
        indiceRemotion++;
      } else if (tipoFinal === "imagem_ia") {
        animacao = `kenburns_${kenBurnsParaTom(config.tomVisual, sp.tipo_momento)}`;
        duracao = Math.min(Math.max(clip.duracao_ms, 4000), 5000);
      } else {
        duracao = Math.min(Math.max(clip.duracao_ms, 4000), 5000);
      }

      plano.push({
        numero,
        segmentoId: sp.id,
        clipId: clip.clip_id,
        inicio: msParaSRT(clipInicio),
        fim: msParaSRT(clipFim),
        texto: original?.texto ?? sp.texto,
        terco,
        tipoVisual: tipoFinal,
        queryPexels,
        promptImagem,
        animacao,
        tipoFrase: sp.tipo_momento,
        fraseImpacto,
        duracao,
        observacoes: "",
      });

      usados[tipoFinal]++;
      posicaoGlobal++;
      numero++;
    }
  }

  return plano;
}

export async function planejar(
  config: ConfigProjeto,
  infoCanal: InfoCanal,
  paleta: PaletaThumbnail,
  configEditorial: ConfigEditorial
): Promise<void> {
  console.log("\n═══ FASE A: PLANEJAMENTO ═══");

  console.log("Lendo SRT...");
  const segmentos = parsearSRT(config.srtArquivo);
  resumirSRT(segmentos);

  console.log("\nAnalisando segmentos com IA visual-selector...");
  const segmentosProcessados = await processarTodosSegmentos(segmentos, infoCanal, paleta, configEditorial);

  const plano: PlanoEdicao = {
    projeto: config.nome,
    geradoEm: new Date().toISOString(),
    configEditorial,
    segmentos: mapearParaPlano(segmentosProcessados, segmentos, configEditorial),
  };

  const arquivo = path.join(config.pasta, "plano-edicao.json");
  fs.writeFileSync(arquivo, JSON.stringify(plano, null, 2), "utf-8");

  const totalClips = plano.segmentos.length;
  const porTipo = plano.segmentos.reduce((acc, s) => {
    acc[s.tipoVisual] = (acc[s.tipoVisual] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n✓ Plano salvo: ${arquivo}`);
  console.log(`  Total de clips: ${totalClips}`);
  for (const [tipo, count] of Object.entries(porTipo)) {
    console.log(`  ${tipo}: ${count}`);
  }
  console.log("\nRevise e edite o plano, depois execute com --executar");
}
