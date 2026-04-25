import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { parsearSRT, resumirSRT, Segmento } from "./srt-parser";
import { processarTodosSegmentos, InfoCanal, PaletaThumbnail, SegmentoProcessado } from "./visual-selector";
import { buscarPexelsVideo, gerarImagemReplicate } from "./asset-fetcher";
import { gerarComandoVideoStock, gerarComandoImagemIA, executarFFmpeg } from "./ffmpeg-processor";
import { renderizarFraseImpacto, renderizarKenBurns } from "./remotion-renderer";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export interface ConfigProjeto {
  nome: string;
  pasta: string;
  srtArquivo: string;
  pacoteDadosArquivo: string;
  thumbArquivo: string;
}

function encontrarArquivos(pastaProjeto: string): ConfigProjeto {
  const arquivos = fs.readdirSync(pastaProjeto);

  const srt = arquivos.find(f => f.endsWith(".srt"));
  const pdf = arquivos.find(f => f.endsWith(".pdf"));
  const thumb = arquivos.find(f =>
    f.match(/\.(jpg|jpeg|png|webp)$/i)
  );

  if (!srt) throw new Error("Arquivo .srt não encontrado na pasta do projeto");
  if (!pdf) throw new Error("Arquivo .pdf não encontrado na pasta do projeto");

  return {
    nome: path.basename(pastaProjeto),
    pasta: pastaProjeto,
    srtArquivo: path.join(pastaProjeto, srt),
    pacoteDadosArquivo: path.join(pastaProjeto, pdf),
    thumbArquivo: thumb ? path.join(pastaProjeto, thumb) : "",
  };
}

function extrairInfoCanal(_nomeProjeto: string): InfoCanal {
  // Configuração padrão — será lida do PDF futuramente
  // Por agora usa os dados do Pacote de Dados manualmente
  return {
    nome_canal: "Aroldo do Pix",
    nicho: "Erros financeiros comuns após os 40",
    avatar: "Seu Aroldo",
    gap_de_edicao: "Trocar animações genéricas por imagens evocativas (fotos antigas, cenários de interior, mãos trabalhadas), ritmo pausado, texto na tela reforçando frases-chave, música nostálgica sutil",
    estilo_visual: "Tons terrosos, quentes, alaranjados, sépia. Fazenda, campo, pôr do sol, mãos calejadas, cadeira de madeira, café, gado",
    tom_proibido: "formal acadêmico, técnico excessivo, motivacional exagerado, linguagem corporativa",
    palavras_engajam: ["Hoje me arrependo", "Eu podia ter feito", "De hoje em diante"],
  };
}

function extrairPaleta(_thumbArquivo: string): PaletaThumbnail {
  // Paleta extraída manualmente da thumbnail do Seu Aroldo
  // Futuramente será extraída automaticamente da imagem
  return {
    cor_primaria: "#D4651A",
    cor_secundaria: "#8B4513",
    cor_acento: "#F5C842",
    mood: "quente, reflexivo, nostálgico",
  };
}

async function processarSegmento(
  _segmento: Segmento,
  segmentoProcessado: SegmentoProcessado,
  pastaCenas: string,
  pastaDownloads: string
): Promise<void> {
  for (const clip of segmentoProcessado.clips) {
    console.log(`\n  [${clip.clip_id}] ${clip.tipo} — ${clip.duracao_ms}ms`);

    if (clip.tipo === "video_stock" && clip.queries) {
      const resultado = await buscarPexelsVideo(
        clip.queries,
        clip.duracao_ms,
        clip.clip_id,
        pastaDownloads
      );

      if (resultado.sucesso) {
        const comando = gerarComandoVideoStock(
          clip.clip_id,
          resultado.arquivo_baixado,
          path.join(pastaCenas, `${clip.clip_id}.mp4`),
          clip.duracao_ms
        );
        const resultadoFF = await executarFFmpeg(comando);
        if (resultadoFF.sucesso) {
          console.log(`    ✓ ${clip.clip_id}.mp4 gerado`);
        } else {
          console.log(`    ✗ Erro ffmpeg: ${resultadoFF.erro}`);
        }
      } else {
        console.log(`    ✗ Pexels falhou: ${resultado.erro}`);
        console.log(`    → Tentando fallback com imagem IA...`);

        if (clip.fallback_prompt) {
          await gerarEProcessarImagemIA(
            clip.clip_id,
            clip.fallback_prompt,
            clip.duracao_ms,
            pastaDownloads,
            pastaCenas
          );
        }
      }
    }

    if (clip.tipo === "imagem_ia") {
      const promptFinal = (clip as any).prompt ||
                          (clip as any).fallback_prompt ||
                          (clip as any).image_prompt || "";

      if (promptFinal) {
        const resultado = await gerarImagemReplicate(
          promptFinal,
          clip.clip_id,
          pastaDownloads
        );

        if (resultado.sucesso) {
          const direcoes = ["zoom_in", "zoom_out", "pan_direita", "pan_esquerda"] as const;
          const direcao = direcoes[Math.floor(Math.random() * direcoes.length)];
          const arquivo_saida = path.join(pastaCenas, `${clip.clip_id}.mp4`);

          const resultadoKB = await renderizarKenBurns(
            resultado.arquivo_baixado,
            arquivo_saida,
            clip.duracao_ms,
            direcao
          );

          if (!resultadoKB.sucesso) {
            console.log(`    ✗ KenBurns falhou`);
          }
        } else {
          console.log(`    ✗ Replicate falhou: ${resultado.erro}`);
        }
      } else {
        console.log(`    ✗ Sem prompt para imagem IA no clip ${clip.clip_id}`);
      }
    }

    if (clip.tipo === "remotion") {
      const textoFinal = (clip as any).texto_animado ||
                         (clip as any).texto ||
                         (clip as any).texto_animacao || "";

      if (textoFinal) {
        const arquivo_saida = path.join(pastaCenas, `${clip.clip_id}.mp4`);
        const tercoEstilo = (segmentoProcessado.terco === "agressivo"
          ? "agressivo"
          : segmentoProcessado.terco === "duvidoso"
          ? "duvidoso"
          : "esperancoso") as "agressivo" | "duvidoso" | "esperancoso";

        const resultado = await renderizarFraseImpacto(
          textoFinal,
          arquivo_saida,
          clip.duracao_ms,
          tercoEstilo
        );
        if (!resultado.sucesso) {
          console.log(`    → Remotion falhou, pulando clip...`);
        }
      } else {
        console.log(`    ✗ Sem texto para remotion no clip ${clip.clip_id}`);
      }
    }
  }
}

async function gerarEProcessarImagemIA(
  clip_id: string,
  prompt: string,
  duracao_ms: number,
  pastaDownloads: string,
  pastaCenas: string
): Promise<void> {
  const resultado = await gerarImagemReplicate(
    prompt,
    clip_id,
    pastaDownloads
  );

  if (resultado.sucesso) {
    const direcao = ["in", "out"][Math.floor(Math.random() * 2)] as "in" | "out";
    const arquivo_saida = path.join(pastaCenas, `${clip_id}.mp4`);
    const comando = gerarComandoImagemIA(
      clip_id,
      resultado.arquivo_baixado,
      arquivo_saida,
      duracao_ms,
      1.08,
      direcao
    );
    const resultadoFF = await executarFFmpeg(comando);
    if (resultadoFF.sucesso) {
      console.log(`    ✓ ${clip_id}.mp4 gerado (imagem IA + Ken Burns ffmpeg)`);
    } else {
      console.log(`    ✗ ffmpeg falhou: ${resultadoFF.erro}`);
    }
  } else {
    console.log(`    ✗ Replicate falhou: ${resultado.erro}`);
  }
}

function salvarTimeline(
  segmentosProcessados: SegmentoProcessado[],
  config: ConfigProjeto,
  infoCanal: InfoCanal,
  paleta: PaletaThumbnail,
  pastaOutput: string
): void {
  const totalClips = segmentosProcessados.reduce(
    (acc, s) => acc + s.clips.length, 0
  );

  const timeline = {
    video_info: {
      canal: infoCanal.nome_canal,
      nicho: infoCanal.nicho,
      projeto: config.nome,
      gerado_em: new Date().toLocaleString("pt-BR"),
      total_segmentos: segmentosProcessados.length,
      total_clips: totalClips,
      duracao_total_ms: segmentosProcessados[segmentosProcessados.length - 1]?.fim_ms || 0,
      gap_de_edicao: infoCanal.gap_de_edicao,
    },
    paleta_thumbnail: paleta,
    segmentos: segmentosProcessados,
  };

  const arquivo = path.join(pastaOutput, "timeline.json");
  fs.writeFileSync(arquivo, JSON.stringify(timeline, null, 2), "utf-8");
  console.log(`\nTimeline salva: ${arquivo}`);
}

async function main() {
  console.log("╔════════════════════════════════════╗");
  console.log("║       SKILL-EDIÇÃO — INICIANDO      ║");
  console.log("╚════════════════════════════════════╝\n");

  const argProjeto = process.argv[2];
  if (!argProjeto) {
    console.log("Uso: npx tsx src/index.ts <nome-do-projeto>");
    console.log("Exemplo: npx tsx src/index.ts aroldo-001-quarenta-anos");
    console.log("\nProjetos disponíveis em /projetos:");
    const pastasProjetos = path.join(__dirname, "../projetos");
    if (fs.existsSync(pastasProjetos)) {
      fs.readdirSync(pastasProjetos).forEach(p => console.log(`  - ${p}`));
    }
    process.exit(0);
  }

  const pastaProjeto = path.join(__dirname, "../projetos", argProjeto);
  if (!fs.existsSync(pastaProjeto)) {
    console.error(`Projeto não encontrado: ${pastaProjeto}`);
    process.exit(1);
  }

  // 1. Encontrar e validar arquivos
  console.log(`Projeto: ${argProjeto}`);
  const config = encontrarArquivos(pastaProjeto);
  console.log(`SRT: ${path.basename(config.srtArquivo)}`);
  console.log(`PDF: ${path.basename(config.pacoteDadosArquivo)}`);
  console.log(`Thumb: ${config.thumbArquivo ? path.basename(config.thumbArquivo) : "não encontrada"}\n`);

  // 2. Criar estrutura de pastas do projeto
  const pastaOutput = path.join(pastaProjeto, "output");
  const pastaCenas = path.join(pastaProjeto, "output", "cenas");
  const pastaDownloads = path.join(pastaProjeto, "output", "downloads");
  [pastaOutput, pastaCenas, pastaDownloads].forEach(p => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });

  // 3. Ler e parsear SRT
  console.log("Lendo SRT...");
  const segmentos = parsearSRT(config.srtArquivo);
  resumirSRT(segmentos);

  // 4. Extrair informações do canal e paleta
  const infoCanal = extrairInfoCanal(config.nome);
  const paleta = extrairPaleta(config.thumbArquivo);
  console.log(`\nCanal: ${infoCanal.nome_canal}`);
  console.log(`Paleta: ${paleta.cor_primaria} / ${paleta.cor_secundaria} / ${paleta.cor_acento}\n`);

  // 5. Processar todos os segmentos com IA em uma única chamada
  const segmentosProcessados = await processarTodosSegmentos(segmentos, infoCanal, paleta);

  // 6. Salvar timeline antes de baixar (garante que não perde nada)
  console.log("\nSalvando timeline.json...");
  salvarTimeline(segmentosProcessados, config, infoCanal, paleta, pastaOutput);

  // 7. Baixar e processar assets
  console.log("\n═══ GERANDO CLIPS ═══");
  for (const segmentoProcessado of segmentosProcessados) {
    const segmento = segmentos.find(s => s.id === segmentoProcessado.id)!;
    console.log(`\nSegmento ${segmentoProcessado.id} — ${segmentoProcessado.tipo_momento}`);
    await processarSegmento(
      segmento,
      segmentoProcessado,
      pastaCenas,
      pastaDownloads
    );
  }

  // 8. Resumo final
  const clipsGerados = fs.readdirSync(pastaCenas).filter(f => f.endsWith(".mp4")).length;
  console.log("\n╔════════════════════════════════════╗");
  console.log("║         PROCESSAMENTO CONCLUÍDO      ║");
  console.log("╚════════════════════════════════════╝");
  console.log(`Clips gerados: ${clipsGerados}`);
  console.log(`Pasta: ${pastaCenas}`);
  console.log(`Timeline: ${pastaOutput}/timeline.json`);
}

main().catch(console.error);
