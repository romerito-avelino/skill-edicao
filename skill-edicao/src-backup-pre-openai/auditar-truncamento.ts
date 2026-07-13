import * as fs from "fs";
import * as path from "path";

const PASTA_COMPOSITIONS = path.resolve(
  __dirname, "..", "..", "HyperFrames", "myproject", "compositions"
);
const PASTA_BACKUP = path.resolve(
  __dirname, "..", "..", "HyperFrames", "myproject", "compositions-backup"
);
const PASTA_TEMP = path.resolve(__dirname, "..", "temp");
const RELATORIO_JSON = path.join(PASTA_TEMP, "relatorio-auditoria-truncamento.json");

interface ResultadoTemplate {
  nome: string;
  linhasAtual: number;
  linhasBackup: number;
  percentualReducao: number;
  temTimeline: boolean;
  suspeitoTruncamento: boolean;
  motivo?: string;
}

function contarLinhas(caminho: string): number {
  return fs.readFileSync(caminho, "utf-8").split("\n").length;
}

function contemTimeline(caminho: string): boolean {
  return fs.readFileSync(caminho, "utf-8").includes("window.__timelines");
}

function auditarArquivo(nome: string, caminhoAtual: string, caminhoBackup: string): ResultadoTemplate {
  const linhasAtual = contarLinhas(caminhoAtual);
  const linhasBackup = contarLinhas(caminhoBackup);
  const percentualReducao = linhasBackup > 0
    ? ((linhasBackup - linhasAtual) / linhasBackup) * 100
    : 0;

  const backupTemTimeline = contemTimeline(caminhoBackup);
  const atualTemTimeline = contemTimeline(caminhoAtual);

  const reducaoExcessiva = percentualReducao > 20;
  const perdeuTimeline = backupTemTimeline && !atualTemTimeline;
  const suspeitoTruncamento = reducaoExcessiva || perdeuTimeline;

  const motivos: string[] = [];
  if (reducaoExcessiva) motivos.push(`redução de ${percentualReducao.toFixed(1)}% nas linhas`);
  if (perdeuTimeline) motivos.push("perdeu window.__timelines");

  return {
    nome,
    linhasAtual,
    linhasBackup,
    percentualReducao: parseFloat(percentualReducao.toFixed(1)),
    temTimeline: atualTemTimeline,
    suspeitoTruncamento,
    ...(motivos.length > 0 && { motivo: motivos.join("; ") }),
  };
}

function coletarArquivosHtml(pasta: string): Map<string, string> {
  const mapa = new Map<string, string>();
  if (!fs.existsSync(pasta)) return mapa;

  for (const f of fs.readdirSync(pasta)) {
    if (f.endsWith(".html")) mapa.set(f, path.join(pasta, f));
  }

  const components = path.join(pasta, "components");
  if (fs.existsSync(components)) {
    for (const f of fs.readdirSync(components)) {
      if (f.endsWith(".html")) mapa.set(`components/${f}`, path.join(components, f));
    }
  }

  return mapa;
}

function main() {
  console.log("\n═══ AUDITORIA DE TRUNCAMENTO DE TEMPLATES ═══\n");

  const arquivosAtuais = coletarArquivosHtml(PASTA_COMPOSITIONS);
  const arquivosBackup = coletarArquivosHtml(PASTA_BACKUP);

  const resultados: ResultadoTemplate[] = [];
  const semBackup: string[] = [];

  for (const [chave, caminhoAtual] of arquivosAtuais) {
    const caminhoBackup = arquivosBackup.get(chave);
    if (!caminhoBackup) {
      semBackup.push(chave);
      continue;
    }
    const nome = chave.replace("components/", "components/").replace(".html", "");
    resultados.push(auditarArquivo(nome, caminhoAtual, caminhoBackup));
  }

  // Ordena: suspeitos primeiro, depois por percentual de redução decrescente
  resultados.sort((a, b) => {
    if (a.suspeitoTruncamento !== b.suspeitoTruncamento) {
      return a.suspeitoTruncamento ? -1 : 1;
    }
    return b.percentualReducao - a.percentualReducao;
  });

  const suspeitos = resultados.filter(r => r.suspeitoTruncamento);
  const ok = resultados.filter(r => !r.suspeitoTruncamento);

  // ── Terminal ───────────────────────────────────────────────────────────────
  if (suspeitos.length > 0) {
    console.log(`⚠ SUSPEITOS DE TRUNCAMENTO (${suspeitos.length}):\n`);
    for (const r of suspeitos) {
      const sinal = r.temTimeline ? "✓ timeline" : "✗ sem timeline";
      console.log(`  ✗ ${r.nome}`);
      console.log(`    Linhas: atual ${r.linhasAtual} | backup ${r.linhasBackup} | redução ${r.percentualReducao}%`);
      console.log(`    Timeline: ${sinal}`);
      console.log(`    Motivo: ${r.motivo}`);
      console.log();
    }
  }

  console.log(`✓ Templates OK: ${ok.length}`);
  for (const r of ok) {
    const delta = r.linhasAtual - r.linhasBackup;
    const sinal = delta >= 0 ? `+${delta}` : `${delta}`;
    console.log(`    ${r.nome}: ${r.linhasAtual} linhas (${sinal} vs backup)`);
  }

  if (semBackup.length > 0) {
    console.log(`\n  Sem backup (não comparados): ${semBackup.join(", ")}`);
  }

  console.log(`\n  Total comparados: ${resultados.length}`);
  console.log(`  Suspeitos:        ${suspeitos.length}`);
  console.log(`  OK:               ${ok.length}`);

  // ── Relatório JSON ─────────────────────────────────────────────────────────
  fs.mkdirSync(PASTA_TEMP, { recursive: true });
  const relatorio = {
    geradoEm: new Date().toISOString(),
    totalComparados: resultados.length,
    suspeitos: suspeitos.length,
    ok: ok.length,
    semBackup: semBackup.length,
    templates: resultados,
  };
  fs.writeFileSync(RELATORIO_JSON, JSON.stringify(relatorio, null, 2), "utf-8");
  console.log(`\n  Relatório salvo em: ${RELATORIO_JSON}\n`);
}

main();
