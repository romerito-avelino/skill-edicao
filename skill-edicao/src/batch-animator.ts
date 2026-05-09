import * as fs from "fs";
import * as path from "path";
import { PlanoSegmento, ConfigCanal } from "./planner";
import { ConfigEditorial } from "./editorial";
import { SegmentoEnriquecido } from "./context-enricher";
import { gerarCodigoAnimacao } from "./animation-generator";

function carregarEnriquecidos(pastaProjeto: string): SegmentoEnriquecido[] {
  const arquivo = path.join(pastaProjeto, "contexto-enriquecido.json");
  if (!fs.existsSync(arquivo)) return [];
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  } catch {
    return [];
  }
}

// contexto-enriquecido.json é um array na ordem dos segmentos (001=índice 0)
function getEnriquecido(
  enriquecidos: SegmentoEnriquecido[],
  segmentoId: string
): SegmentoEnriquecido | null {
  const idx = parseInt(segmentoId, 10) - 1;
  return idx >= 0 ? (enriquecidos[idx] ?? null) : null;
}

async function tentarGerar(
  clip: PlanoSegmento,
  configEditorial: ConfigEditorial,
  canal: ConfigCanal,
  enriquecidos: SegmentoEnriquecido[],
  indice: number,
  total: number
): Promise<string> {
  const enriquecido = getEnriquecido(enriquecidos, clip.segmentoId);

  return gerarCodigoAnimacao({
    template: configEditorial.templateAnimacao || "Animação profissional de vídeo para YouTube",
    contexto: clip.fraseImpacto || clip.texto.substring(0, 60),
    tom: clip.terco,
    emocao: enriquecido?.emocao ?? "neutro",
    intensidade: enriquecido?.intensidade ?? "media",
    duracao: clip.duracao,
    paleta: canal.paleta,
    tipoAnimacao: String(configEditorial.tipoAnimacao),
    indiceClip: indice,
    totalClips: total,
  });
}

export async function gerarBatchAnimacoes(
  clipsRemotion: PlanoSegmento[],
  configEditorial: ConfigEditorial,
  canal: ConfigCanal,
  pastaProjeto: string
): Promise<Map<string, string | null>> {
  const resultados = new Map<string, string | null>();
  const total = clipsRemotion.length;

  if (total === 0) return resultados;

  const enriquecidos = carregarEnriquecidos(pastaProjeto);
  const pastaAnimacoes = path.join(pastaProjeto, "animacoes-geradas");
  if (!fs.existsSync(pastaAnimacoes)) fs.mkdirSync(pastaAnimacoes, { recursive: true });

  console.log("\n═══ FASE 1 — GERANDO ANIMAÇÕES EM BATCH ═══");
  console.log(`Gerando código para ${total} clips em paralelo...`);
  console.log("(Isso pode levar 30-60 segundos)\n");

  const inicio = Date.now();

  // Fase 1a: todas as geração em paralelo
  const promises = clipsRemotion.map((clip, idx) =>
    tentarGerar(clip, configEditorial, canal, enriquecidos, idx + 1, total)
  );

  const settled = await Promise.allSettled(promises);

  // Fase 1b: retry sequencial para os que falharam
  const retries: Promise<void>[] = [];

  settled.forEach((resultado, idx) => {
    const clip = clipsRemotion[idx];
    if (resultado.status === "fulfilled") {
      process.stdout.write(`  ✓ ${clip.clipId} gerado\n`);
      resultados.set(clip.clipId, resultado.value);
    } else {
      process.stdout.write(`  ✗ ${clip.clipId} falhou — retry...\n`);
      retries.push(
        tentarGerar(clip, configEditorial, canal, enriquecidos, idx + 1, total)
          .then(codigo => {
            process.stdout.write(`  ✓ ${clip.clipId} gerado no retry\n`);
            resultados.set(clip.clipId, codigo);
          })
          .catch(() => {
            process.stdout.write(`  ✗ ${clip.clipId} falhou após retry — usará tela preta\n`);
            resultados.set(clip.clipId, null);
          })
      );
    }
  });

  await Promise.all(retries);

  // Garante que clips sem resultado recebam null
  for (const clip of clipsRemotion) {
    if (!resultados.has(clip.clipId)) resultados.set(clip.clipId, null);
  }

  // Salva TSX gerados para auditoria
  for (const [clipId, codigo] of resultados.entries()) {
    if (codigo !== null) {
      fs.writeFileSync(path.join(pastaAnimacoes, `${clipId}.tsx`), codigo, "utf-8");
    }
  }

  const gerados = [...resultados.values()].filter(v => v !== null).length;
  const fallbacks = total - gerados;
  const segundos = Math.round((Date.now() - inicio) / 1000);

  console.log(`\n✓ Batch concluído: ${gerados}/${total} gerados${fallbacks > 0 ? `, ${fallbacks} fallback` : ""}`);
  console.log(`Tempo: ${segundos} segundos`);
  console.log("\n═══ FASE 2 — COMPILANDO E RENDERIZANDO ═══\n");

  return resultados;
}
