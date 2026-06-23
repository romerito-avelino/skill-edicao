import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import Anthropic from "@anthropic-ai/sdk";
import { lerMetadadosTemplate } from "./hyperframes-templates";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const HYPERFRAMES_PROJECT = path.resolve(__dirname, "..", "..", "HyperFrames", "myproject");
const COMPOSITIONS_DIR = path.join(HYPERFRAMES_PROJECT, "compositions");

// vfx-shatter excluído: depende de Canvas API experimental
// (ctx.drawElementImage) não suportada em Puppeteer headless.
// Sempre renderiza tela preta. Ver diagnóstico de 21/06/2026.
export const TEMPLATES_INCOMPATIVEIS = new Set(["vfx-shatter"]);

// Apenas templates com window.__timelines ou data-track-index (renderizáveis standalone).
// CSS-only snippets (vignette, parallax-zoom, parallax-unzoom, grid-pixelate-wipe) foram removidos.
export const MAPA_TEMPLATE_MOMENTO: Record<string, string[]> = {
  abertura_historia:       ["vfx-liquid-background", "morph-text"],
  climax_emocional:        ["vfx-magnetic", "caption-kinetic-slam"],
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
  confronto:               ["vfx-magnetic", "caption-kinetic-slam"],
  descoberta:              ["vfx-magnetic", "morph-text"],
  introducao_personagem:   ["yt-lower-third", "caption-editorial-emphasis"],
  sequencia_temporal:      ["transitions-3d", "flowchart"],
};

const TEMPLATES_FALLBACK = ["caption-editorial-emphasis", "morph-text"];

// Templates word-sequenciais (captions cinéticas) têm duração
// flexível pois cada palavra é um "slot" independente — podemos
// comprimir/expandir proporcionalmente sem quebrar a coreografia.
//
// Templates com timeline GSAP fixa (gráficos, mapas, transições)
// têm tempos coreografados entre elementos específicos — NÃO
// ajustamos a duração interna deles. Se a cena do roteiro tiver
// duração diferente da nativa do template, o ajuste deve ocorrer
// na montagem final (corte/freeze), não na composição HyperFrames.
export const TEMPLATES_COM_SLOTS_SEQUENCIAIS = new Set([
  "caption-editorial-emphasis",
  "caption-kinetic-slam",
  "caption-neon-accent",
  "caption-parallax-layers",
]);

let ultimoTemplate: string | null = null;

function escolherTemplate(tipoMomento: string): string {
  const opcoes = (MAPA_TEMPLATE_MOMENTO[tipoMomento] ?? TEMPLATES_FALLBACK)
    .filter(t => !TEMPLATES_INCOMPATIVEIS.has(t));
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
    .replace(/data-duration="[^"]*"/g, `data-duration="${duracaoSeg}"`)
    .replace(/data-width="[^"]*"/g, `data-width="1920"`)
    .replace(/data-height="[^"]*"/g, `data-height="1080"`);

  if (originalId) {
    const escaped = originalId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    resultado = resultado.replace(
      new RegExp(`window\\.__timelines\\["${escaped}"\\]`, "g"),
      `window.__timelines["${compositionId}"]`
    );
  }

  // Se data-composition-id está no <html> (não num div), injeta data-width/height lá também
  if (/<html[^>]*data-composition-id/i.test(resultado) && !/<html[^>]*data-width/i.test(resultado)) {
    resultado = resultado.replace(
      /(data-composition-id="[^"]*")/,
      `$1 data-width="1920" data-height="1080"`
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
  // Valores pré-aprovados pelo --revisar: pula a chamada à API do Claude
  templateAprovado?: string;
  variaveisAprovadas?: Record<string, unknown>;
}): Promise<"ok" | "fallback" | "erro"> {
  try {
    // ── PATH PRÉ-APROVADO: pula a API, injeta variáveis via --variables-file ──
    // Usamos --variables-file (arquivo JSON) em vez de --variables inline para
    // evitar problemas de escaping de aspas duplas no cmd.exe do Windows.
    if (params.templateAprovado && params.variaveisAprovadas) {
      const htmlPath = encontrarHtml(params.templateAprovado);
      if (!htmlPath) {
        console.log(`  ✗ HyperFrames (${params.clipId}): template aprovado '${params.templateAprovado}' não encontrado`);
        return "fallback";
      }

      // Lê o HTML original e garante data-width/data-height = 1920/1080 no elemento raiz.
      // HyperFrames lê as dimensões do elemento que tem data-composition-id. Neste template,
      // data-composition-id está no <html> (não no div interno), então adicionamos lá também.
      let htmlContent = fs.readFileSync(htmlPath, "utf-8");
      htmlContent = htmlContent
        .replace(/data-width="[^"]*"/g, `data-width="1920"`)
        .replace(/data-height="[^"]*"/g, `data-height="1080"`);
      // Se o <html> tem data-composition-id mas não tem data-width ainda, injeta lá
      if (/<html[^>]*data-composition-id/i.test(htmlContent) && !/<html[^>]*data-width/i.test(htmlContent)) {
        htmlContent = htmlContent.replace(
          /(data-composition-id="[^"]*")/,
          `$1 data-width="1920" data-height="1080"`
        );
      }

      // Para templates word-sequenciais: limpa slots não usados e ajusta duração proporcional
      let variaveisParaRender = { ...params.variaveisAprovadas };
      if (TEMPLATES_COM_SLOTS_SEQUENCIAIS.has(params.templateAprovado)) {
        const meta = lerMetadadosTemplate(params.templateAprovado, true);
        if (meta) {
          const wordVars = meta.variaveis
            .filter(v => /^word\d+$/i.test(v.id) || /^palavra\d+$/i.test(v.id))
            .sort((a, b) =>
              parseInt(a.id.replace(/\D+/g, ""), 10) - parseInt(b.id.replace(/\D+/g, ""), 10)
            );
          const numPalavrasReais = params.fraseImpacto.split(/\s+/).filter(Boolean).length;
          const totalSlotsWord = wordVars.length;
          wordVars.forEach((v, pos) => {
            if (pos >= numPalavrasReais) variaveisParaRender[v.id] = "";
          });
          // data-duration pode estar num elemento interno (não no root data-composition-id)
          const durationMatch = htmlContent.match(/data-duration="(\d+(?:\.\d+)?)"/);
          const duracaoOriginal = durationMatch ? parseFloat(durationMatch[1]) : null;
          if (duracaoOriginal !== null && totalSlotsWord > 0) {
            const duracaoAjustada = Math.max(
              3,
              Math.round((duracaoOriginal / totalSlotsWord) * numPalavrasReais) + 1
            );
            // Substitui data-duration nos elementos internos
            htmlContent = htmlContent.replace(/data-duration="[^"]*"/g, `data-duration="${duracaoAjustada}"`);
            // HyperFrames lê a duração do render do elemento com data-composition-id (<html>).
            // Se não tem data-duration lá, injeta junto aos outros atributos de dimensão.
            if (/<html[^>]*data-composition-id/i.test(htmlContent) && !/<html[^>]*data-duration/i.test(htmlContent)) {
              htmlContent = htmlContent.replace(
                /(data-composition-id="[^"]*")/,
                `$1 data-duration="${duracaoAjustada}"`
              );
            }
            console.log(`  Duração ajustada: ${duracaoAjustada}s (${numPalavrasReais}/${totalSlotsWord} slots, original: ${duracaoOriginal}s)`);
          }
        }
      }

      const tempHtmlFile = path.join(COMPOSITIONS_DIR, `clip-${params.clipId}.html`);
      fs.writeFileSync(tempHtmlFile, htmlContent, "utf-8");

      const relComposition = path.relative(HYPERFRAMES_PROJECT, tempHtmlFile).replace(/\\/g, "/");
      const pastaSaida = path.dirname(params.outputPath);
      if (!fs.existsSync(pastaSaida)) fs.mkdirSync(pastaSaida, { recursive: true });

      const tempVarsFile = path.join(HYPERFRAMES_PROJECT, `temp-vars-${params.clipId}.json`);
      fs.writeFileSync(tempVarsFile, JSON.stringify(variaveisParaRender), "utf-8");

      const variaveisJson = JSON.stringify(variaveisParaRender);
      console.log(`  Template pré-aprovado: ${params.templateAprovado} (sem API)`);
      console.log(`  Variáveis sendo enviadas: ${variaveisJson}`);

      try {
        const projectArg  = HYPERFRAMES_PROJECT.replace(/\\/g, "/");
        const outputArg   = params.outputPath.replace(/\\/g, "/");
        const varsFileArg = tempVarsFile.replace(/\\/g, "/");

        const comando = `npx hyperframes@0.6.110 render "${projectArg}" --composition "${relComposition}" --variables-file "${varsFileArg}" --output "${outputArg}"`;

        console.log(`  Comando completo: ${comando}`);
        await execAsync(comando, HYPERFRAMES_PROJECT);
      } finally {
        try { fs.unlinkSync(tempVarsFile); } catch { /* ignora erro de limpeza */ }
        try { fs.unlinkSync(tempHtmlFile); } catch { /* ignora erro de limpeza */ }
      }

      console.log(`  ✓ HyperFrames aprovado (${params.templateAprovado}/${params.clipId}): ${path.basename(params.outputPath)}`);
      return "ok";
    }

    // ── PATH AUTOMÁTICO: decide template e chama API do Claude ───────────────
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
