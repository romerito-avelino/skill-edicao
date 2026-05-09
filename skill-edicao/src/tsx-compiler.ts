import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

export type ResultadoCompilacao = "ok" | "fallback" | "erro";

export interface PaletaCompilador {
  primaria: string;
  secundaria: string;
  destaque: string;
  texto: string;
  fundo: string;
}

export interface ParamsCompilar {
  clipId: string;
  codigoTSX: string | null;
  duracao: number;
  outputPath: string;
  paleta: PaletaCompilador;
}

const REMOTION_DIR = path.resolve(__dirname, "..", "..", "Remotion");
const GERADO_DIR  = path.join(REMOTION_DIR, "src", "gerado");

function execAsync(comando: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(comando, { timeout: 60000 }, (erro) => {
      if (erro) reject(erro);
      else resolve();
    });
  });
}

async function gerarTelaPreta(duracao: number, outputPath: string): Promise<boolean> {
  const pasta = path.dirname(outputPath);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

  const duracaoSeg = (duracao / 1000).toFixed(3);
  const out = outputPath.replace(/\\/g, "/");
  const comando = `ffmpeg -y -f lavfi -i "color=c=0x0A0A0A:size=1920x1080:rate=30" -t ${duracaoSeg} -c:v libx264 -pix_fmt yuv420p "${out}"`;

  try {
    await execAsync(comando);
    return true;
  } catch {
    return false;
  }
}

function criarConteudoRootGerado(frames: number): string {
  return `import React from "react";
import { Composition } from "remotion";
import { AnimacaoGerada } from "./AnimacaoGerada";

export const RootGerado: React.FC = () => (
  <Composition
    id="AnimacaoGerada"
    component={AnimacaoGerada}
    durationInFrames={${frames}}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{}}
  />
);
`;
}

function criarConteudoIndexGerado(): string {
  return `import { registerRoot } from "remotion";
import { RootGerado } from "./RootGerado";

registerRoot(RootGerado);
`;
}

export async function compilarERenderizar(params: ParamsCompilar): Promise<ResultadoCompilacao> {
  const { clipId, codigoTSX, duracao, outputPath } = params;
  const fps    = 30;
  const frames = Math.ceil((duracao / 1000) * fps);

  // Caminho nulo → tela preta direta (falhou no batch)
  if (codigoTSX === null) {
    console.log(`  ✗ Sem código — gerando tela preta`);
    const ok = await gerarTelaPreta(duracao, outputPath);
    if (ok) console.log(`  → ${path.basename(outputPath)} (fallback — substituir na edição)`);
    return ok ? "fallback" : "erro";
  }

  // Garante pasta de temp
  if (!fs.existsSync(GERADO_DIR)) {
    fs.mkdirSync(GERADO_DIR, { recursive: true });
  }

  const tsxPath   = path.join(GERADO_DIR, "AnimacaoGerada.tsx");
  const rootPath  = path.join(GERADO_DIR, "RootGerado.tsx");
  const indexPath = path.join(GERADO_DIR, "index-gerado.ts");

  // Diretório de bundle único por clip para evitar cache cruzado
  const bundleDir = path.join(REMOTION_DIR, `bundle-gerado-${clipId}`);

  try {
    fs.writeFileSync(tsxPath,   codigoTSX,                         "utf-8");
    fs.writeFileSync(rootPath,  criarConteudoRootGerado(frames),   "utf-8");
    fs.writeFileSync(indexPath, criarConteudoIndexGerado(),         "utf-8");

    if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir, { recursive: true });

    const { bundle }                       = await import("@remotion/bundler");
    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const bundleUrl = await bundle({
      entryPoint: indexPath,
      outDir: bundleDir,
      onProgress: () => {},
    });

    const pasta = path.dirname(outputPath);
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

    const composition = await selectComposition({
      serveUrl: bundleUrl,
      id: "AnimacaoGerada",
      inputProps: {},
    });

    await renderMedia({
      composition: { ...composition, durationInFrames: frames, fps, width: 1920, height: 1080 },
      serveUrl: bundleUrl,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: {},
      logLevel: "error",
    });

    console.log(`  ✓ Remotion (template-customizado/${clipId}): ${path.basename(outputPath)}`);
    return "ok";

  } catch (erro: any) {
    console.log(`  ✗ Erro de compilação — gerando tela preta`);
    if (erro?.message) console.log(`    ${String(erro.message).substring(0, 120)}`);

    const ok = await gerarTelaPreta(duracao, outputPath);
    if (ok) console.log(`  → ${path.basename(outputPath)} (fallback — substituir na edição)`);
    return ok ? "fallback" : "erro";

  } finally {
    // Limpa arquivos temporários de código (bundle dir é mantido para debug)
    for (const p of [tsxPath, rootPath, indexPath]) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    }
    // Remove bundle dir para não acumular em disco
    try {
      if (fs.existsSync(bundleDir)) fs.rmSync(bundleDir, { recursive: true, force: true });
    } catch {}
  }
}
