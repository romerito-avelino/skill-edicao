import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { listarTemplatesDisponiveis, lerMetadadosTemplate } from "./hyperframes-templates";

const PASTA_COMPOSITIONS = path.resolve(
  __dirname, "..", "..", "HyperFrames", "myproject", "compositions"
);
const PASTA_BACKUP = path.join(PASTA_COMPOSITIONS + "-backup");
const PASTA_TEMP = path.resolve(__dirname, "..", "temp");
const RELATORIO_JSON = path.join(PASTA_TEMP, "relatorio-variabilizacao.json");

interface ResultadoTemplate {
  nome: string;
  status: "variabilizado" | "ja-tem-variaveis" | "sem-composition-id" | "erro";
  variaveis?: { id: string; type: string; label: string; default: unknown }[];
  erro?: string;
}

function resolverCaminhoHtml(nome: string): string | null {
  const candidatos = [
    path.join(PASTA_COMPOSITIONS, `${nome}.html`),
    path.join(PASTA_COMPOSITIONS, "components", `${nome}.html`),
  ];
  return candidatos.find(p => fs.existsSync(p)) ?? null;
}

function temVariaveis(html: string): boolean {
  return /data-composition-variables\s*=/.test(html);
}

function temCompositionId(html: string): boolean {
  return /data-composition-id\s*=/.test(html);
}

function fazerBackup(nome: string, caminho: string): void {
  const relativo = caminho.startsWith(path.join(PASTA_COMPOSITIONS, "components"))
    ? path.join("components", `${nome}.html`)
    : `${nome}.html`;
  const destino = path.join(PASTA_BACKUP, relativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(caminho, destino);
}

function contarVariaveis(html: string): number {
  const m = html.match(/data-composition-variables\s*=\s*(?:'([^']*)'|"([^"]*)")/);
  if (!m) return 0;
  try {
    const raw = m[1] ?? m[2] ?? "";
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (typeof parsed === "object" && parsed !== null) return Object.keys(parsed).length;
    return 0;
  } catch {
    return 0;
  }
}

async function variabilizarComClaude(nome: string, htmlOriginal: string): Promise<string> {
  const originalTemTimeline = htmlOriginal.includes("window.__timelines");
  const client = new Anthropic();

  const prompt = `Você é especialista em HyperFrames. Analise este template HTML e adicione declarações de variáveis (data-composition-variables) no elemento <html> raiz, SEM alterar a estrutura, animação ou lógica GSAP existente.

IDENTIFIQUE e transforme em variáveis:
- Todos os textos visíveis (títulos, labels, frases)
- Cores principais usadas (background, texto, destaque)
- Valores numéricos exibidos (se houver: dados de gráfico, contadores)
- URLs de imagens/vídeos de exemplo (se houver assets fixos)

Para cada texto/cor identificado:
1. Declare a variável em data-composition-variables com id, type, label, default (usando o valor atual como default)
2. Substitua o valor fixo no HTML por uma leitura via window.__hyperframes.getVariables() no script
3. Mantenha TUDO o resto idêntico (timing, GSAP, CSS, estrutura)

O formato de data-composition-variables deve ser um array JSON, exemplo:
data-composition-variables='[{"id":"texto","type":"string","label":"Texto","default":"Valor atual"},{"id":"corFundo","type":"color","label":"Cor de Fundo","default":"#000000"}]'

O atributo deve ser adicionado no mesmo elemento <html> onde já existe data-composition-id.

Para ler as variáveis no script, use o padrão:
  const vars = window.__hyperframes?.getVariables() ?? {};
  const texto = vars.texto ?? "Valor padrão";

TEMPLATE ATUAL:
${htmlOriginal}

Retorne APENAS o HTML completo modificado, sem markdown, sem explicações.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const content = msg.content[0];
  if (content.type !== "text") throw new Error("Resposta inesperada da API");

  let resultado = content.text.trim();

  // Remove marcadores markdown caso Claude os inclua mesmo pedindo para não
  if (resultado.startsWith("```html")) resultado = resultado.slice(7);
  else if (resultado.startsWith("```")) resultado = resultado.slice(3);
  if (resultado.endsWith("```")) resultado = resultado.slice(0, -3);

  resultado = resultado.trim();

  if (originalTemTimeline && !resultado.includes("window.__timelines")) {
    console.warn(`\n⚠ POSSÍVEL TRUNCAMENTO em ${nome} — resposta pode estar incompleta`);
    console.warn(`  (original tinha window.__timelines mas a resposta não tem)\n`);
  }

  return resultado;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("\n═══ VARIABILIZADOR DE TEMPLATES HYPERFRAMES ═══\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY não definida no .env");
    process.exit(1);
  }

  fs.mkdirSync(PASTA_BACKUP, { recursive: true });
  fs.mkdirSync(PASTA_TEMP, { recursive: true });

  const todos = listarTemplatesDisponiveis();
  const resultados: ResultadoTemplate[] = [];

  // Filtrar: só os que NÃO têm caption-texture (já tem variáveis)
  const paraProcessar: string[] = [];
  const pulados: string[] = [];

  for (const nome of todos) {
    const caminho = resolverCaminhoHtml(nome);
    if (!caminho) continue;
    const html = fs.readFileSync(caminho, "utf-8");
    if (temVariaveis(html)) {
      pulados.push(nome);
      resultados.push({ nome, status: "ja-tem-variaveis" });
    } else if (!temCompositionId(html)) {
      console.log(`⚠ ${nome}: sem data-composition-id — pulando`);
      resultados.push({ nome, status: "sem-composition-id" });
    } else {
      paraProcessar.push(nome);
    }
  }

  console.log(`Templates a variabilizar: ${paraProcessar.length}`);
  console.log(`Já com variáveis (pulados): ${pulados.join(", ") || "nenhum"}\n`);

  for (let i = 0; i < paraProcessar.length; i++) {
    const nome = paraProcessar[i];
    const caminho = resolverCaminhoHtml(nome)!;
    const html = fs.readFileSync(caminho, "utf-8");

    console.log(`[${i + 1}/${paraProcessar.length}] Processando: ${nome}...`);

    try {
      fazerBackup(nome, caminho);

      const htmlModificado = await variabilizarComClaude(nome, html);

      fs.writeFileSync(caminho, htmlModificado, "utf-8");

      const n = contarVariaveis(htmlModificado);
      console.log(`  ✓ ${nome} variabilizado (${n} variável${n !== 1 ? "eis" : ""})`);

      resultados.push({ nome, status: "variabilizado" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${nome}: ${msg}`);
      resultados.push({ nome, status: "erro", erro: msg });
    }

    if (i < paraProcessar.length - 1) {
      await sleep(1000);
    }
  }

  // ─── Teste de metadados em todos os processados ───────────────────────────
  console.log("\n═══ VERIFICANDO METADADOS ═══\n");

  for (const r of resultados) {
    if (r.status !== "variabilizado") continue;
    const meta = lerMetadadosTemplate(r.nome, true);
    if (meta && meta.variaveis.length > 0) {
      r.variaveis = meta.variaveis.map(v => ({
        id: v.id,
        type: v.type,
        label: v.label,
        default: v.default,
      }));
      console.log(`  ✓ ${r.nome}: ${meta.variaveis.length} variável(eis) detectada(s)`);
    } else {
      console.warn(`  ⚠ ${r.nome}: variáveis NÃO detectadas pelo lerMetadadosTemplate`);
    }
  }

  // ─── Relatório final ──────────────────────────────────────────────────────
  const relatorio = {
    geradoEm: new Date().toISOString(),
    total: resultados.length,
    variabilizados: resultados.filter(r => r.status === "variabilizado").length,
    jaComVariaveis: resultados.filter(r => r.status === "ja-tem-variaveis").length,
    semCompositionId: resultados.filter(r => r.status === "sem-composition-id").length,
    erros: resultados.filter(r => r.status === "erro").length,
    templates: resultados,
  };

  fs.writeFileSync(RELATORIO_JSON, JSON.stringify(relatorio, null, 2), "utf-8");

  console.log("\n═══ RESUMO ═══\n");
  console.log(`  Variabilizados:      ${relatorio.variabilizados}`);
  console.log(`  Já tinham variáveis: ${relatorio.jaComVariaveis}`);
  console.log(`  Sem composition-id:  ${relatorio.semCompositionId}`);
  console.log(`  Erros:               ${relatorio.erros}`);
  console.log(`\n  Relatório salvo em: ${RELATORIO_JSON}`);
  console.log(`  Backup em:          ${PASTA_BACKUP}\n`);
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
