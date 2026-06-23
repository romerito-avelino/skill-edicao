import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { lerMetadadosTemplate } from "./hyperframes-templates";

const PASTA_COMPOSITIONS = path.resolve(
  __dirname, "..", "..", "HyperFrames", "myproject", "compositions"
);
const PASTA_BACKUP = path.join(PASTA_COMPOSITIONS + "-backup");
const PASTA_TEMP = path.resolve(__dirname, "..", "temp");

const TODOS_TEMPLATES = [
  "macos-tahoe-liquid-glass",
  "vfx-liquid-background",
  "app-showcase",
  "vpn-youtube-spot",
];

// Aceita lista de templates via args: ts-node variabilizar-cirurgico.ts nome1 nome2
// Sem args: processa todos
const argsTemplates = process.argv.slice(2).filter(a => !a.startsWith("-"));
const TEMPLATES_ALVO = argsTemplates.length > 0 ? argsTemplates : TODOS_TEMPLATES;

interface VariavelIdentificada {
  id: string;
  type: "string" | "number" | "color";
  label: string;
  default: string | number;
  varOriginalNoScript: string;
}

interface BlocoScript {
  conteudo: string;        // conteúdo entre <script> e </script>
  tagAbre: string;         // a tag <script...> completa
  indiceInicio: number;    // posição no HTML original onde <script> começa
  indiceFim: number;       // posição no HTML original onde </script> termina (exclusivo)
}

// Localiza o único <script> inline (sem src=) que contém window.__timelines.
// Navega de trás para frente a partir da posição do assignment.
function extrairScriptPrincipal(html: string): BlocoScript | null {
  const CLOSE_TAG = "</script>";
  const tlPos = html.indexOf("window.__timelines");
  if (tlPos === -1) return null;

  // Busca o último <script sem src= que precede window.__timelines
  let searchPos = tlPos;
  let scriptStart = -1;
  let tagAbre = "";

  while (searchPos > 0) {
    const idx = html.lastIndexOf("<script", searchPos - 1);
    if (idx === -1) break;

    const tagEnd = html.indexOf(">", idx);
    if (tagEnd === -1) break;

    const fullTag = html.substring(idx, tagEnd + 1);

    // Pula <script src="..."> — são imports externos
    if (!/src\s*=/i.test(fullTag)) {
      scriptStart = idx;
      tagAbre = fullTag;
      break;
    }

    searchPos = idx;
  }

  if (scriptStart === -1) return null;

  // Fecha no </script> mais próximo APÓS window.__timelines
  const closePos = html.indexOf(CLOSE_TAG, tlPos);
  if (closePos === -1) return null;

  const conteudoInicio = scriptStart + tagAbre.length;
  return {
    conteudo: html.substring(conteudoInicio, closePos),
    tagAbre,
    indiceInicio: scriptStart,
    indiceFim: closePos + CLOSE_TAG.length,
  };
}

// Primeiras N linhas do HTML como amostra para a Chamada 1.
// Cobre head, meta e início do body com elementos visíveis.
function extrairAmostraHtml(html: string, maxLinhas = 120): string {
  return html.split("\n").slice(0, maxLinhas).join("\n");
}

async function chamarApi(prompt: string, descricao: string, maxTokens: number): Promise<string> {
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const content = msg.content[0];
  if (content.type !== "text") throw new Error(`Resposta inesperada em ${descricao}`);
  return content.text.trim();
}

function limparMarkdown(texto: string): string {
  let r = texto;
  if (r.startsWith("```")) r = r.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim();
  return r;
}

// ── Chamada 1: identifica variáveis ──────────────────────────────────────────
async function identificarVariaveis(
  nome: string,
  script: string,
  amostraHtml: string
): Promise<VariavelIdentificada[]> {
  const prompt = `Você é especialista em HyperFrames/GSAP. Analise o script de animação e a amostra HTML abaixo.

Identifique textos visíveis, cores e valores numéricos que deveriam se tornar variáveis configuráveis no template "${nome}".

=== SCRIPT PRINCIPAL ===
${script}

=== AMOSTRA HTML (primeiras linhas — estrutura e elementos visíveis) ===
${amostraHtml}

Retorne APENAS um array JSON válido, sem markdown, sem explicações:
[
  {
    "id": "nomeVar",
    "type": "string|number|color",
    "label": "Nome legível para editor",
    "default": "valor atual exato",
    "varOriginalNoScript": "como esse valor aparece literalmente no script (ex: nome da const ou o texto fixo entre aspas)"
  }
]

Regras:
- Tipos: "string" para textos, "color" para hex (#RRGGBB), "number" para valores numéricos configuráveis
- IDs para cores devem ser camelCase terminando em "Color" (ex: "bgColor", "textColor")
- Não inclua variáveis internas de GSAP/animação — só o que um editor de vídeo mudaria
- Entre 3 e 20 variáveis
- "default" deve ser o valor EXATO que aparece no script/HTML agora`;

  const resposta = await chamarApi(prompt, `identificar variáveis de ${nome}`, 2048);
  const json = limparMarkdown(resposta);

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("não é array");
    return parsed as VariavelIdentificada[];
  } catch (e) {
    throw new Error(`JSON inválido em identificarVariaveis(${nome}): ${String(e)}\nResposta recebida: ${resposta.substring(0, 400)}`);
  }
}

// ── Chamada 2: reescreve o <script> (chunk único para scripts ≤400 linhas) ────
async function reescreverScriptUnico(
  nome: string,
  script: string,
  variaveis: VariavelIdentificada[]
): Promise<string> {
  const prompt = `Você é especialista em HyperFrames/GSAP. Reescreva APENAS o bloco de script abaixo, substituindo os valores fixos identificados no array de variáveis por leituras de window.__hyperframes.getVariables().

=== VARIÁVEIS A APLICAR ===
${JSON.stringify(variaveis, null, 2)}

=== SCRIPT ORIGINAL (reescreva este bloco inteiro) ===
${script}

REGRAS ABSOLUTAS — leia com atenção:
1. A linha window.__timelines["${nome}"] = tl; deve ser mantida EXATAMENTE como está
2. Toda a lógica GSAP (tl.to, tl.from, tl.fromTo, tl.set, callbacks) deve ser mantida INTACTA
3. Adicione NO INÍCIO do script (antes de qualquer outra declaração):
   const vars = window.__hyperframes?.getVariables() ?? {};
4. Para cada variável do array, declare ANTES da sua primeira referência:
   const nomeVar = vars.id ?? defaultValue;
   (use o campo "varOriginalNoScript" para identificar onde está no script)
5. Substitua APENAS as ocorrências do valor original pelo nome da constante criada
6. NÃO altere: nomes de funções, IDs de elementos DOM, classes CSS, seletores querySelector
7. Retorne APENAS o conteúdo do script (sem as tags <script></script>, sem markdown)
8. O script de saída deve ter comprimento PRÓXIMO ao original — não comprima nem expanda`;

  const resposta = await chamarApi(prompt, `reescrever script de ${nome}`, 8192);
  const resultado = limparMarkdown(resposta);

  if (!resultado.includes("window.__timelines")) {
    throw new Error(`script reescrito de ${nome} perdeu window.__timelines`);
  }

  return resultado;
}

// ── Chamada 2 (modo 2-chunks): para scripts grandes demais para saída única ──
// Limiar: >400 linhas → divide ao meio.
// Chunk A (primeira metade): recebe as declarações de variáveis e substitui valores
// Chunk B (segunda metade): mantém window.__timelines intacto, substitui remanescentes
const LIMIAR_CHUNK = 400;

async function reescreverScriptEmChunks(
  nome: string,
  script: string,
  variaveis: VariavelIdentificada[]
): Promise<string> {
  const linhas = script.split("\n");
  const meio = Math.ceil(linhas.length / 2);
  const chunkA = linhas.slice(0, meio).join("\n");
  const chunkB = linhas.slice(meio).join("\n");

  const varsJson = JSON.stringify(variaveis, null, 2);

  console.log(`    Split: chunk A ${meio} linhas | chunk B ${linhas.length - meio} linhas`);

  // Chunk A: adiciona declarações + substitui primeira metade
  const promptA = `Você é especialista em HyperFrames/GSAP. Modifique a PRIMEIRA METADE deste script para suportar variáveis HyperFrames.

=== VARIÁVEIS A APLICAR ===
${varsJson}

=== PRIMEIRA METADE DO SCRIPT ===
${chunkA}

REGRAS:
1. Adicione NO INÍCIO do script:
   const vars = window.__hyperframes?.getVariables() ?? {};
2. Logo após, declare TODAS as variáveis do array (mesmo que nem todas sejam usadas neste chunk):
   const nomeVar = vars.id ?? defaultValue;
3. Substitua as ocorrências dos valores originais pelas constantes declaradas
4. NÃO altere estrutura, nomes de funções, seletores DOM, lógica GSAP
5. Retorne APENAS o conteúdo modificado, sem tags <script>, sem markdown`;

  const respostaA = await chamarApi(promptA, `chunk A de ${nome}`, 8192);
  const chunkAModificado = limparMarkdown(respostaA);
  console.log(`    Chunk A: ${chunkAModificado.split("\n").length} linhas`);

  await sleep(1500);

  // Chunk B: mantém window.__timelines, substitui remanescentes
  const promptB = `Você é especialista em HyperFrames/GSAP. Modifique a SEGUNDA METADE deste script.
A PRIMEIRA metade já declarou:
  const vars = window.__hyperframes?.getVariables() ?? {};
  (+ todas as constantes de variáveis)

=== VARIÁVEIS JÁ DECLARADAS NA PRIMEIRA METADE ===
${varsJson}

=== SEGUNDA METADE DO SCRIPT ===
${chunkB}

REGRAS:
1. NÃO redeclare vars nem as constantes de variáveis — já estão na primeira metade
2. A linha window.__timelines["${nome}"] = tl; deve ser mantida EXATAMENTE como está
3. Substitua apenas as ocorrências restantes dos valores originais pelas constantes
4. Mantenha toda a lógica GSAP (tl.to, tl.from, tl.set…) INTACTA
5. Retorne APENAS o conteúdo modificado, sem tags <script>, sem markdown`;

  const respostaB = await chamarApi(promptB, `chunk B de ${nome}`, 8192);
  const chunkBModificado = limparMarkdown(respostaB);
  console.log(`    Chunk B: ${chunkBModificado.split("\n").length} linhas`);

  const scriptFinal = chunkAModificado + "\n" + chunkBModificado;

  if (!scriptFinal.includes("window.__timelines")) {
    throw new Error(`script em chunks de ${nome} perdeu window.__timelines`);
  }

  return scriptFinal;
}

// Wrapper: escolhe chunk único ou em partes com base no tamanho
async function reescreverScript(
  nome: string,
  script: string,
  variaveis: VariavelIdentificada[]
): Promise<string> {
  const linhas = script.split("\n").length;
  if (linhas > LIMIAR_CHUNK) {
    console.log(`  Script grande (${linhas} linhas) → modo 2-chunks`);
    return reescreverScriptEmChunks(nome, script, variaveis);
  }
  return reescreverScriptUnico(nome, script, variaveis);
}

// ── Injeta data-composition-variables no elemento que tem data-composition-id ─
function injetarVariaveisNoHtml(html: string, variaveis: VariavelIdentificada[]): string {
  // Strip campo interno varOriginalNoScript antes de serializar para o HTML
  const payload = variaveis.map(({ varOriginalNoScript: _drop, ...v }) => v);
  const json = JSON.stringify(payload);
  // Em String.replace(), $ no texto de substituição tem significado especial ($1, $&, $$…).
  // Escapamos todo $ → $$ para que valores como "$189.84" não sejam interpretados como
  // backreferences de grupo de captura, o que corromperia o JSON injetado.
  const jsonSeguro = json.replace(/\$/g, "$$$$");
  // Usa aspas simples no atributo; JSON usa duplas internamente, portanto sem conflito
  return html.replace(
    /(data-composition-id="[^"]*")/,
    `$1 data-composition-variables='${jsonSeguro}'`
  );
}

// ── Pipeline completo para um template ───────────────────────────────────────
async function variabilizarCirurgico(nome: string): Promise<ResultadoCirurgico> {
  const backupPath = path.join(PASTA_BACKUP, `${nome}.html`);
  const destPath   = path.join(PASTA_COMPOSITIONS, `${nome}.html`);

  if (!fs.existsSync(backupPath)) {
    return resultado(false, 0, 0, false, false, 0, "backup não encontrado");
  }

  const htmlOriginal  = fs.readFileSync(backupPath, "utf-8");
  const linhasOriginal = htmlOriginal.split("\n").length;
  console.log(`  Linhas do backup: ${linhasOriginal}`);

  // PASSO 1 — Extração do script
  const bloco = extrairScriptPrincipal(htmlOriginal);
  if (!bloco) {
    return resultado(false, linhasOriginal, 0, false, false, 0, "script com window.__timelines não encontrado");
  }
  const linhasScript = bloco.conteudo.split("\n").length;
  console.log(`  Script principal: ${linhasScript} linhas (offset ${bloco.indiceInicio}–${bloco.indiceFim})`);

  // PASSO 2 — Amostra HTML para contexto visual
  const amostraHtml = extrairAmostraHtml(htmlOriginal, 120);

  // PASSO 3 — Chamada 1: identificar variáveis
  console.log(`  [1/2] Identificando variáveis...`);
  let variaveis: VariavelIdentificada[];
  try {
    variaveis = await identificarVariaveis(nome, bloco.conteudo, amostraHtml);
    console.log(`  → ${variaveis.length} variável(eis) identificada(s)`);
    for (const v of variaveis) {
      console.log(`      ${v.id.padEnd(24)} [${v.type.padEnd(6)}]  default: ${JSON.stringify(v.default).substring(0, 50)}`);
    }
  } catch (e) {
    return resultado(false, linhasOriginal, 0, false, false, 0, String(e));
  }

  await sleep(1500);

  // PASSO 4 — Chamada 2: reescrever script
  console.log(`  [2/2] Reescrevendo script (${linhasScript} linhas → API max_tokens:8192)...`);
  let scriptNovo: string;
  try {
    scriptNovo = await reescreverScript(nome, bloco.conteudo, variaveis);
    console.log(`  → Script reescrito: ${scriptNovo.split("\n").length} linhas`);
  } catch (e) {
    return resultado(false, linhasOriginal, 0, false, false, variaveis.length, String(e));
  }

  // PASSO 5 — Montagem cirúrgica (sem API)
  const scriptFinal  = bloco.tagAbre + scriptNovo + "</script>";
  const htmlNovoScript =
    htmlOriginal.substring(0, bloco.indiceInicio) +
    scriptFinal +
    htmlOriginal.substring(bloco.indiceFim);

  const htmlFinal = injetarVariaveisNoHtml(htmlNovoScript, variaveis);

  // PASSO 6 — Validação
  const temTimeline       = htmlFinal.includes("window.__timelines");
  const temFechamentoHtml = /\<\/html\s*\>/i.test(htmlFinal.trimEnd());
  const linhasFinal       = htmlFinal.split("\n").length;

  if (!temTimeline || !temFechamentoHtml) {
    const motivos = [
      !temTimeline       ? "perdeu window.__timelines" : "",
      !temFechamentoHtml ? "sem </html>" : "",
    ].filter(Boolean).join("; ");
    return resultado(false, linhasOriginal, linhasFinal, temTimeline, temFechamentoHtml, variaveis.length, motivos);
  }

  // Salva
  fs.writeFileSync(destPath, htmlFinal, "utf-8");
  console.log(`  ✓ Salvo (${linhasFinal} linhas | delta vs backup: ${linhasFinal - linhasOriginal})`);

  // lerMetadadosTemplate
  const meta = lerMetadadosTemplate(nome, true);
  const numDetectadas = meta?.variaveis.length ?? 0;
  if (numDetectadas === 0) {
    console.warn(`  ⚠ lerMetadadosTemplate: 0 variáveis detectadas — verifique o JSON`);
  } else {
    console.log(`  lerMetadadosTemplate: ${numDetectadas} variável(eis) OK`);
    meta!.variaveis.slice(0, 4).forEach(v =>
      console.log(`      ${v.id} [${v.type}] = ${JSON.stringify(v.default).substring(0, 40)}`)
    );
    if (meta!.variaveis.length > 4) console.log(`      ... +${meta!.variaveis.length - 4}`);
  }

  return resultado(true, linhasOriginal, linhasFinal, temTimeline, temFechamentoHtml, numDetectadas);
}

interface ResultadoCirurgico {
  sucesso: boolean;
  linhasOriginal: number;
  linhasFinal: number;
  temTimeline: boolean;
  temFechamentoHtml: boolean;
  numVariaveis: number;
  erro?: string;
}

// helper só para reduzir repetição de objeto
function resultado(
  sucesso: boolean,
  linhasOriginal: number,
  linhasFinal: number,
  temTimeline: boolean,
  temFechamentoHtml: boolean,
  numVariaveis: number,
  erro?: string
): ResultadoCirurgico {
  const r: ResultadoCirurgico = { sucesso, linhasOriginal, linhasFinal, temTimeline, temFechamentoHtml, numVariaveis };
  if (erro !== undefined) r.erro = erro;
  return r;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n═══ VARIABILIZAÇÃO CIRÚRGICA ═══\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY não definida no .env");
    process.exit(1);
  }

  fs.mkdirSync(PASTA_TEMP, { recursive: true });

  type Linha = ResultadoCirurgico & { nome: string };
  const linhas: Linha[] = [];

  for (let i = 0; i < TEMPLATES_ALVO.length; i++) {
    const nome = TEMPLATES_ALVO[i];
    console.log(`\n[${ i + 1}/${ TEMPLATES_ALVO.length }] ══ ${nome} ══`);

    try {
      const r = await variabilizarCirurgico(nome);
      linhas.push({ nome, ...r });
      if (!r.sucesso) console.error(`  ✗ ${r.erro}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ Erro inesperado: ${msg}`);
      linhas.push({ nome, ...resultado(false, 0, 0, false, false, 0, msg) });
    }

    if (i < TEMPLATES_ALVO.length - 1) {
      console.log(`\n  Aguardando 2s antes do próximo...`);
      await sleep(2000);
    }
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  console.log("\n\n═══ RELATÓRIO FINAL ═══\n");
  const H = `${"Template".padEnd(32)} ${"Status".padEnd(12)} ${"Original".padEnd(10)} ${"Final".padEnd(8)} ${"TL".padEnd(4)} ${"HTML".padEnd(6)} Vars`;
  console.log(" " + H);
  console.log(" " + "─".repeat(H.length));

  for (const r of linhas) {
    const s = r.sucesso ? "✓ sucesso" : "✗ falhou";
    const orig  = String(r.linhasOriginal);
    const fin   = String(r.linhasFinal || "—");
    const tl    = r.temTimeline       ? "✓" : "✗";
    const ht    = r.temFechamentoHtml ? "✓" : "✗";
    console.log(` ${r.nome.padEnd(32)} ${s.padEnd(12)} ${orig.padEnd(10)} ${fin.padEnd(8)} ${tl.padEnd(4)} ${ht.padEnd(6)} ${r.numVariaveis}`);
    if (r.erro) console.log(`   ↳ ${r.erro}`);
  }

  const sucesso    = linhas.filter(r => r.sucesso).length;
  const falhou     = linhas.filter(r => !r.sucesso).length;
  console.log(`\n  Sucesso: ${sucesso} | Falhou: ${falhou}`);

  fs.writeFileSync(
    path.join(PASTA_TEMP, "relatorio-cirurgico.json"),
    JSON.stringify({ geradoEm: new Date().toISOString(), linhas }, null, 2),
    "utf-8"
  );
  console.log(`  Relatório: ${PASTA_TEMP}\\relatorio-cirurgico.json\n`);
}

main().catch(e => { console.error("Erro fatal:", e); process.exit(1); });
