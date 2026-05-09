import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { InfoCanal, PaletaThumbnail } from "./visual-selector";
import { ConfigProjeto, ConfigCanal, planejar } from "./planner";
import { executar } from "./executor";
import { controleEditorial, resumirConfigEditorial } from "./editorial";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function encontrarArquivos(pastaProjeto: string): ConfigProjeto {
  const arquivos = fs.readdirSync(pastaProjeto);

  const srt   = arquivos.find(f => f.endsWith(".srt"));
  const pdf   = arquivos.find(f => f.endsWith(".pdf"));
  const thumb = arquivos.find(f => f.match(/\.(jpg|jpeg|png|webp)$/i));

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

const FONTE_VERDADE = path.join(
  __dirname, "..", "..", "..",
  "agente-ideias", "src", "data", "nichos"
);

function normalizarCanal(dados: any): ConfigCanal {
  return {
    id: dados.canal?.toLowerCase().replace(/\s+/g, "-") || "canal",
    nome: dados.canal || "Canal",
    tipoPadrao: dados.formatoDeVideo?.estiloDeNarracao || "historia_pessoal",
    paleta: dados.paleta || {
      primaria: "#1A1A2E",
      secundaria: "#16213E",
      destaque: "#F5C842",
      texto: "#FFFFFF",
      fundo: "rgba(0,0,0,0.85)",
    },
    persona: [
      dados.avatar?.nome,
      dados.avatar?.idade ? `${dados.avatar.idade} anos` : "",
      dados.avatar?.personalidade,
    ].filter(Boolean).join(", "),
    estiloNarrativo: dados.formatoDeVideo?.estiloDeNarracao || "primeira_pessoa",
    tomProibido: dados.tom?.proibido || [],
    gatilhos: dados.gatilhosQueConvertem || [],
    publicoAlvo: dados.publicoAlvo?.perfil || "",
    nicho: dados.nicho || "",
  };
}

function canalPadrao(): ConfigCanal {
  return {
    id: "canal",
    nome: "Canal",
    tipoPadrao: "historia_pessoal",
    paleta: {
      primaria: "#1A1A2E",
      secundaria: "#16213E",
      destaque: "#F5C842",
      texto: "#FFFFFF",
      fundo: "rgba(0,0,0,0.85)",
    },
    persona: "Contador de histórias",
    estiloNarrativo: "primeira_pessoa",
    tomProibido: [],
    gatilhos: [],
    publicoAlvo: "",
    nicho: "",
  };
}

function carregarCanal(canalId: string): ConfigCanal {
  const caminhoFonte = path.join(FONTE_VERDADE, `${canalId}.json`);
  const caminhoLocal = path.join(__dirname, "..", "canais", `${canalId}.json`);

  if (fs.existsSync(caminhoFonte)) {
    const dados = JSON.parse(fs.readFileSync(caminhoFonte, "utf-8"));
    console.log(`[canal] ✓ Fonte de verdade: ${canalId}`);
    return normalizarCanal(dados);
  }

  if (fs.existsSync(caminhoLocal)) {
    console.log(`[canal] ⚠ Fallback local: ${canalId}`);
    return JSON.parse(fs.readFileSync(caminhoLocal, "utf-8"));
  }

  console.warn(`[canal] ✗ Não encontrado. Usando padrão neutro.`);
  return canalPadrao();
}

function lerProjeto(pastaProjeto: string): { canal_id: string; pasta_saida?: string } {
  const arquivo = path.join(pastaProjeto, "projeto.json");
  if (fs.existsSync(arquivo)) {
    return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  }
  return { canal_id: "canal" };
}

function extrairInfoCanal(canal: ConfigCanal): InfoCanal {
  return {
    nome_canal: canal.nome,
    nicho: canal.nicho || canal.tipoPadrao,
    avatar: canal.persona || canal.nome,
    gap_de_edicao: "",
    estilo_visual: "",
    tom_proibido: (canal.tomProibido || []).join(", "),
    palavras_engajam: canal.gatilhos || [],
    persona: canal.persona,
    publico_alvo: canal.publicoAlvo,
  };
}

function extrairPaleta(canal: ConfigCanal): PaletaThumbnail {
  return {
    cor_primaria: canal.paleta.primaria,
    cor_secundaria: canal.paleta.secundaria,
    cor_acento: canal.paleta.destaque,
    mood: "",
  };
}

function mostrarAjuda(pastasProjetos: string): void {
  console.log("Uso:");
  console.log("  npx tsx src/index.ts [projeto] --planejar                   (planejamento normal)");
  console.log("  npx tsx src/index.ts [projeto] --executar                   (execução com API — gera TSX via Claude)");
  console.log("  npx tsx src/index.ts [projeto] --executar --rapido          (execução com presets existentes)");
  console.log("  npx tsx src/index.ts [projeto] --planejar --reenriquecer    (força novo contexto)");
  console.log("  npx tsx src/index.ts [projeto] --planejar --rapido          (planejar sem pergunta de template)");
  console.log("");
  console.log("Modos de execução Remotion:");
  console.log("  padrão (API)  — Claude gera código TSX customizado para cada clip em batch paralelo");
  console.log("  --rapido      — usa presets prontos (mais rápido, sem chamadas à API de geração)");
  console.log("");
  console.log("Projetos disponíveis:");
  if (fs.existsSync(pastasProjetos)) {
    fs.readdirSync(pastasProjetos).forEach(p => console.log(`  - ${p}`));
  }
}

async function main() {
  console.log("╔════════════════════════════════════╗");
  console.log("║       SKILL-EDIÇÃO — INICIANDO      ║");
  console.log("╚════════════════════════════════════╝\n");

  const args           = process.argv.slice(2);
  const argProjeto     = args[0];
  const flag           = args[1];
  const reenriquecer   = args.includes("--reenriquecer");
  const modoRapido     = args.includes("--rapido");
  const pastasProjetos = path.join(__dirname, "../projetos");

  if (modoRapido) {
    console.log("⚡ MODO RÁPIDO — usando presets existentes");
  }

  if (!argProjeto || (flag !== "--planejar" && flag !== "--executar")) {
    mostrarAjuda(pastasProjetos);
    process.exit(0);
  }

  const pastaProjeto = path.join(pastasProjetos, argProjeto);
  if (!fs.existsSync(pastaProjeto)) {
    console.error(`Projeto não encontrado: ${pastaProjeto}`);
    process.exit(1);
  }

  const config = encontrarArquivos(pastaProjeto);
  const projeto = lerProjeto(pastaProjeto);
  config.canal = carregarCanal(projeto.canal_id);
  config.pasta_saida = projeto.pasta_saida;
  console.log(`Projeto: ${config.nome}`);
  console.log(`Canal: ${config.canal.nome}`);
  console.log(`SRT: ${path.basename(config.srtArquivo)}`);
  console.log(`PDF: ${path.basename(config.pacoteDadosArquivo)}`);

  if (flag === "--planejar") {
    const configEditorial = await controleEditorial(modoRapido);
    console.log(`\n→ ${resumirConfigEditorial(configEditorial)}\n`);

    const infoCanal = extrairInfoCanal(config.canal);
    const paleta    = extrairPaleta(config.canal);
    console.log(`Paleta: ${paleta.cor_primaria} / ${paleta.cor_secundaria} / ${paleta.cor_acento}`);

    await planejar(config, infoCanal, paleta, configEditorial, reenriquecer);
  } else {
    await executar(config, modoRapido);
  }
}

main().catch(console.error);
