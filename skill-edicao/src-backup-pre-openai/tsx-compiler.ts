import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { renderizarTemplateExistente, montarPropsTemplate } from "./remotion-renderer";

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
  contexto?: string;
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

function sanitizarCodigoTSX(codigo: string): string {
  let resultado = codigo
    .replace(/easing\s*:\s*Easing\.([a-zA-Z]+)\(\)/g, 'easing: Easing.$1')
    .replace(/easing\s*:\s*([a-zA-Z]+)\.([a-zA-Z]+)\(\)/g, 'easing: $1.$2')
    .replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]remotion['"]/g,
      (_match, imports) => {
        const necessarios = ['useCurrentFrame', 'useVideoConfig',
          'interpolate', 'spring', 'Easing', 'AbsoluteFill', 'Sequence'];
        const existentes = imports.split(',').map((i: string) => i.trim()).filter(Boolean);
        const todos = [...new Set([...existentes, ...necessarios])];
        return `import { ${todos.join(', ')} } from 'remotion'`;
      }
    )
    .replace(/import.*from\s+['"](?!react|remotion)[^'"]+['"]\s*;?\n?/g, '')
    .replace(/export\s+default\s+/g, 'export const AnimacaoGerada = ');

  if (!resultado.includes('zIndex') && resultado.includes('position: "absolute"')) {
    console.warn('  ⚠ Aviso: código sem zIndex explícito — verifique legibilidade do texto');
  }

  const temFundoRgba = resultado.includes('backgroundColor') && resultado.includes('rgba');
  if (!temFundoRgba) {
    console.warn(`  ⚠ Legibilidade: sem backgroundColor com rgba — texto pode ser ilegível sobre o vídeo.`);
  }

  const temZIndexAlto = /zIndex\s*:\s*(9999|100)\b/.test(resultado);
  if (!temZIndexAlto && resultado.includes('export const AnimacaoGerada')) {
    resultado = resultado.replace(
      /export const AnimacaoGerada\s*=/,
      'const AnimacaoGeradaInner ='
    );
    resultado += `\nexport const AnimacaoGerada: React.FC = () => (\n  <AbsoluteFill style={{ position: 'absolute', zIndex: 9999 }}>\n    <AnimacaoGeradaInner />\n  </AbsoluteFill>\n);`;
  }

  return resultado;
}

function gerarTSXMinimo(params: ParamsCompilar): string {
  const textoJson = JSON.stringify(params.contexto ?? "");
  const corTexto  = JSON.stringify(params.paleta.texto);

  return (
    `import React from 'react';\n` +
    `import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from 'remotion';\n` +
    `\n` +
    `export const AnimacaoGerada: React.FC = () => {\n` +
    `  const frame = useCurrentFrame();\n` +
    `  const { durationInFrames } = useVideoConfig();\n` +
    `  const opacity = interpolate(\n` +
    `    frame,\n` +
    `    [0, 15, durationInFrames - 15, durationInFrames],\n` +
    `    [0, 1, 1, 0],\n` +
    `    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }\n` +
    `  );\n` +
    `  return (\n` +
    `    <AbsoluteFill style={{\n` +
    `      background: "linear-gradient(160deg, #1a1008 0%, #2a1a0a 100%)",\n` +
    `      display: "flex",\n` +
    `      alignItems: "center",\n` +
    `      justifyContent: "center"\n` +
    `    }}>\n` +
    `      <div style={{\n` +
    `        opacity,\n` +
    `        color: ${corTexto},\n` +
    `        fontSize: 72,\n` +
    `        fontFamily: "Georgia, serif",\n` +
    `        textAlign: "center",\n` +
    `        backgroundColor: "rgba(0,0,0,0.75)",\n` +
    `        borderRadius: 8,\n` +
    `        padding: "16px 32px",\n` +
    `        maxWidth: "80%",\n` +
    `        zIndex: 100\n` +
    `      }}>\n` +
    `        {${textoJson}}\n` +
    `      </div>\n` +
    `    </AbsoluteFill>\n` +
    `  );\n` +
    `};\n`
  );
}

export async function compilarERenderizar(params: ParamsCompilar): Promise<ResultadoCompilacao> {
  const { clipId, codigoTSX, duracao, outputPath } = params;
  const fps    = 30;
  const frames = Math.ceil((duracao / 1000) * fps);

  if (!fs.existsSync(GERADO_DIR)) {
    fs.mkdirSync(GERADO_DIR, { recursive: true });
  }

  const tsxPath   = path.join(GERADO_DIR, "AnimacaoGerada.tsx");
  const rootPath  = path.join(GERADO_DIR, "RootGerado.tsx");
  const indexPath = path.join(GERADO_DIR, "index-gerado.ts");
  const bundleDir = path.join(REMOTION_DIR, `bundle-gerado-${clipId}`);

  const limpar = () => {
    for (const p of [tsxPath, rootPath, indexPath]) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    }
    try {
      if (fs.existsSync(bundleDir)) fs.rmSync(bundleDir, { recursive: true, force: true });
    } catch {}
  };

  const tentarCompilar = async (codigo: string): Promise<void> => {
    if (!fs.existsSync(bundleDir)) fs.mkdirSync(bundleDir, { recursive: true });

    fs.writeFileSync(tsxPath,   codigo,                          "utf-8");
    fs.writeFileSync(rootPath,  criarConteudoRootGerado(frames), "utf-8");
    fs.writeFileSync(indexPath, criarConteudoIndexGerado(),      "utf-8");

    const { bundle }                         = await import("@remotion/bundler");
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
  };

  // TENTATIVA 1: código gerado pela API
  if (codigoTSX !== null) {
    try {
      await tentarCompilar(sanitizarCodigoTSX(codigoTSX));
      limpar();
      console.log(`  ✓ Remotion (template-customizado/${clipId}): ${path.basename(outputPath)}`);
      return "ok";
    } catch (erro: any) {
      console.log(`  ✗ Tentativa 1 falhou: ${String(erro?.message ?? "").substring(0, 120)}`);
      console.log(`  Início do código gerado: ${codigoTSX.substring(0, 300)}`);
      limpar();
    }
  } else {
    console.log(`  ✗ Sem código — tentando TSX mínimo`);
  }

  // TENTATIVA 2: TSX mínimo gerado programaticamente
  console.log(`  → Tentativa 2: TSX mínimo garantido`);
  try {
    await tentarCompilar(gerarTSXMinimo(params));
    limpar();
    console.log(`  ✓ Remotion (tsx-minimo/${clipId}): ${path.basename(outputPath)}`);
    return "fallback";
  } catch (erro: any) {
    console.log(`  ✗ Tentativa 2 falhou: ${String(erro?.message ?? "").substring(0, 120)}`);
    limpar();
  }

  // TENTATIVA 3: tela preta (último recurso)
  console.log(`  → Tentativa 3: tela preta`);
  const ok = await gerarTelaPreta(duracao, outputPath);
  if (ok) console.log(`  → ${path.basename(outputPath)} (fallback — substituir na edição)`);
  return ok ? "fallback" : "erro";
}

export async function compilarTemplateExistente(params: {
  clipId: string;
  compositionId: string;
  outputPath: string;
  duracao: number;
  paleta: PaletaCompilador;
  contexto: string;
  tom: string;
}): Promise<ResultadoCompilacao> {
  const fps = 30;
  const durationInFrames = Math.ceil((params.duracao / 1000) * fps);

  const props = montarPropsTemplate({
    texto: params.contexto,
    paleta: params.paleta,
    tom: params.tom,
  });

  const resultado = await renderizarTemplateExistente({
    compositionId: params.compositionId,
    outputPath: params.outputPath,
    durationInFrames,
    props,
  });

  if (resultado === "ok") return "ok";

  console.log(`  ✗ Template (${params.compositionId}/${params.clipId}) falhou — gerando tela preta`);
  const ok = await gerarTelaPreta(params.duracao, params.outputPath);
  if (ok) console.log(`  → ${path.basename(params.outputPath)} (fallback — substituir na edição)`);
  return ok ? "fallback" : "erro";
}
