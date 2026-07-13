import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { ConfigCanal } from "./planner";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export interface ResultadoRenderizacao {
  sucesso: boolean;
  arquivo_saida: string;
  erro?: string;
}

export interface ContextoRenderizacao {
  frase?: string;
  tom?: string;
  pontoAtual?: string;
  pontosAnteriores?: string[];
  noAtual?: string;
  nosAnteriores?: string[];
  temaCentral?: string;
  progresso?: number;
}

let bundleUrl: string | null = null;
const BUNDLE_DIR = path.resolve(__dirname, "../bundle-cache");

async function obterBundle(): Promise<string> {
  if (bundleUrl) return bundleUrl;

  const { bundle } = await import("@remotion/bundler");
  const entry_point = path.resolve(
    __dirname, "..", "..", "Remotion", "src", "index.ts"
  );

  if (!fs.existsSync(BUNDLE_DIR)) {
    fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  }

  bundleUrl = await bundle({
    entryPoint: entry_point,
    outDir: BUNDLE_DIR,
    onProgress: (progress) => {
      if (progress === 100) console.log("    ✓ Bundle compilado");
    },
  });

  return bundleUrl;
}

function imagemParaBase64DataUrl(caminhoImagem: string): string {
  const buffer = fs.readFileSync(caminhoImagem);
  const base64 = buffer.toString("base64");
  const ext = path.extname(caminhoImagem).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

export async function renderizarKenBurns(
  imagem_path: string,
  arquivo_saida: string,
  duracao_ms: number,
  direcao: "zoom_in" | "zoom_out" | "pan_direita" | "pan_esquerda" = "zoom_in"
): Promise<ResultadoRenderizacao> {
  try {
    const duracao_final = Math.max(3000, duracao_ms);
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const bundle = await obterBundle();
    const fps = 30;
    const durationInFrames = Math.ceil((duracao_final / 1000) * fps);

    const pasta_saida = path.dirname(arquivo_saida);
    if (!fs.existsSync(pasta_saida)) {
      fs.mkdirSync(pasta_saida, { recursive: true });
    }

    const imagemDataUrl = imagemParaBase64DataUrl(imagem_path);

    const props = {
      imagemUrl: imagemDataUrl,
      direcao,
      intensidade: 1.08,
      vinheta: true,
      grain: false,
    };

    const composition = await selectComposition({
      serveUrl: bundle,
      id: "KenBurns",
      inputProps: props,
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps,
        width: 1920,
        height: 1080,
      },
      serveUrl: bundle,
      codec: "h264",
      outputLocation: arquivo_saida,
      inputProps: props,
      logLevel: "error",
    });

    console.log(`    ✓ KenBurns: ${path.basename(arquivo_saida)}`);
    return { sucesso: true, arquivo_saida };

  } catch (erro: any) {
    console.log(`    ✗ KenBurns falhou: ${erro.message?.substring(0, 80)}`);
    return { sucesso: false, arquivo_saida: "", erro: erro.message };
  }
}

export async function renderizarFraseImpacto(
  texto: string,
  arquivo_saida: string,
  duracao_ms: number,
  estilo: "agressivo" | "duvidoso" | "esperancoso" = "agressivo",
  compositionId: string = "FraseImpacto",
  contexto?: ContextoRenderizacao,
  canal?: ConfigCanal
): Promise<ResultadoRenderizacao> {
  try {
    const duracao_final = Math.max(3000, duracao_ms);
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const bundle = await obterBundle();
    const fps = 30;
    const durationInFrames = Math.ceil((duracao_final / 1000) * fps);

    const pasta_saida = path.dirname(arquivo_saida);
    if (!fs.existsSync(pasta_saida)) {
      fs.mkdirSync(pasta_saida, { recursive: true });
    }

    const estilos = {
      agressivo: {
        corTexto: "#FFFFFF",
        corFundo: "rgba(0,0,0,0.92)",
        tamanhoFonte: 76,
        animacao: "palavra_por_palavra" as const,
      },
      duvidoso: {
        corTexto: "#F5E6D3",
        corFundo: "rgba(20,10,5,0.88)",
        tamanhoFonte: 68,
        animacao: "fade_bloco" as const,
      },
      esperancoso: {
        corTexto: "#D4A853",
        corFundo: "rgba(44,24,16,0.90)",
        tamanhoFonte: 72,
        animacao: "fade_bloco" as const,
      },
    };

    const config = estilos[estilo];

    const props = {
      texto,
      corTexto: canal?.paleta.texto ?? config.corTexto,
      corFundo: canal?.paleta.fundo ?? config.corFundo,
      corDestaque: canal?.paleta.destaque ?? "#F5C842",
      tamanhoFonte: config.tamanhoFonte,
      animacao: config.animacao,
      fundoUrl: "",
      // Contexto narrativo (campos opcionais usados pelas composições cumulativas)
      frase: contexto?.frase ?? texto,
      tom: contexto?.tom ?? estilo,
      pontoAtual: contexto?.pontoAtual ?? "",
      pontosAnteriores: contexto?.pontosAnteriores ?? [],
      noAtual: contexto?.noAtual ?? "",
      nosAnteriores: contexto?.nosAnteriores ?? [],
      temaCentral: contexto?.temaCentral ?? "",
      progresso: contexto?.progresso ?? 0,
    };

    // Tenta o compositionId do preset; cai em FraseImpacto se não existir
    const idFinal = compositionId && compositionId !== "none" ? compositionId : "FraseImpacto";
    const composition = await selectComposition({ serveUrl: bundle, id: idFinal, inputProps: props })
      .catch(() => selectComposition({ serveUrl: bundle, id: "FraseImpacto", inputProps: props }));

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps,
        width: 1920,
        height: 1080,
      },
      serveUrl: bundle,
      codec: "h264",
      outputLocation: arquivo_saida,
      inputProps: props,
      logLevel: "error",
    });

    console.log(`    ✓ Remotion (${idFinal}/${estilo}): ${path.basename(arquivo_saida)}`);
    return { sucesso: true, arquivo_saida };

  } catch (erro: any) {
    console.log(`    ✗ Remotion falhou: ${erro.message?.substring(0, 80)}`);
    return { sucesso: false, arquivo_saida: "", erro: erro.message };
  }
}

export interface PropsTemplate {
  texto: string;
  frase?: string;
  corTexto: string;
  corFundo: string;
  corDestaque: string;
  corPrimaria?: string;
  tamanhoFonte: number;
  animacao: string;
  fundoUrl: string;
  tom?: string;
  progresso?: number;
  noAtual?: string;
  nosAnteriores?: string[];
  temaCentral?: string;
  pontoAtual?: string;
  pontosAnteriores?: string[];
  dados?: number[];
  labels?: string[];
  estado?: string;
  regiao?: string;
  [key: string]: unknown;
}

export async function renderizarTemplateExistente(params: {
  compositionId: string;
  outputPath: string;
  durationInFrames: number;
  props: PropsTemplate;
}): Promise<"ok" | "erro"> {
  try {
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const bundle = await obterBundle();
    const fps = 30;

    const pastaSaida = path.dirname(params.outputPath);
    if (!fs.existsSync(pastaSaida)) {
      fs.mkdirSync(pastaSaida, { recursive: true });
    }

    const composition = await selectComposition({
      serveUrl: bundle,
      id: params.compositionId,
      inputProps: params.props,
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: params.durationInFrames,
        fps,
        width: 1920,
        height: 1080,
      },
      serveUrl: bundle,
      codec: "h264",
      outputLocation: params.outputPath,
      inputProps: params.props,
      logLevel: "error",
    });

    console.log(`    ✓ Template (${params.compositionId}): ${path.basename(params.outputPath)}`);
    return "ok";

  } catch (erro: any) {
    console.error(`    ✗ Template (${params.compositionId}) falhou: ${erro.message?.substring(0, 120)}`);
    return "erro";
  }
}

export function montarPropsTemplate(params: {
  texto: string;
  paleta: { primaria: string; secundaria: string; destaque: string; texto: string; fundo: string; };
  tom: string;
  tamanhoFonte?: number;
  dadosExtras?: Record<string, any>;
}): PropsTemplate {
  return {
    texto: params.texto,
    frase: params.texto,
    corTexto: params.paleta.texto,
    corFundo: params.paleta.fundo,
    corDestaque: params.paleta.destaque,
    corPrimaria: params.paleta.primaria,
    tamanhoFonte: params.tamanhoFonte ?? 64,
    animacao: "fade_bloco",
    fundoUrl: "",
    tom: params.tom,
    progresso: 0,
    noAtual: "",
    nosAnteriores: [],
    temaCentral: "",
    pontoAtual: "",
    pontosAnteriores: [],
    ...params.dadosExtras,
  };
}
