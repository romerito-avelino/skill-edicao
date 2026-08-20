import * as fs from "fs";
import * as path from "path";
import { execSync, exec } from "child_process";

export interface ComandoFFmpeg {
  clip_id: string;
  tipo: "video_stock" | "imagem_ia" | "remotion";
  arquivo_entrada: string;
  arquivo_saida: string;
  duracao_ms: number;
  comando: string;
}

export interface ResultadoFFmpeg {
  clip_id: string;
  sucesso: boolean;
  arquivo_final: string;
  erro?: string;
  duracao_real_ms?: number;
}

function ffmpegDisponivel(): boolean {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function msParaSegundos(ms: number): string {
  return (ms / 1000).toFixed(3);
}

// ── Máscaras visuais para vídeo stock ──────────────────────────
// Dá um "fingerprint" visual único a cada clipe de banco gratuito.
// Cada máscara é uma cadeia de filtros FFmpeg testada.
// Nota: partículas flutuantes reais exigem um asset de overlay
// (não há filtro nativo). Aqui "grao_filme" faz o papel de textura leve.
const MASCARAS_STOCK: Record<string, string> = {
  preto_branco:    "hue=s=0",
  desfoque_leve:   "gblur=sigma=1.2",
  saturacao_alta:  "eq=saturation=1.35:contrast=1.04",
  saturacao_baixa: "eq=saturation=0.72:brightness=0.02",
  vinheta:         "vignette=PI/5",
  grao_filme:      "noise=alls=10:allf=t",
  // hflip fica FORA do sorteio (espelha texto/rostos/logos).
  // Só é aplicado se passado manualmente em mascaraForcada.
  inversao_horizontal: "hflip",
};

// Pool do sorteio automático (sem hflip, por segurança).
const POOL_MASCARAS_AUTO = [
  "preto_branco",
  "desfoque_leve",
  "saturacao_alta",
  "saturacao_baixa",
  "vinheta",
  "grao_filme",
];

function hashClipId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Determinístico: mesmo clip_id → mesma máscara (reprodutível),
// mas clips diferentes variam entre si.
function escolherMascaraAuto(clipId: string): string {
  const chave =
    POOL_MASCARAS_AUTO[hashClipId(clipId) % POOL_MASCARAS_AUTO.length];
  return MASCARAS_STOCK[chave];
}

export function gerarComandoVideoStock(
  clip_id: string,
  arquivo_entrada: string,
  arquivo_saida: string,
  duracao_ms: number,
  mascaraForcada?: string | null // undefined = sorteio; null = sem máscara; string = máscara específica
): ComandoFFmpeg {
  const duracao = msParaSegundos(duracao_ms);

  const filtros = [
    "scale=1920:1080:force_original_aspect_ratio=decrease",
    "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black",
  ];

  let mascaraAplicada: string | null;
  if (mascaraForcada === null) {
    mascaraAplicada = null; // desliga a máscara
  } else if (typeof mascaraForcada === "string") {
    // aceita nome do dicionário OU um filtro cru
    mascaraAplicada = MASCARAS_STOCK[mascaraForcada] ?? mascaraForcada;
  } else {
    mascaraAplicada = escolherMascaraAuto(clip_id); // padrão automático
  }
  if (mascaraAplicada) filtros.push(mascaraAplicada);

  const vf = filtros.join(",");

  const comando = [
    "ffmpeg -y",
    `-i "${arquivo_entrada}"`,
    `-t ${duracao}`,
    `-vf "${vf}"`,
    `-r 30`,
    `-c:v libx264 -preset fast -crf 18`,
    `-an`,
    `"${arquivo_saida}"`,
  ].join(" ");

  return {
    clip_id,
    tipo: "video_stock",
    arquivo_entrada,
    arquivo_saida,
    duracao_ms,
    comando,
  };
}

// ── Placeholder de cena-herói ──────────────────────────────────
// Cena-herói NÃO é gerada no pipeline — recebe um MP4 de duração exata
// que guarda o lugar na timeline, até ser substituído pela cena real
// feita no chat + Remotion MCP. O metadado PLACEHOLDER-HEROI é como o
// --reincorporar detecta que o slot ainda está pendente.
export interface ParametrosPlaceholder {
  clipId: string;
  duracaoMs: number;
  fraseImpacto: string;
  paleta: {
    primaria: string;
    secundaria: string;
    destaque: string;
    texto: string;
    fundo: string;
  };
  outputPath: string;
}

function escaparDrawtext(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "’") // aspas simples quebrariam o quoting do filtro
    .replace(/%/g, "\\%");
}

function quebrarLinha(texto: string, maxChars = 40): string {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const candidata = (atual + " " + p).trim();
    if (candidata.length > maxChars && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = candidata;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.join("\n");
}

export async function gerarPlaceholder(
  params: ParametrosPlaceholder
): Promise<ResultadoFFmpeg> {
  const { clipId, duracaoMs, fraseImpacto, outputPath } = params;
  const duracao = msParaSegundos(duracaoMs);

  const pastaSaida = path.dirname(outputPath);
  if (!fs.existsSync(pastaSaida)) {
    fs.mkdirSync(pastaSaida, { recursive: true });
  }

  const clipIdTexto = escaparDrawtext(clipId);
  const fraseTexto = escaparDrawtext(quebrarLinha(fraseImpacto));

  const vf = [
    `drawtext=text='CENA-HERÓI ${clipIdTexto}':fontcolor=white:fontsize=48:x=(w-tw)/2:y=120`,
    `drawtext=text='${duracao}s':fontcolor=#8888aa:fontsize=36:x=(w-tw)/2:y=200`,
    `drawtext=text='${fraseTexto}':fontcolor=#dddddd:fontsize=40:x=(w-tw)/2:y=(h-th)/2:line_spacing=12`,
  ].join(",");

  const comando = [
    "ffmpeg -y",
    `-f lavfi -i "color=c=0x1A1A2E:s=1920x1080:d=${duracao}:r=30"`,
    `-vf "${vf}"`,
    `-c:v libx264 -preset fast -crf 20 -an -t ${duracao}`,
    `-metadata comment="PLACEHOLDER-HEROI"`,
    `"${outputPath}"`,
  ].join(" ");

  return new Promise((resolve) => {
    exec(comando, (erro) => {
      if (erro) {
        resolve({
          clip_id: clipId,
          sucesso: false,
          arquivo_final: "",
          erro: erro.message,
        });
        return;
      }
      resolve({
        clip_id: clipId,
        sucesso: true,
        arquivo_final: outputPath,
        duracao_real_ms: duracaoMs,
      });
    });
  });
}

export function gerarComandoImagemIA(
  clip_id: string,
  arquivo_entrada: string,
  arquivo_saida: string,
  duracao_ms: number,
  zoom_fator: number = 1.08,
  direcao: "in" | "out" = "in"
): ComandoFFmpeg {
  const duracao = msParaSegundos(duracao_ms);
  const entrada_escaped = arquivo_entrada.replace(/\\/g, "/");
  const saida_escaped = arquivo_saida.replace(/\\/g, "/");

  const escala_inicio = direcao === "in" ? "1.0" : zoom_fator.toFixed(3);

  const comando = `ffmpeg -y -loop 1 -i "${entrada_escaped}" -t ${duracao} -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='if(eq(on\\,1)\\,${escala_inicio}\\,zoom+0.0005)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30" -c:v libx264 -preset fast -crf 18 -an "${saida_escaped}"`;

  return {
    clip_id,
    tipo: "imagem_ia",
    arquivo_entrada,
    arquivo_saida,
    duracao_ms,
    comando,
  };
}

export function gerarComandoTextoAnimado(
  clip_id: string,
  texto: string,
  arquivo_saida: string,
  duracao_ms: number,
  cor_texto: string = "white"
): ComandoFFmpeg {
  const remotion_path = path.resolve(
    __dirname,
    "..",
    "..",
    "Remotion"
  );
  const saida_absoluta = path.resolve(arquivo_saida);
  const fps = 30;
  const frames = Math.ceil((duracao_ms / 1000) * fps);

  const props = {
    texto,
    cor: cor_texto,
    frames,
  };

  const props_arquivo = path.resolve(
    __dirname,
    "..",
    "temp",
    `${clip_id}-props.json`
  );

  const pasta_temp = path.resolve(__dirname, "..", "temp");
  if (!fs.existsSync(pasta_temp)) {
    fs.mkdirSync(pasta_temp, { recursive: true });
  }

  fs.writeFileSync(props_arquivo, JSON.stringify(props), "utf-8");

  const comando = [
    `cd "${remotion_path}" &&`,
    `npx remotion render src/index.ts FraseImpacto`,
    `--props="${props_arquivo}"`,
    `--frames=0-${frames - 1}`,
    `--output "${saida_absoluta}"`,
  ].join(" ");

  return {
    clip_id,
    tipo: "remotion",
    arquivo_entrada: "",
    arquivo_saida,
    duracao_ms,
    comando,
  };
}

export async function executarFFmpeg(
  comandoObj: ComandoFFmpeg
): Promise<ResultadoFFmpeg> {
  const pasta_saida = path.dirname(comandoObj.arquivo_saida);
  if (!fs.existsSync(pasta_saida)) {
    fs.mkdirSync(pasta_saida, { recursive: true });
  }

  return new Promise((resolve) => {
    console.log(`  Processando ${comandoObj.clip_id}...`);

    exec(comandoObj.comando, (erro, _stdout, _stderr) => {
      if (erro) {
        resolve({
          clip_id: comandoObj.clip_id,
          sucesso: false,
          arquivo_final: "",
          erro: erro.message,
        });
        return;
      }

      resolve({
        clip_id: comandoObj.clip_id,
        sucesso: true,
        arquivo_final: comandoObj.arquivo_saida,
        duracao_real_ms: comandoObj.duracao_ms,
      });
    });
  });
}

export function gerarTodosComandos(
  clips: Array<{
    clip_id: string;
    tipo: string;
    arquivo_fonte: string;
    arquivo_final: string;
    duracao_ms: number;
    animacao_remotion?: string;
    zoom_fator?: number;
    texto_animado?: string;
  }>
): ComandoFFmpeg[] {
  const comandos: ComandoFFmpeg[] = [];

  for (const clip of clips) {
    if (clip.tipo === "video_stock") {
      comandos.push(
        gerarComandoVideoStock(
          clip.clip_id,
          clip.arquivo_fonte,
          clip.arquivo_final,
          clip.duracao_ms
        )
      );
    } else if (clip.tipo === "imagem_ia") {
      const direcao = clip.animacao_remotion?.includes("out") ? "out" : "in";
      comandos.push(
        gerarComandoImagemIA(
          clip.clip_id,
          clip.arquivo_fonte,
          clip.arquivo_final,
          clip.duracao_ms,
          clip.zoom_fator || 1.08,
          direcao
        )
      );
    } else if (clip.tipo === "remotion" && clip.texto_animado) {
      comandos.push(
        gerarComandoTextoAnimado(
          clip.clip_id,
          clip.texto_animado,
          clip.arquivo_final,
          clip.duracao_ms
        )
      );
    }
  }

  return comandos;
}

export function salvarScriptFFmpeg(
  comandos: ComandoFFmpeg[],
  arquivo_saida: string
): void {
  const linhas = [
    ":: Script de processamento ffmpeg — gerado pela Skill-Edição",
    `:: Total de clips: ${comandos.length}`,
    `:: Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    ...comandos.map(
      (c) => `:: Clip ${c.clip_id} (${c.tipo} — ${c.duracao_ms}ms)\n${c.comando}\n`
    ),
  ];

  fs.writeFileSync(arquivo_saida, linhas.join("\n"), "utf-8");
  console.log(`Script salvo: ${arquivo_saida}`);
}

if (require.main === module) {
  console.log("=== FFMPEG PROCESSOR ===");

  const disponivel = ffmpegDisponivel();
  console.log(`ffmpeg: ${disponivel ? "instalado e disponível" : "NÃO encontrado"}`);

  if (!disponivel) {
    console.log("\nInstale o ffmpeg:");
    console.log("Windows: https://ffmpeg.org/download.html");
    console.log("Ou via winget: winget install ffmpeg");
  } else {
    console.log("\nTestando geração de comando...");
    const cmd = gerarComandoVideoStock(
      "001-01",
      "assets/downloaded/001-01_source.mp4",
      "cenas/001-01.mp4",
      6000
    );
    console.log("\nComando gerado:");
    console.log(cmd.comando);
  }
}
