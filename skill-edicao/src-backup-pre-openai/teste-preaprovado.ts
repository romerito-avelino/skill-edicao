import * as path from "path";
import { renderizarHyperFrames } from "./hyperframes-renderer";

const OUTPUT = path.resolve(__dirname, "..", "temp", "teste-preaprovado-001-02.mp4");

async function main() {
  console.log("Teste path pré-aprovado — cena 001-02\n");
  console.log(`Output: ${OUTPUT}\n`);

  const resultado = await renderizarHyperFrames({
    clipId: "001-02",
    fraseImpacto: "Tem uma pergunta que cê nunca quer responder tarde",
    descricaoVisual: "Fundo branco, texto explosivo, clima tenso e urgente, mood introspectivo",
    elementosVisuais: ["tipografia explosiva", "fundo branco", "contraste alto"],
    atmosfera: "introspectivo",
    estiloFundo: "Fundo Branco",
    tipoMomento: "reflexao_arrependimento",
    paleta: {
      primaria:   "#e50914",
      secundaria: "#a30610",
      destaque:   "#e50914",
      texto:      "#eeeeee",
      fundo:      "#ffffff",
    },
    duracao: 6000,
    outputPath: OUTPUT,
    templateAprovado: "caption-parallax-layers",
    variaveisAprovadas: {
      word0: "Tem",
      word1: "uma",
      word2: "pergunta",
      word3: "que",
      word4: "cê",
      word5: "nunca",
      word6: "quer",
      word7: "responder",
      word8: "tarde",
      corDestaque:       "#e50914",
      corDestaqueStroke: "#e50914",
      corDestaqueSombra: "#a30610",
      corTextoFrente:    "#eeeeee",
    },
  });

  console.log(`\nResultado: ${resultado}`);
  if (resultado !== "ok") process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
