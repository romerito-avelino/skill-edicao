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

// Apenas os 4 templates confirmados como truncados
const TEMPLATES_ALVO = [
  "macos-tahoe-liquid-glass",
  "vfx-liquid-background",
  "app-showcase",
  "vpn-youtube-spot",
];

interface ResultadoRevariabilizacao {
  nome: string;
  status: "sucesso" | "truncado_novamente" | "erro";
  linhasResultado?: number;
  temTimeline?: boolean;
  temFechamentoHtml?: boolean;
  numVariaveis?: number;
  erro?: string;
}

function resolverCaminhoHtml(nome: string): string | null {
  const candidatos = [
    path.join(PASTA_COMPOSITIONS, `${nome}.html`),
    path.join(PASTA_COMPOSITIONS, "components", `${nome}.html`),
  ];
  return candidatos.find(p => fs.existsSync(p)) ?? null;
}

function fazerBackup(nome: string, caminho: string): void {
  const relativo = caminho.startsWith(path.join(PASTA_COMPOSITIONS, "components"))
    ? path.join("components", `${nome}.html`)
    : `${nome}.html`;
  const destino = path.join(PASTA_BACKUP, relativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(caminho, destino);
}

function validarResultado(nome: string, html: string): {
  temTimeline: boolean;
  temFechamentoHtml: boolean;
  truncado: boolean;
  detalhes: string[];
} {
  const temTimeline = html.includes("window.__timelines");
  // Aceita </html> em qualquer capitalização e com whitespace antes/depois
  const temFechamentoHtml = /\<\/html\s*\>/i.test(html.trim());
  const ultimasLinhas = html.split("\n").slice(-5).join("\n");

  const detalhes: string[] = [];
  if (!temTimeline) detalhes.push("SEM window.__timelines");
  if (!temFechamentoHtml) detalhes.push(`SEM </html> — últimas linhas: ${ultimasLinhas.trim().substring(0, 150)}`);

  const truncado = !temTimeline || !temFechamentoHtml;
  return { temTimeline, temFechamentoHtml, truncado, detalhes };
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
  console.log("\n═══ REVARIABILIZAÇÃO DOS TEMPLATES TRUNCADOS ═══\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY não definida no .env");
    process.exit(1);
  }

  fs.mkdirSync(PASTA_TEMP, { recursive: true });

  const resultados: ResultadoRevariabilizacao[] = [];

  for (let i = 0; i < TEMPLATES_ALVO.length; i++) {
    const nome = TEMPLATES_ALVO[i];
    console.log(`\n[${ i + 1 }/${ TEMPLATES_ALVO.length }] ══ ${nome} ══`);

    const caminho = resolverCaminhoHtml(nome);
    if (!caminho) {
      console.error(`  ✗ Arquivo não encontrado: ${nome}`);
      resultados.push({ nome, status: "erro", erro: "arquivo não encontrado" });
      continue;
    }

    const htmlOriginal = fs.readFileSync(caminho, "utf-8");
    console.log(`  Linhas originais (backup): ${htmlOriginal.split("\n").length}`);
    console.log(`  Tem window.__timelines no original: ${htmlOriginal.includes("window.__timelines")}`);
    console.log(`  Chamando API (max_tokens: 8192)...`);

    try {
      // Backup defensivo antes de sobrescrever (já existe, mas garante)
      fazerBackup(nome, caminho);

      const htmlResultado = await variabilizarComClaude(nome, htmlOriginal);

      // ── Validação imediata ──────────────────────────────────────────────
      const validacao = validarResultado(nome, htmlResultado);

      if (validacao.truncado) {
        console.error(`\n  🛑 TRUNCADO NOVAMENTE — parando este template.`);
        for (const d of validacao.detalhes) console.error(`     ${d}`);
        console.error(`  Linhas da resposta: ${htmlResultado.split("\n").length}`);
        console.error(`  Arquivo NÃO salvo — mantendo versão do backup.`);

        resultados.push({
          nome,
          status: "truncado_novamente",
          linhasResultado: htmlResultado.split("\n").length,
          temTimeline: validacao.temTimeline,
          temFechamentoHtml: validacao.temFechamentoHtml,
          erro: validacao.detalhes.join("; "),
        });

        // Não continua para os próximos, mas não sobrescreve arquivo
        if (i < TEMPLATES_ALVO.length - 1) {
          console.log(`\n  Aguardando 2s antes do próximo...`);
          await sleep(2000);
        }
        continue;
      }

      // ── Salva resultado válido ──────────────────────────────────────────
      fs.writeFileSync(caminho, htmlResultado, "utf-8");
      const linhasResultado = htmlResultado.split("\n").length;
      console.log(`  ✓ Salvo (${linhasResultado} linhas)`);
      console.log(`    window.__timelines: ${validacao.temTimeline ? "✓" : "✗"}`);
      console.log(`    </html>:            ${validacao.temFechamentoHtml ? "✓" : "✗"}`);

      // ── lerMetadadosTemplate ───────────────────────────────────────────
      const meta = lerMetadadosTemplate(nome, true);
      const numVariaveis = meta?.variaveis.length ?? 0;
      if (numVariaveis > 0) {
        console.log(`    Variáveis detectadas: ${numVariaveis}`);
        for (const v of meta!.variaveis.slice(0, 5)) {
          console.log(`      ${v.id} [${v.type}] = ${JSON.stringify(v.default)}`);
        }
        if (meta!.variaveis.length > 5) {
          console.log(`      ... e mais ${meta!.variaveis.length - 5}`);
        }
      } else {
        console.warn(`  ⚠ lerMetadadosTemplate não detectou variáveis`);
      }

      resultados.push({
        nome,
        status: "sucesso",
        linhasResultado,
        temTimeline: validacao.temTimeline,
        temFechamentoHtml: validacao.temFechamentoHtml,
        numVariaveis,
      });

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Erro: ${msg}`);
      resultados.push({ nome, status: "erro", erro: msg });
    }

    if (i < TEMPLATES_ALVO.length - 1) {
      console.log(`\n  Aguardando 2s antes do próximo...`);
      await sleep(2000);
    }
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  console.log("\n\n═══ RELATÓRIO FINAL ═══\n");
  console.log(` ${"Template".padEnd(32)} ${"Status".padEnd(20)} ${"Linhas".padEnd(8)} ${"Timeline".padEnd(10)} ${"</html>".padEnd(9)} Vars`);
  console.log(" " + "─".repeat(85));

  for (const r of resultados) {
    const status = r.status === "sucesso" ? "✓ sucesso"
      : r.status === "truncado_novamente" ? "✗ truncado novamente"
      : `✗ erro`;
    const linhas = r.linhasResultado?.toString() ?? "—";
    const tl = r.temTimeline === true ? "✓" : r.temTimeline === false ? "✗" : "—";
    const html = r.temFechamentoHtml === true ? "✓" : r.temFechamentoHtml === false ? "✗" : "—";
    const vars = r.numVariaveis !== undefined ? String(r.numVariaveis) : "—";
    console.log(` ${r.nome.padEnd(32)} ${status.padEnd(20)} ${linhas.padEnd(8)} ${tl.padEnd(10)} ${html.padEnd(9)} ${vars}`);
    if (r.erro) console.log(`   → ${r.erro}`);
  }

  const sucesso = resultados.filter(r => r.status === "sucesso").length;
  const truncados = resultados.filter(r => r.status === "truncado_novamente").length;
  const erros = resultados.filter(r => r.status === "erro").length;

  console.log(`\n  Sucesso: ${sucesso} | Truncados novamente: ${truncados} | Erros: ${erros}`);

  const relatorio = {
    geradoEm: new Date().toISOString(),
    templates: resultados,
    sucesso,
    truncados,
    erros,
  };
  const relatorioPath = path.join(PASTA_TEMP, "relatorio-revariabilizacao.json");
  fs.writeFileSync(relatorioPath, JSON.stringify(relatorio, null, 2), "utf-8");
  console.log(`\n  Relatório salvo: ${relatorioPath}\n`);
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
