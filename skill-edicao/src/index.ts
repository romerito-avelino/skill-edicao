import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { InfoCanal, PaletaThumbnail } from "./visual-selector";
import { ConfigProjeto, planejar } from "./planner";
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

function extrairInfoCanal(_nomeProjeto: string): InfoCanal {
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
  return {
    cor_primaria: "#D4651A",
    cor_secundaria: "#8B4513",
    cor_acento: "#F5C842",
    mood: "quente, reflexivo, nostálgico",
  };
}

function mostrarAjuda(pastasProjetos: string): void {
  console.log("Uso: npx tsx src/index.ts <nome-do-projeto> --planejar | --executar");
  console.log("");
  console.log("Fases:");
  console.log("  --planejar   Controle editorial interativo + análise IA → plano-edicao.json");
  console.log("  --executar   Lê o plano-edicao.json e produz os clips + relatorio.txt");
  console.log("");
  console.log("Exemplo:");
  console.log("  npx tsx src/index.ts aroldo-001-quarenta-anos --planejar");
  console.log("  npx tsx src/index.ts aroldo-001-quarenta-anos --executar");
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

  const args          = process.argv.slice(2);
  const argProjeto    = args[0];
  const flag          = args[1];
  const pastasProjetos = path.join(__dirname, "../projetos");

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
  console.log(`Projeto: ${config.nome}`);
  console.log(`SRT: ${path.basename(config.srtArquivo)}`);
  console.log(`PDF: ${path.basename(config.pacoteDadosArquivo)}`);

  if (flag === "--planejar") {
    const configEditorial = await controleEditorial();
    console.log(`\n→ ${resumirConfigEditorial(configEditorial)}\n`);

    const infoCanal = extrairInfoCanal(config.nome);
    const paleta    = extrairPaleta(config.thumbArquivo);
    console.log(`Canal: ${infoCanal.nome_canal}`);
    console.log(`Paleta: ${paleta.cor_primaria} / ${paleta.cor_secundaria} / ${paleta.cor_acento}`);

    await planejar(config, infoCanal, paleta, configEditorial);
  } else {
    await executar(config);
  }
}

main().catch(console.error);
