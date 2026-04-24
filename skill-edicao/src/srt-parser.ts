import { readFileSync, existsSync } from "fs";

export interface Segmento {
  id: string;
  numero: number;
  inicio_ms: number;
  fim_ms: number;
  duracao_ms: number;
  texto: string;
}

function timestampParaMs(timestamp: string): number {
  const partes = timestamp.trim().split(",");
  const ms = parseInt(partes[1]);
  const [horas, minutos, segundos] = partes[0].split(":").map(Number);
  return horas * 3600000 + minutos * 60000 + segundos * 1000 + ms;
}

export function parsearSRT(caminhoArquivo: string): Segmento[] {
  const conteudo = readFileSync(caminhoArquivo, "utf-8");
  const blocos = conteudo
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split(/\n\n+/);

  const segmentos: Segmento[] = [];

  for (const bloco of blocos) {
    const linhas = bloco.trim().split("\n");
    if (linhas.length < 3) continue;

    const numero = parseInt(linhas[0].trim());
    if (isNaN(numero)) continue;

    const tempos = linhas[1].split("-->");
    if (tempos.length !== 2) continue;

    const inicio_ms = timestampParaMs(tempos[0]);
    const fim_ms = timestampParaMs(tempos[1]);
    const duracao_ms = fim_ms - inicio_ms;
    const texto = linhas.slice(2).join(" ").trim();

    segmentos.push({
      id: String(numero).padStart(3, "0"),
      numero,
      inicio_ms,
      fim_ms,
      duracao_ms,
      texto,
    });
  }

  return segmentos;
}

export function resumirSRT(segmentos: Segmento[]): void {
  const duracao_total_ms = segmentos[segmentos.length - 1]?.fim_ms || 0;
  const minutos = Math.floor(duracao_total_ms / 60000);
  const segundos = Math.floor((duracao_total_ms % 60000) / 1000);

  console.log("=== RESUMO DO SRT ===");
  console.log(`Total de segmentos: ${segmentos.length}`);
  console.log(`Duração total: ${minutos}m ${segundos}s`);
  console.log(`Primeiro: ${segmentos[0]?.id} — "${segmentos[0]?.texto.substring(0, 50)}"`);
  console.log(`Último: ${segmentos[segmentos.length - 1]?.id}`);
  console.log("====================");
}

const arquivo = process.argv[2] || "skill-edicao/assets/roteiro.srt";

if (!existsSync(arquivo)) {
  console.log(`Arquivo SRT não encontrado: ${arquivo}`);
  console.log("Uso: node --import tsx/esm skill-edicao/src/srt-parser.ts <caminho.srt>");
  console.log("\nParser carregado e pronto para uso!");
} else {
  const segmentos = parsearSRT(arquivo);
  resumirSRT(segmentos);
  console.log("\nPrimeiros 3 segmentos:");
  console.log(JSON.stringify(segmentos.slice(0, 3), null, 2));
}
