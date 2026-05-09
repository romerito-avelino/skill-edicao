import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { buscarPexelsVideo, gerarImagemReplicate } from "./asset-fetcher";
import { gerarComandoVideoStock, executarFFmpeg } from "./ffmpeg-processor";
import { renderizarFraseImpacto, renderizarKenBurns, ContextoRenderizacao } from "./remotion-renderer";
import { ConfigProjeto, PlanoEdicao, PlanoSegmento, ConfigCanal } from "./planner";
import { EstadoNarrativo, ContextoClip } from "./narrative-state";
import { gerarBatchAnimacoes } from "./batch-animator";
import { compilarERenderizar } from "./tsx-compiler";

const DIRECAO_KB: Record<string, "zoom_in" | "zoom_out" | "pan_direita" | "pan_esquerda"> = {
  kenburns_zoom_in:       "zoom_in",
  kenburns_zoom_out:      "zoom_out",
  kenburns_pan_direita:   "pan_direita",
  kenburns_pan_esquerda:  "pan_esquerda",
};

interface Contadores {
  pexels: number;
  imagemIA: number;
  remotion: number;
  remotionViaAPI: number;
  remotionTelaPreta: number;
  falhas: string[];
  clipsFallback: string[];
}

async function executarVideoStock(
  clip: PlanoSegmento,
  pastaDownloads: string,
  pastaCenas: string,
  contadores: Contadores
): Promise<void> {
  if (!clip.queryPexels) {
    contadores.falhas.push(`${clip.clipId}: sem queryPexels`);
    return;
  }

  const resultado = await buscarPexelsVideo(
    [clip.queryPexels],
    clip.duracao,
    clip.clipId,
    pastaDownloads
  );

  if (resultado.sucesso) {
    const saida = path.join(pastaCenas, `${clip.clipId}.mp4`);
    const cmd = gerarComandoVideoStock(clip.clipId, resultado.arquivo_baixado, saida, clip.duracao);
    const res = await executarFFmpeg(cmd);
    if (res.sucesso) {
      console.log(`    ✓ ${clip.clipId}.mp4 gerado`);
      contadores.pexels++;
    } else {
      console.log(`    ✗ ffmpeg: ${res.erro}`);
      contadores.falhas.push(`${clip.clipId}: ffmpeg ${res.erro}`);
    }
    return;
  }

  console.log(`    ✗ Pexels: ${resultado.erro}`);
  if (clip.promptImagem) {
    console.log(`    → Fallback: imagem IA`);
    await executarImagemIA(clip, pastaDownloads, pastaCenas, contadores, true);
  } else {
    contadores.falhas.push(`${clip.clipId}: Pexels falhou e sem fallback`);
  }
}

async function executarImagemIA(
  clip: PlanoSegmento,
  pastaDownloads: string,
  pastaCenas: string,
  contadores: Contadores,
  ehFallback = false
): Promise<void> {
  if (!clip.promptImagem) {
    contadores.falhas.push(`${clip.clipId}: sem promptImagem`);
    return;
  }

  const resultado = await gerarImagemReplicate(clip.promptImagem, clip.clipId, pastaDownloads, "cinematic", clip.terco, clip.sensivel ?? false);
  if (!resultado.sucesso) {
    console.log(`    ✗ Replicate: ${resultado.erro}`);
    contadores.falhas.push(`${clip.clipId}: Replicate ${resultado.erro}`);
    return;
  }

  const saida = path.join(pastaCenas, `${clip.clipId}.mp4`);
  const direcao = DIRECAO_KB[clip.animacao] ?? "zoom_in";
  const res = await renderizarKenBurns(resultado.arquivo_baixado, saida, clip.duracao, direcao);
  if (res.sucesso) {
    if (!ehFallback) contadores.imagemIA++;
    else contadores.pexels++;
  } else {
    contadores.falhas.push(`${clip.clipId}: KenBurns falhou`);
  }
}

async function executarRemotionRapido(
  clip: PlanoSegmento,
  pastaCenas: string,
  contadores: Contadores,
  contextoNarrativo?: ContextoClip,
  canal?: ConfigCanal
): Promise<void> {
  if (!clip.fraseImpacto) {
    contadores.falhas.push(`${clip.clipId}: sem fraseImpacto`);
    return;
  }

  const saida = path.join(pastaCenas, `${clip.clipId}.mp4`);
  const estiloValido = (["agressivo", "duvidoso", "esperancoso"] as const).includes(
    clip.terco as any
  )
    ? (clip.terco as "agressivo" | "duvidoso" | "esperancoso")
    : "agressivo";

  const contextoRender: ContextoRenderizacao | undefined = contextoNarrativo
    ? {
        frase: clip.fraseImpacto,
        tom: estiloValido,
        pontoAtual: contextoNarrativo.pontoAtual,
        pontosAnteriores: contextoNarrativo.revelados,
        noAtual: contextoNarrativo.conceito,
        nosAnteriores: contextoNarrativo.revelados,
        temaCentral: contextoNarrativo.temaPrincipal,
        progresso: contextoNarrativo.progresso,
      }
    : undefined;

  const res = await renderizarFraseImpacto(
    clip.fraseImpacto,
    saida,
    clip.duracao,
    estiloValido,
    clip.animacao,
    contextoRender,
    canal
  );

  if (res.sucesso) {
    contadores.remotion++;
  } else {
    contadores.falhas.push(`${clip.clipId}: Remotion falhou`);
  }
}

function gerarRelatorio(
  config: ConfigProjeto,
  plano: PlanoEdicao,
  contadores: Contadores,
  inicioMs: number,
  modoRapido: boolean
): void {
  const fimMs = Date.now();
  const minutos = Math.round((fimMs - inicioMs) / 60000);
  const totalGerados = contadores.pexels + contadores.imagemIA + contadores.remotion;
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const linhasRemotion = modoRapido
    ? [`└─ Remotion:  ${contadores.remotion} clips`]
    : [
        `└─ Remotion:  ${contadores.remotion} clips`,
        `   ├─ Via API:      ${contadores.remotionViaAPI} clips ✓`,
        `   └─ Tela preta:   ${contadores.remotionTelaPreta} clips${contadores.remotionTelaPreta > 0 ? "  ⚠ (substituir na edição)" : ""}`,
      ];

  const linhasFallback = contadores.clipsFallback.length > 0
    ? [
        "",
        "Clips para substituição manual:",
        ...contadores.clipsFallback.map(c => `  → ${c}`),
      ]
    : [];

  const linhas = [
    "════════════════════════════════",
    " SKILL-EDIÇÃO | Relatório Final",
    ` Projeto: ${plano.projeto}`,
    ` Data: ${data} ${hora}`,
    "════════════════════════════════",
    `Clips gerados: ${totalGerados}`,
    `├─ Pexels:    ${contadores.pexels} clips`,
    `├─ Imagem IA: ${contadores.imagemIA} clips`,
    ...linhasRemotion,
    ...linhasFallback,
    "",
    `Tempo total: ${minutos} minutos`,
    `Falhas: ${contadores.falhas.length}${contadores.falhas.length > 0 ? " (listadas abaixo)" : ""}`,
    "════════════════════════════════",
    ...contadores.falhas,
  ];

  const conteudo = linhas.join("\n");
  const arquivo = path.join(config.pasta, "relatorio.txt");
  fs.writeFileSync(arquivo, conteudo, "utf-8");

  console.log("\n" + conteudo);
  console.log(`\nRelatório salvo: ${arquivo}`);
}

async function perguntarLimpeza(pastaDownloads: string, pastaCenas: string): Promise<void> {
  if (!fs.existsSync(pastaDownloads)) return;
  const arquivos = fs.readdirSync(pastaDownloads);
  if (arquivos.length === 0) return;

  console.log("\n════════════════════════════════");
  console.log(" 🗑  LIMPEZA DE ARQUIVOS");
  console.log("════════════════════════════════");
  console.log(`Clips finais salvos em: ${pastaCenas}`);
  console.log(`Downloads/sources em:  ${pastaDownloads}`);
  console.log("");
  console.log("Deseja apagar os arquivos temporários?");
  console.log("(As duas pastas serão mantidas até você confirmar)");
  console.log("");
  console.log("  [s] Apagar pasta downloads/ agora");
  console.log("  [n] Manter arquivos para revisão");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await new Promise<string>((resolve) => {
    rl.question("\nOpção: ", (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });

  if (resposta === "s") {
    for (const arquivo of fs.readdirSync(pastaDownloads)) {
      fs.rmSync(path.join(pastaDownloads, arquivo), { recursive: true, force: true });
    }
    console.log("✓ Pasta downloads/ limpa com sucesso");
  } else {
    console.log(`→ Arquivos mantidos em: ${pastaDownloads}`);
  }
}

export async function executar(config: ConfigProjeto, modoRapidoOverride = false): Promise<void> {
  const arquivoPlano = path.join(config.pasta, "plano-edicao.json");

  if (!fs.existsSync(arquivoPlano)) {
    console.error(`Plano não encontrado: ${arquivoPlano}`);
    console.error("Gere o plano primeiro com --planejar");
    process.exit(1);
  }

  const plano: PlanoEdicao = JSON.parse(fs.readFileSync(arquivoPlano, "utf-8"));

  // --rapido no CLI sobrepõe o valor salvo no plano
  const modoRapido = modoRapidoOverride || (plano.configEditorial?.modoRapido ?? false);

  if (modoRapido) {
    console.log("\n⚡ MODO RÁPIDO — usando presets existentes");
  }

  console.log("\n═══ FASE B: EXECUÇÃO ═══");
  console.log(`Projeto: ${plano.projeto}`);
  console.log(`Plano de: ${plano.geradoEm}`);
  console.log(`Total de clips: ${plano.segmentos.length}`);

  const pastaOutput    = path.join(config.pasta, "output");
  const pastaDownloads = path.join(pastaOutput, "downloads");

  let pastaCenas: string;
  if (config.pasta_saida && config.pasta_saida.trim() !== "" && fs.existsSync(config.pasta_saida)) {
    pastaCenas = config.pasta_saida;
    console.log(`[saida] Pasta configurada: ${pastaCenas}`);
  } else {
    pastaCenas = path.join(pastaOutput, "cenas");
    console.log(`[saida] Usando pasta padrão: ${pastaCenas}`);
  }

  for (const p of [pastaOutput, pastaCenas, pastaDownloads]) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }

  const contadores: Contadores = {
    pexels: 0,
    imagemIA: 0,
    remotion: 0,
    remotionViaAPI: 0,
    remotionTelaPreta: 0,
    falhas: [],
    clipsFallback: [],
  };
  const inicioMs = Date.now();

  // Estado narrativo (para modo rápido e para contexto de clip)
  const totalClipsRemotion = plano.segmentos.filter(s => s.tipoVisual === "remotion_animacao").length;
  const estadoNarrativo = new EstadoNarrativo();
  if (totalClipsRemotion > 0) {
    console.log("\nAnalisando narrativa para animações...");
    await estadoNarrativo.inicializar(plano.segmentos.map(s => s.texto), config.pasta);
  }
  let clipRemotion = 0;

  // Fase 1 (somente modo API): gera todos os TSX em batch paralelo
  let batchResultados = new Map<string, string | null>();
  if (!modoRapido && plano.configEditorial.usarRemotion && totalClipsRemotion > 0 && config.canal) {
    const clipsRemotion = plano.segmentos.filter(s => s.tipoVisual === "remotion_animacao");
    batchResultados = await gerarBatchAnimacoes(
      clipsRemotion,
      plano.configEditorial,
      config.canal,
      config.pasta
    );
  }

  // Fase 2: execução sequencial de cada clip
  for (let i = 0; i < plano.segmentos.length; i++) {
    const clip = plano.segmentos[i];
    console.log(`\n[${i + 1}/${plano.segmentos.length}] ${clip.clipId} — ${clip.tipoVisual} — ${clip.duracao}ms`);

    if (clip.tipoVisual === "video_stock") {
      await executarVideoStock(clip, pastaDownloads, pastaCenas, contadores);

    } else if (clip.tipoVisual === "imagem_ia") {
      await executarImagemIA(clip, pastaDownloads, pastaCenas, contadores);

    } else if (clip.tipoVisual === "remotion_animacao") {
      clipRemotion++;
      const contexto = estadoNarrativo.getContextoParaClip(clipRemotion, totalClipsRemotion);

      if (modoRapido) {
        // Modo rápido: presets existentes (comportamento original)
        await executarRemotionRapido(clip, pastaCenas, contadores, contexto, config.canal);

      } else {
        // Modo API: usa código gerado no batch
        const codigoGerado = batchResultados.get(clip.clipId) ?? null;
        const saida = path.join(pastaCenas, `${clip.clipId}.mp4`);

        const resultado = await compilarERenderizar({
          clipId: clip.clipId,
          codigoTSX: codigoGerado,
          duracao: clip.duracao,
          outputPath: saida,
          paleta: config.canal!.paleta,
        });

        if (resultado === "ok") {
          contadores.remotion++;
          contadores.remotionViaAPI++;
        } else if (resultado === "fallback") {
          contadores.remotion++;
          contadores.remotionTelaPreta++;
          const motivo = codigoGerado === null ? "falhou após retry" : "falhou na compilação";
          contadores.clipsFallback.push(`${clip.clipId}.mp4 (tela preta — ${motivo})`);
        } else {
          contadores.falhas.push(`${clip.clipId}: compilação e fallback falharam`);
        }
      }
    }
  }

  console.log("\n╔════════════════════════════════════╗");
  console.log("║         EXECUÇÃO CONCLUÍDA          ║");
  console.log("╚════════════════════════════════════╝");

  gerarRelatorio(config, plano, contadores, inicioMs, modoRapido);
  await perguntarLimpeza(pastaDownloads, pastaCenas);
}
