import * as fs from "fs";
import * as path from "path";
import { renderizarHyperFrames } from "./hyperframes-renderer";

const OUTPUT_PATH = path.resolve(__dirname, "..", "temp", "teste-hyperframes.mp4");

async function main() {
  const tempDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  console.log("Iniciando teste HyperFrames...");
  console.log(`Output: ${OUTPUT_PATH}\n`);

  const resultado = await renderizarHyperFrames({
    clipId: "teste-001",
    fraseImpacto: "Tem uma pergunta que cê nunca quer responder tarde",
    descricaoVisual:
      "Fundo texturizado creme, tipografia hierárquica preta, linha de acento laranja, atmosfera reflexiva e pesada",
    elementosVisuais: [
      "textura de papel",
      "tipografia serifada",
      "linha laranja lateral",
      "vinheta suave",
    ],
    atmosfera: "reflexivo",
    estiloFundo: "Plano de fundo texturizado cor creme",
    tipoMomento: "reflexao_arrependimento",
    paleta: {
      primaria:   "#D4651A",
      secundaria: "#8B4513",
      destaque:   "#F5C842",
      texto:      "#1A1A1A",
      fundo:      "#F5E6C8",
    },
    duracao: 7000,
    outputPath: OUTPUT_PATH,
  });

  console.log(`\nResultado: ${resultado}`);

  if (resultado === "ok") {
    console.log(`✓ Vídeo gerado em: ${OUTPUT_PATH}`);
  } else {
    console.log("✗ Falhou — verifique os logs acima");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
