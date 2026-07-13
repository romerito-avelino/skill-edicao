import * as fs from "fs";
import * as path from "path";
import { PlanoSegmento, ConfigCanal } from "./planner";
import { ConfigEditorial } from "./editorial";
import { SegmentoEnriquecido } from "./context-enricher";
import { gerarCodigoAnimacao } from "./animation-generator";
import { renderizarHyperFrames } from "./hyperframes-renderer";

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
    template: clip.animacao,
    contexto: clip.fraseImpacto || clip.texto.substring(0, 60),
    tom: clip.terco,
    emocao: enriquecido?.emocao ?? "neutro",
    intensidade: enriquecido?.intensidade ?? "media",
    duracao: clip.duracao,
    paleta: canal.paleta,
    tipoAnimacao: "5",
    indiceClip: indice,
    totalClips: total,
    descricaoVisual: clip.descricaoVisual,
    elementosVisuais: enriquecido?.elementosVisuais,
    atmosfera: enriquecido?.atmosfera,
    estiloFundo: clip.estiloFundo,
    referenciaVisual: enriquecido?.referenciaVisual ?? null,
  });
}

export async function gerarBatchAnimacoes(
  clipsRemotion: PlanoSegmento[],
  configEditorial: ConfigEditorial,
  canal: ConfigCanal,
  pastaProjeto: string,
  pastaCenas?: string
): Promise<Map<string, string | null>> {
  const resultados = new Map<string, string | null>();
  const total = clipsRemotion.length;

  if (total === 0) return resultados;

  const enriquecidos = carregarEnriquecidos(pastaProjeto);
  const pastaAnimacoes = path.join(pastaProjeto, "animacoes-geradas");
  if (!fs.existsSync(pastaAnimacoes)) fs.mkdirSync(pastaAnimacoes, { recursive: true });

  // Separa HyperFrames de Remotion puro
  const clipsHF = pastaCenas
    ? clipsRemotion.filter(c => c.motor === "hyperframes")
    : [];
  const clipsRemotionPuro = clipsRemotion.filter(c => c.motor !== "hyperframes");

  console.log("\n═══ FASE 1 — GERANDO ANIMAÇÕES EM BATCH ═══");
  if (clipsHF.length > 0) {
    console.log(`HyperFrames: ${clipsHF.length} clips | Animações (TSX): ${clipsRemotionPuro.length} clips`);
  } else {
    console.log(`Gerando código para ${clipsRemotionPuro.length} clips em paralelo...`);
  }
  console.log("(Isso pode levar 30-60 segundos)\n");

  const inicio = Date.now();

  // HyperFrames: render direto em paralelo
  const hfPromises = clipsHF.map(clip => {
    const enriquecido = getEnriquecido(enriquecidos, clip.segmentoId);
    const outputPath = path.join(pastaCenas!, `${clip.clipId}.mp4`);

    return renderizarHyperFrames({
      clipId: clip.clipId,
      fraseImpacto: clip.fraseImpacto || clip.texto.substring(0, 60),
      descricaoVisual: enriquecido?.descricaoVisual || clip.descricaoVisual || "",
      elementosVisuais: enriquecido?.elementosVisuais ?? [],
      atmosfera: enriquecido?.atmosfera ?? "dramatico",
      estiloFundo: clip.estiloFundo ?? "",
      tipoMomento: clip.tipoFrase,
      paleta: canal.paleta,
      duracao: clip.duracao,
      outputPath,
      templateAprovado: clip.templateAprovado,
      variaveisAprovadas: clip.variaveisAprovadas,
    }).then(resultado => {
      if (resultado === "ok") {
        process.stdout.write(`  ✓ ${clip.clipId} (HyperFrames)\n`);
      } else {
        process.stdout.write(`  ✗ ${clip.clipId} (HyperFrames falhou — fallback Animações)\n`);
      }
      resultados.set(clip.clipId, null);
    });
  });

  // Remotion: gera código TSX em paralelo
  const remotionPromises = clipsRemotionPuro.map((clip, idx) =>
    tentarGerar(clip, configEditorial, canal, enriquecidos, idx + 1, clipsRemotionPuro.length)
  );

  const [, remotionSettled] = await Promise.all([
    Promise.all(hfPromises),
    Promise.allSettled(remotionPromises),
  ]);

  // Fase 1b: retry para Remotion que falharam
  const retries: Promise<void>[] = [];

  remotionSettled.forEach((resultado, idx) => {
    const clip = clipsRemotionPuro[idx];
    if (resultado.status === "fulfilled") {
      process.stdout.write(`  ✓ ${clip.clipId} gerado\n`);
      resultados.set(clip.clipId, resultado.value);
    } else {
      process.stdout.write(`  ✗ ${clip.clipId} falhou — retry...\n`);
      retries.push(
        tentarGerar(clip, configEditorial, canal, enriquecidos, idx + 1, clipsRemotionPuro.length)
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

  for (const clip of clipsRemotion) {
    if (!resultados.has(clip.clipId)) resultados.set(clip.clipId, null);
  }

  // Salva TSX de Remotion para auditoria (HF já salvou seu HTML)
  for (const clip of clipsRemotionPuro) {
    const codigo = resultados.get(clip.clipId);
    if (codigo !== null && codigo !== undefined) {
      fs.writeFileSync(path.join(pastaAnimacoes, `${clip.clipId}.tsx`), codigo, "utf-8");
    }
  }

  const geradosRemotion = clipsRemotionPuro.filter(c => resultados.get(c.clipId) !== null).length;
  const segundos = Math.round((Date.now() - inicio) / 1000);

  console.log(`\n✓ Batch concluído em ${segundos}s`);
  if (clipsHF.length > 0) console.log(`  HyperFrames: ${clipsHF.length} clips renderizados`);
  if (clipsRemotionPuro.length > 0) console.log(`  Animações TSX: ${geradosRemotion}/${clipsRemotionPuro.length} gerados`);
  console.log("\n═══ FASE 2 — COMPILANDO E RENDERIZANDO ═══\n");

  return resultados;
}
