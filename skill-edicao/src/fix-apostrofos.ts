import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as fs from "fs";
import { lerMetadadosTemplate, listarTemplatesDisponiveis } from "./hyperframes-templates";

const PASTA_COMPOSITIONS = path.resolve(
  __dirname, "..", "..", "HyperFrames", "myproject", "compositions"
);
const PASTA_TEMP = path.resolve(__dirname, "..", "temp");

// ─── Detecção e Correção ──────────────────────────────────────────────────────

function temBugNaLinha(linha: string): boolean {
  if (!linha.includes("data-composition-variables")) return false;
  // Detecta '\'' (shell escape) ou \' (bare backslash+apostrophe)
  return linha.includes("'\\''") || linha.includes("\\'");
}

function corrigirLinha(linha: string): { resultado: string; ocorrencias: number } {
  if (!linha.includes("data-composition-variables")) {
    return { resultado: linha, ocorrencias: 0 };
  }

  let resultado = linha;
  let ocorrencias = 0;

  // Passo 1: '\'' (4 chars: apóstrofo + backslash + apóstrofo + apóstrofo)
  // É o bash-escape que Claude gerou. Deve virar &apos; por completo.
  const contagem1 = resultado.split("'\\''").length - 1;
  if (contagem1 > 0) {
    resultado = resultado.split("'\\''" ).join("&apos;");
    ocorrencias += contagem1;
  }

  // Passo 2: \' (2 chars: backslash + apóstrofo) — o escape mais simples
  const contagem2 = resultado.split("\\'").length - 1;
  if (contagem2 > 0) {
    resultado = resultado.split("\\'").join("&apos;");
    ocorrencias += contagem2;
  }

  return { resultado, ocorrencias };
}

interface ResultadoArquivo {
  nome: string;
  caminho: string;
  status: "corrigido" | "limpo" | "sem-composition-id";
  ocorrencias: number;
  variaveisAntes: number;
  variaveisDepois: number;
  variaveis?: { id: string; type: string; default: unknown }[];
}

function resolverCaminho(nome: string): string | null {
  const candidatos = [
    path.join(PASTA_COMPOSITIONS, `${nome}.html`),
    path.join(PASTA_COMPOSITIONS, "components", `${nome}.html`),
  ];
  return candidatos.find(p => fs.existsSync(p)) ?? null;
}

function contarVariaveisAtuais(nome: string): number {
  const meta = lerMetadadosTemplate(nome, true);
  return meta ? meta.variaveis.length : 0;
}

async function main() {
  console.log("\n═══ CORREÇÃO DE APÓSTROFOS — data-composition-variables ═══\n");

  fs.mkdirSync(PASTA_TEMP, { recursive: true });

  const templates = listarTemplatesDisponiveis();
  console.log(`Templates encontrados: ${templates.length}\n`);

  const resultados: ResultadoArquivo[] = [];

  for (const nome of templates) {
    const caminho = resolverCaminho(nome);
    if (!caminho) continue;

    const html = fs.readFileSync(caminho, "utf-8");
    const linhas = html.split("\n");

    // Detecta se há bug em alguma linha do arquivo
    const linhasComBug = linhas.filter(l => temBugNaLinha(l));
    const variaveisAntes = contarVariaveisAtuais(nome);

    if (linhasComBug.length === 0) {
      // Arquivo limpo — só registra se tiver data-composition-id (i.e., é um template real)
      const temId = /data-composition-id/.test(html);
      if (!temId) {
        console.log(`  — ${nome}: sem data-composition-id, pulando`);
        continue;
      }
      resultados.push({
        nome,
        caminho,
        status: "limpo",
        ocorrencias: 0,
        variaveisAntes,
        variaveisDepois: variaveisAntes,
      });
      continue;
    }

    // Aplica correção linha a linha
    let totalOcorrencias = 0;
    const linhasCorrigidas = linhas.map(linha => {
      const { resultado, ocorrencias } = corrigirLinha(linha);
      totalOcorrencias += ocorrencias;
      return resultado;
    });

    const htmlCorrigido = linhasCorrigidas.join("\n");
    fs.writeFileSync(caminho, htmlCorrigido, "utf-8");

    // Verifica variáveis após correção
    const variaveisDepois = contarVariaveisAtuais(nome);
    const meta = lerMetadadosTemplate(nome, true);

    console.log(`  ✓ ${nome}: ${totalOcorrencias} ocorrência(s) corrigida(s) → ${variaveisDepois} variável(eis) detectada(s)`);

    resultados.push({
      nome,
      caminho,
      status: "corrigido",
      ocorrencias: totalOcorrencias,
      variaveisAntes,
      variaveisDepois,
      variaveis: meta?.variaveis.map(v => ({ id: v.id, type: v.type, default: v.default })),
    });
  }

  // ─── Verificação final de todos os templates ──────────────────────────────
  console.log("\n═══ VERIFICAÇÃO FINAL (todos os templates) ═══\n");

  const verificacao: Record<string, { variaveis: number; status: string }> = {};
  for (const r of resultados) {
    const n = contarVariaveisAtuais(r.nome);
    verificacao[r.nome] = { variaveis: n, status: r.status };
    const marca = n > 0 ? "✓" : "✗";
    console.log(`  ${marca} ${r.nome.padEnd(40)} ${String(n).padStart(3)} variável(eis)  [${r.status}]`);
  }

  // ─── Relatório JSON ───────────────────────────────────────────────────────
  const corrigidos = resultados.filter(r => r.status === "corrigido");
  const limpos    = resultados.filter(r => r.status === "limpo");

  const relatorio = {
    geradoEm: new Date().toISOString(),
    resumo: {
      totalTemplates: resultados.length,
      corrigidos: corrigidos.length,
      limpos: limpos.length,
      totalOcorrencias: corrigidos.reduce((s, r) => s + r.ocorrencias, 0),
    },
    corrigidos: corrigidos.map(r => ({
      nome: r.nome,
      ocorrenciasCorrigidas: r.ocorrencias,
      variaveisAntes: r.variaveisAntes,
      variaveisDepois: r.variaveisDepois,
      variaveis: r.variaveis,
    })),
    limpos: limpos.map(r => ({ nome: r.nome, variaveis: r.variaveisDepois })),
  };

  const caminhoRelatorio = path.join(PASTA_TEMP, "relatorio-correcao-apostrofos.json");
  fs.writeFileSync(caminhoRelatorio, JSON.stringify(relatorio, null, 2), "utf-8");

  console.log("\n═══ RESUMO ═══\n");
  console.log(`  Arquivos corrigidos:  ${corrigidos.length}`);
  console.log(`  Arquivos limpos:      ${limpos.length}`);
  console.log(`  Total de ocorrências: ${relatorio.resumo.totalOcorrencias}`);
  console.log(`\n  Relatório: ${caminhoRelatorio}\n`);

  // Alerta para templates que ainda têm 0 variáveis após correção
  const aindaZero = resultados.filter(r => r.variaveisDepois === 0 && r.status !== "sem-composition-id");
  if (aindaZero.length > 0) {
    console.log("  ⚠ Templates com 0 variáveis mesmo após correção:");
    for (const r of aindaZero) {
      console.log(`    - ${r.nome} (status: ${r.status})`);
    }
    console.log();
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
