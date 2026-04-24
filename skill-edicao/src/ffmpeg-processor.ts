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

export function gerarComandoVideoStock(
  clip_id: string,
  arquivo_entrada: string,
  arquivo_saida: string,
  duracao_ms: number
): ComandoFFmpeg {
  const duracao = msParaSegundos(duracao_ms);
  const comando = [
    "ffmpeg -y",
    `-i "${arquivo_entrada}"`,
    `-t ${duracao}`,
    `-vf "scale=1920:1080:force_original_aspect_ratio=decrease,`,
    `pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black"`,
    `-r 30`,
    `-c:v libx264 -preset fast -crf 18`,
    `-an`,
    `"${arquivo_saida}"`,
  ]
    .join(" ")
    .replace(/\n/g, "");

  return {
    clip_id,
    tipo: "video_stock",
    arquivo_entrada,
    arquivo_saida,
    duracao_ms,
    comando,
  };
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
  const fps = 30;
  const total_frames = Math.ceil((duracao_ms / 1000) * fps);

  const zoom_inicio = direcao === "in" ? 1.0 : zoom_fator;
  const zoom_fim = direcao === "in" ? zoom_fator : 1.0;
  const zoom_step = ((zoom_fim - zoom_inicio) / total_frames).toFixed(6);

  const filtro_zoom = [
    `scale=8000:-1`,
    `zoompan=z='${zoom_inicio}+${zoom_step}*on':`,
    `x='iw/2-(iw/zoom/2)':`,
    `y='ih/2-(ih/zoom/2)':`,
    `d=${total_frames}:s=1920x1080:fps=${fps}`,
  ]
    .join("")
    .replace(/\n/g, "");

  const comando = [
    "ffmpeg -y",
    `-loop 1 -i "${arquivo_entrada}"`,
    `-t ${duracao}`,
    `-vf "${filtro_zoom}"`,
    `-c:v libx264 -preset fast -crf 18`,
    `-an`,
    `"${arquivo_saida}"`,
  ].join(" ");

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
