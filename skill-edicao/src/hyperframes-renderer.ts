import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const HYPERFRAMES_PROJECT = path.resolve(__dirname, "..", "..", "HyperFrames", "myproject");
const COMPOSITIONS_DIR = path.join(HYPERFRAMES_PROJECT, "compositions");

// Apenas templates com window.__timelines ou data-track-index (renderizáveis standalone).
// CSS-only snippets (vignette, parallax-zoom, parallax-unzoom, grid-pixelate-wipe) foram removidos.
const MAPA_TEMPLATE_MOMENTO: Record<string, string[]> = {
  abertura_historia:       ["vfx-liquid-background", "morph-text"],
  climax_emocional:        ["vfx-shatter", "caption-kinetic-slam"],
  reflexao_melancolia:     ["caption-texture", "caption-editorial-emphasis"],
  reflexao_arrependimento: ["caption-editorial-emphasis", "caption-texture"],
  transicao_historia:      ["cinematic-zoom", "transitions-3d"],
  dado_estatistico:        ["data-chart", "apple-money-count"],
  localizacao_geografica:  ["world-map", "north-korea-locked-down"],
  abertura_esperanca:      ["caption-neon-accent", "caption-editorial-emphasis"],
  dialogo_personagem:      ["yt-lower-third", "caption-blend-difference"],
  conceito_explicacao:     ["flowchart", "caption-parallax-layers"],
  virada_narrativa:        ["vfx-magnetic", "caption-kinetic-slam"],
  pausa_reflexiva:         ["caption-parallax-layers", "caption-texture"],
  confronto:               ["vfx-shatter", "caption-kinetic-slam"],
  descoberta:              ["vfx-magnetic", "morph-text"],
  introducao_personagem:   ["yt-lower-third", "caption-editorial-emphasis"],
  sequencia_temporal:      ["transitions-3d", "flowchart"],
};

const TEMPLATES_FALLBACK = ["caption-editorial-emphasis", "morph-text"];

let ultimoTemplate: string | null = null;

function escolherTemplate(tipoMomento: string): string {
  const opcoes = MAPA_TEMPLATE_MOMENTO[tipoMomento] ?? TEMPLATES_FALLBACK;
  const candidatos = opcoes.length > 1 && ultimoTemplate
    ? opcoes.filter(t => t !== ultimoTemplate)
    : opcoes;
  const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
  ultimoTemplate = escolhido;
  return escolhido;
}

function encontrarHtml(templateName: string): string | null {
  for (const dir of [COMPOSITIONS_DIR, path.join(COMPOSITIONS_DIR, "components")]) {
    const p = path.join(dir, `${templateName}.html`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Adapta o HTML retornado pela API para ser renderizável sob o novo compositionId:
// 1. Substitui data-composition-id pelo novo id
// 2. Atualiza data-duration para a duração do clip
// 3. Atualiza a chave window.__timelines["old-id"] para o novo id
function adaptarHtml(html: string, compositionId: string, duracaoSeg: string): string {
  // Captura o id original antes de qualquer substituição
  const originalIdMatch = html.match(/data-composition-id="([^"]*)"/);
  const originalId = originalIdMatch?.[1] ?? null;

  let resultado = html
    .replace(/data-composition-id="[^"]*"/g, `data-composition-id="${compositionId}"`)
    .replace(/data-duration="[^"]*"/g, `data-duration="${duracaoSeg}"`);

  if (originalId) {
    const escaped = originalId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    resultado = resultado.replace(
      new RegExp(`window\\.__timelines\\["${escaped}"\\]`, "g"),
      `window.__timelines["${compositionId}"]`
    );
  }

  return resultado;
}

function execAsync(comando: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(comando, { timeout: 300000, cwd }, (err, stdout, stderr) => {
      if (err) {
        console.log("  Comando:", comando);
        console.log("  Stderr:", stderr);
        console.log("  Stdout:", stdout);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function renderizarHyperFrames(params: {
  clipId: string;
  fraseImpacto: string;
  descricaoVisual: string;
  elementosVisuais: string[];
  atmosfera: string;
  estiloFundo: string;
  tipoMomento: string;
  paleta: {
    primaria: string;
    secundaria: string;
    destaque: string;
    texto: string;
    fundo: string;
  };
  duracao: number;
  outputPath: string;
}): Promise<"ok" | "fallback" | "erro"> {
  try {
    const templateName = escolherTemplate(params.tipoMomento);
    const htmlPath = encontrarHtml(templateName);

    if (!htmlPath) {
      console.log(`  ✗ HyperFrames (${params.clipId}): template '${templateName}' não encontrado`);
      return "fallback";
    }

    console.log(`  Template selecionado: ${templateName}`);

    const htmlBase = fs.readFileSync(htmlPath, "utf-8");
    const duracaoSeg = (params.duracao / 1000).toFixed(1);

    console.log(`  Chamando API para adaptar...`);
    const client = new Anthropic();
    const resposta = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `Você é especialista em HyperFrames (HTML+GSAP para vídeo).

TAREFA: Adapte o template abaixo para a cena descrita.
Faça APENAS ajustes cirúrgicos — não reescreva do zero.

=== TEMPLATE BASE ===
${htmlBase}

=== ADAPTAÇÕES NECESSÁRIAS ===
Frase principal: ${params.fraseImpacto}
Atmosfera: ${params.atmosfera}
Descrição visual: ${params.descricaoVisual}
Elementos: ${params.elementosVisuais.join(", ")}
Estilo (inspiração): ${params.estiloFundo}
Duração: ${duracaoSeg}s

PALETA:
Primária: ${params.paleta.primaria}
Destaque: ${params.paleta.destaque}
Texto: ${params.paleta.texto}
Fundo: ${params.paleta.fundo}

REGRAS:
- Mantenha toda a estrutura GSAP intacta
- Substitua apenas textos, cores e timing
- Retorne APENAS o HTML adaptado, sem markdown`,
      }],
    });

    const htmlAdaptado = resposta.content[0].type === "text"
      ? resposta.content[0].text.trim()
      : null;

    if (!htmlAdaptado) {
      console.log(`  ✗ HyperFrames (${params.clipId}): resposta vazia da API`);
      return "fallback";
    }

    // Corrige composition-id, data-duration e window.__timelines key
    const compositionId = `clip-${params.clipId}`;
    const htmlFinal = adaptarHtml(htmlAdaptado, compositionId, duracaoSeg);

    const htmlSaida = path.join(COMPOSITIONS_DIR, `${compositionId}.html`);
    fs.writeFileSync(htmlSaida, htmlFinal, "utf-8");

    const pastaSaida = path.dirname(params.outputPath);
    if (!fs.existsSync(pastaSaida)) fs.mkdirSync(pastaSaida, { recursive: true });

    console.log(`  Renderizando via CLI...`);
    const projectArg = HYPERFRAMES_PROJECT.replace(/\\/g, "/");
    const outputArg = params.outputPath.replace(/\\/g, "/");
    const comando = `npx hyperframes@0.6.110 render "${projectArg}" --composition "compositions/${compositionId}.html" --output "${outputArg}"`;

    await execAsync(comando, HYPERFRAMES_PROJECT);

    console.log(`  ✓ HyperFrames (${templateName}/${params.clipId}): ${path.basename(params.outputPath)}`);
    return "ok";

  } catch (erro: any) {
    console.log(`  ✗ HyperFrames (${params.clipId}): ${String(erro?.message ?? "").substring(0, 120)}`);
    return "fallback";
  }
}
