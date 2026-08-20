import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { ConfigProjeto, PlanoEdicao } from "./planner";

interface InfoFFprobe {
  duracaoMs: number | null;
  comentario: string | null;
}

function ffprobeInfo(arquivo: string): Promise<InfoFFprobe> {
  return new Promise(resolve => {
    const comando = `ffprobe -v error -show_entries format=duration:format_tags=comment -of json "${arquivo}"`;
    exec(comando, (erro, stdout) => {
      if (erro) {
        resolve({ duracaoMs: null, comentario: null });
        return;
      }
      try {
        const dados = JSON.parse(stdout);
        const duracaoSeg = dados.format?.duration ? parseFloat(dados.format.duration) : null;
        const comentario = dados.format?.tags?.comment ?? null;
        resolve({
          duracaoMs: duracaoSeg !== null && !isNaN(duracaoSeg) ? Math.round(duracaoSeg * 1000) : null,
          comentario,
        });
      } catch {
        resolve({ duracaoMs: null, comentario: null });
      }
    });
  });
}

type StatusHeroi = "OK" | "PENDENTE" | "AVISO";

// Confere cada cena-herói contra output/cenas/{clipId}.mp4:
// ausente ou ainda marcado PLACEHOLDER-HEROI → PENDENTE (bloqueia o render final)
// duração fora de ±100ms do plano → AVISO (desalinha a montagem, mas não bloqueia)
// caso contrário → OK
export async function reincorporarHerois(config: ConfigProjeto): Promise<number> {
  const arquivoPlano = path.join(config.pasta, "plano-edicao.json");

  if (!fs.existsSync(arquivoPlano)) {
    console.error(`Plano não encontrado: ${arquivoPlano}`);
    console.error("Gere o plano primeiro com --planejar");
    return 1;
  }

  const plano: PlanoEdicao = JSON.parse(fs.readFileSync(arquivoPlano, "utf-8"));
  const herois = plano.segmentos.filter(s => s.origem === "heroi");

  console.log("\n═══ REINCORPORAÇÃO DE CENAS-HERÓI ═══\n");

  if (herois.length === 0) {
    console.log("Nenhuma cena-herói neste plano.");
    return 0;
  }

  const pastaCenas =
    config.pasta_saida && config.pasta_saida.trim() !== "" && fs.existsSync(config.pasta_saida)
      ? config.pasta_saida
      : path.join(config.pasta, "output", "cenas");

  const linhas: string[] = [];
  let pendentes = 0;

  for (const clip of herois) {
    const arquivo = path.join(pastaCenas, `${clip.clipId}.mp4`);
    let status: StatusHeroi;
    let detalhe: string;

    if (!fs.existsSync(arquivo)) {
      status = "PENDENTE";
      detalhe = "arquivo ausente";
    } else {
      const info = await ffprobeInfo(arquivo);
      if (info.comentario === "PLACEHOLDER-HEROI") {
        status = "PENDENTE";
        detalhe = "ainda é placeholder";
      } else if (info.duracaoMs === null) {
        status = "AVISO";
        detalhe = "não foi possível ler a duração (ffprobe falhou)";
      } else if (Math.abs(info.duracaoMs - clip.duracao) > 100) {
        status = "AVISO";
        detalhe = `duração ${info.duracaoMs}ms difere do plano (${clip.duracao}ms) — vai desalinhar a montagem`;
      } else {
        status = "OK";
        detalhe = "cena real incorporada";
      }
    }

    if (status === "PENDENTE") pendentes++;
    linhas.push(`${status.padEnd(9)} ${clip.clipId.padEnd(14)} ${detalhe}`);
  }

  console.log(`STATUS    CLIP ID        DETALHE`);
  for (const l of linhas) console.log(l);

  console.log(`\n${herois.length - pendentes}/${herois.length} incorporada(s).`);
  if (pendentes > 0) {
    console.log(`✗ ${pendentes} cena(s) pendente(s) — substitua os placeholders antes do render final.`);
  } else {
    console.log("✓ Todas as cenas-herói foram incorporadas. Liberado para render final.");
  }

  return pendentes > 0 ? 1 : 0;
}
