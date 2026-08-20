import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { InfoCanal, PaletaThumbnail } from "./visual-selector";
import { ConfigProjeto, ConfigCanal, PlanoEdicao, planejar } from "./planner";
import { executar } from "./executor";
import { controleEditorial, resumirConfigEditorial } from "./editorial";
import { rodarRevisaoCLI } from "./revisao-cli";
import { exportarHerois } from "./exportar-herois";
import { reincorporarHerois } from "./reincorporar-herois";

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

const FLAGS_VALIDAS = ["--planejar", "--revisar", "--executar", "--exportar-herois", "--reincorporar"];

function mostrarAjuda(pastasProjetos: string): void {
  console.log("Uso:");
  console.log("  npx tsx src/index.ts [projeto] --planejar                   (planejamento normal — já classifica cenas-herói)");
  console.log("  npx tsx src/index.ts [projeto] --revisar                    (revisão semi-manual das cenas HyperFrames, inclui veto/promoção de herói)");
  console.log("  npx tsx src/index.ts [projeto] --exportar-herois            (exporta briefings das cenas-herói para output/herois/*.md)");
  console.log("  npx tsx src/index.ts [projeto] --executar                   (execução com API — fábrica gera commodity, heróis viram placeholder)");
  console.log("  npx tsx src/index.ts [projeto] --reincorporar               (confere se as cenas-herói reais substituíram os placeholders)");
  console.log("  npx tsx src/index.ts [projeto] --planejar --reenriquecer    (força novo contexto)");
  console.log("");
  console.log("Projetos disponíveis:");
  if (fs.existsSync(pastasProjetos)) {
    fs.readdirSync(pastasProjetos).forEach(p => console.log(`  - ${p}`));
  }
}

async function revisar(config: ConfigProjeto): Promise<void> {
  const arquivoPlano = path.join(config.pasta, "plano-edicao.json");
  if (!fs.existsSync(arquivoPlano)) {
    console.error("Plano não encontrado. Gere com --planejar primeiro.");
    process.exit(1);
  }

  const plano: PlanoEdicao = JSON.parse(fs.readFileSync(arquivoPlano, "utf-8"));

  if (plano.configEditorial.modoGeracao !== "semi_manual") {
    console.log("Modo automático ativo — --revisar não é necessário.");
    console.log("Para habilitar revisão manual, planeje novamente escolhendo modo Semi-manual.");
    process.exit(0);
  }

  // Carrega contexto enriquecido para obter atmosfera e dadosVisuais
  const arquivoEnriquecido = path.join(config.pasta, "contexto-enriquecido.json");
  let enriquecidos: any[] = [];
  if (fs.existsSync(arquivoEnriquecido)) {
    try { enriquecidos = JSON.parse(fs.readFileSync(arquivoEnriquecido, "utf-8")); } catch { /* ok */ }
  }

  const segmentosHF = plano.segmentos.filter(
    s => s.tipoVisual === "remotion_animacao" && s.motor === "hyperframes"
  );

  if (segmentosHF.length === 0) {
    console.log("Nenhum segmento HyperFrames encontrado no plano.");
    process.exit(0);
  }

  console.log(`\n${segmentosHF.length} cena(s) HyperFrames para revisar.`);

  // Mescla com dados enriquecidos (atmosfera, dadosVisuais)
  const segmentosParaRevisar = segmentosHF.map(seg => {
    const idx = parseInt(seg.segmentoId, 10) - 1;
    const enriched: any = idx >= 0 ? (enriquecidos[idx] ?? {}) : {};
    return { ...seg, atmosfera: enriched.atmosfera ?? "dramatico", dadosVisuais: enriched.dadosVisuais ?? {} };
  });

  const paleta = config.canal!.paleta;
  const resultados = await rodarRevisaoCLI(segmentosParaRevisar, paleta);

  // Salva os resultados no plano
  for (const [clipId, proposta] of resultados) {
    const seg = plano.segmentos.find(s => s.clipId === clipId);
    if (!seg) continue;
    seg.templateAprovado  = proposta.templateAtual;
    seg.variaveisAprovadas = proposta.variaveis;
    seg.statusRevisao     = proposta.statusRevisao;
    seg.origem            = proposta.origem;
  }

  fs.writeFileSync(arquivoPlano, JSON.stringify(plano, null, 2), "utf-8");
  console.log("\nRevisão salva. Rode --executar para renderizar.");
}

async function main() {
  console.log("╔════════════════════════════════════╗");
  console.log("║       SKILL-EDIÇÃO — INICIANDO     ║");
  console.log("╚════════════════════════════════════╝\n");

  const args           = process.argv.slice(2);
  const argProjeto     = args[0];
  const flag           = args[1];
  const reenriquecer   = args.includes("--reenriquecer");
  const pastasProjetos = path.join(__dirname, "../projetos");

  if (!argProjeto || !FLAGS_VALIDAS.includes(flag)) {
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
    const configEditorial = await controleEditorial();
    console.log(`\n→ ${resumirConfigEditorial(configEditorial)}\n`);

    const infoCanal = extrairInfoCanal(config.canal);
    const paleta    = extrairPaleta(config.canal);
    console.log(`Paleta: ${paleta.cor_primaria} / ${paleta.cor_secundaria} / ${paleta.cor_acento}`);

    await planejar(config, infoCanal, paleta, configEditorial, reenriquecer);
  } else if (flag === "--revisar") {
    await revisar(config);
  } else if (flag === "--exportar-herois") {
    await exportarHerois(config);
  } else if (flag === "--reincorporar") {
    const codigoSaida = await reincorporarHerois(config);
    process.exit(codigoSaida);
  } else {
    await executar(config);
  }
}

main().catch(console.error);
