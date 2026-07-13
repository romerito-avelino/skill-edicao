import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { listarTemplatesDisponiveis, lerMetadadosTemplate, MetadadosTemplate } from "./hyperframes-templates";
import { TEMPLATES_INCOMPATIVEIS } from "./hyperframes-renderer";
import { mapearVariaveis, PaletaCanal } from "./cena-aprovacao";

const HYPERFRAMES_PROJECT = path.resolve(__dirname, "..", "..", "HyperFrames", "myproject");
const COMPOSITIONS_DIR = path.join(HYPERFRAMES_PROJECT, "compositions");
const OUTPUT_DIR = path.resolve(__dirname, "..", "teste-templates");

const FRASE_TESTE = "Essa é uma frase de teste para validação visual completa do template";

const PALETA_TESTE: PaletaCanal = {
  primaria:   "#1A1A2E",
  secundaria: "#16213E",
  destaque:   "#F5C842",
  texto:      "#FFFFFF",
  fundo:      "rgba(0,0,0,0.85)",
};

const DADOS_VISUAIS_TESTE: Record<string, unknown> = { valor: 42, quantidade: 7, ano: 2026 };

function encontrarHtml(nome: string): string | null {
  for (const dir of [COMPOSITIONS_DIR, path.join(COMPOSITIONS_DIR, "components")]) {
    const p = path.join(dir, `${nome}.html`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function execAsync(comando: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(comando, { timeout: 300000, cwd }, (err, _stdout, stderr) => {
      if (err) {
        console.log("  Stderr:", stderr.substring(0, 300));
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function renderizarTemplate(nome: string, meta: MetadadosTemplate): Promise<void> {
  const variaveis = mapearVariaveis(
    meta.variaveis, FRASE_TESTE, DADOS_VISUAIS_TESTE, PALETA_TESTE, nome
  );

  const htmlPath = encontrarHtml(nome);
  if (!htmlPath) throw new Error(`HTML não encontrado: ${nome}`);

  let htmlContent = fs.readFileSync(htmlPath, "utf-8");

  // Garante data-width/data-height = 1920/1080 no elemento com data-composition-id
  htmlContent = htmlContent
    .replace(/data-width="[^"]*"/g,  `data-width="1920"`)
    .replace(/data-height="[^"]*"/g, `data-height="1080"`);
  if (/<html[^>]*data-composition-id/i.test(htmlContent) && !/<html[^>]*data-width/i.test(htmlContent)) {
    htmlContent = htmlContent.replace(
      /(data-composition-id="[^"]*")/,
      `$1 data-width="1920" data-height="1080"`
    );
  }

  const tempHtml = path.join(COMPOSITIONS_DIR, `teste-${nome}.html`);
  const tempVars = path.join(HYPERFRAMES_PROJECT, `temp-vars-teste-${nome}.json`);
  const outputPath = path.join(OUTPUT_DIR, `${nome}.mp4`);

  fs.writeFileSync(tempHtml, htmlContent, "utf-8");
  fs.writeFileSync(tempVars, JSON.stringify(variaveis), "utf-8");

  try {
    const relComposition = path.relative(HYPERFRAMES_PROJECT, tempHtml).replace(/\\/g, "/");
    const projectArg = HYPERFRAMES_PROJECT.replace(/\\/g, "/");
    const outputArg  = outputPath.replace(/\\/g, "/");
    const varsArg    = tempVars.replace(/\\/g, "/");

    const comando = `npx hyperframes@0.6.110 render "${projectArg}" --composition "${relComposition}" --variables-file "${varsArg}" --output "${outputArg}"`;
    await execAsync(comando, HYPERFRAMES_PROJECT);
  } finally {
    try { fs.unlinkSync(tempHtml); } catch { /* ignora erro de limpeza */ }
    try { fs.unlinkSync(tempVars); } catch { /* ignora erro de limpeza */ }
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const todos = listarTemplatesDisponiveis();
  const templates = todos.filter(nome =>
    !TEMPLATES_INCOMPATIVEIS.has(nome) &&
    !/^clip-\d/.test(nome)
  );

  const total = templates.length;
  console.log(`\nTestando ${total} templates → ${OUTPUT_DIR}\n`);

  const sucessos: string[] = [];
  const falhas:   string[] = [];
  const pulados:  string[] = [];

  for (let i = 0; i < templates.length; i++) {
    const nome    = templates[i];
    const prefixo = `[${i + 1}/${total}] ${nome}`;

    const meta = lerMetadadosTemplate(nome, true);
    if (!meta) {
      console.log(`${prefixo}: [pulado] sem variáveis declaradas`);
      pulados.push(nome);
      continue;
    }

    console.log(`${prefixo}: renderizando...`);
    try {
      await renderizarTemplate(nome, meta);
      console.log(`${prefixo}: ✓ ok`);
      sucessos.push(nome);
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err).substring(0, 120);
      console.log(`${prefixo}: FALHOU — ${msg}`);
      falhas.push(nome);
    }
  }

  const linha = "─".repeat(60);
  console.log(`\n${linha}`);
  console.log(`Resumo: ${total} templates processados`);
  console.log(`  ✓ Sucesso  (${sucessos.length}): ${sucessos.length ? sucessos.join(", ") : "nenhum"}`);
  console.log(`  ✗ Falhas   (${falhas.length}): ${falhas.length ? falhas.join(", ") : "nenhuma"}`);
  console.log(`  ⊘ Pulados  (${pulados.length}): ${pulados.length ? pulados.join(", ") : "nenhum"}`);
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
