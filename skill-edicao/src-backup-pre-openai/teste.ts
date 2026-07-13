import * as dotenv from "dotenv";
import * as path from "path";
import * as https from "https";
import * as fs from "fs";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const REPLICATE_KEY = process.env.REPLICATE_API_KEY || "";
const PASTA_TESTE = path.resolve(__dirname, "../temp/comparacao");

function baixarArquivo(url: string, destino: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pasta = path.dirname(destino);
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
    const arquivo = fs.createWriteStream(destino);
    const protocolo = url.startsWith("https") ? https : require("http");
    protocolo.get(url, (res: any) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        arquivo.close();
        fs.unlinkSync(destino);
        baixarArquivo(res.headers.location, destino).then(resolve).catch(reject);
        return;
      }
      res.pipe(arquivo);
      arquivo.on("finish", () => { arquivo.close(); resolve(); });
    }).on("error", reject);
  });
}

async function gerarImagem(
  modelo: string,
  prompt: string,
  nome_arquivo: string
): Promise<void> {
  console.log(`\nGerando com ${modelo}...`);
  console.log(`Prompt: "${prompt.substring(0, 70)}..."`);

  const body = JSON.stringify({
    input: {
      prompt,
      width: 1920,
      height: 1080,
      output_format: "jpg",
      output_quality: 90,
      go_fast: true,
    },
  });

  const resposta = await new Promise<any>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.replicate.com",
        path: `/v1/models/${modelo}/predictions`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "wait=60",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.setTimeout(90000, () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  if (resposta.error) throw new Error(resposta.error);

  let url_imagem = "";

  if (resposta.status === "succeeded" && resposta.output) {
    url_imagem = Array.isArray(resposta.output)
      ? resposta.output[0]
      : resposta.output;
  } else {
    let tentativas = 0;
    while (tentativas < 30) {
      await new Promise(r => setTimeout(r, 2000));
      process.stdout.write(".");
      const status = await new Promise<any>((resolve, reject) => {
        https.get(
          `https://api.replicate.com/v1/predictions/${resposta.id}`,
          { headers: { Authorization: `Bearer ${REPLICATE_KEY}` } },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try { resolve(JSON.parse(data)); }
              catch (e) { reject(e); }
            });
          }
        ).on("error", reject);
      });
      if (status.status === "succeeded") {
        url_imagem = Array.isArray(status.output)
          ? status.output[0]
          : status.output;
        break;
      }
      tentativas++;
    }
  }

  if (!url_imagem) throw new Error("Imagem não gerada");

  const destino = path.join(PASTA_TESTE, nome_arquivo);
  await baixarArquivo(url_imagem, destino);
  console.log(`✓ Salvo: ${nome_arquivo}`);
}

async function main() {
  console.log("=== COMPARAÇÃO DE MODELOS ===");
  console.log(`Pasta: ${PASTA_TESTE}\n`);

  if (!fs.existsSync(PASTA_TESTE)) {
    fs.mkdirSync(PASTA_TESTE, { recursive: true });
  }

  const prompts = [
    {
      nome: "cena1_varanda",
      texto: "Elderly Brazilian man in his 60s sitting on wooden porch chair at sunset, holding coffee cup, looking at rural farm landscape, warm orange golden light, cinematic photography, #D4651A tones, nostalgic mood, realistic",
    },
    {
      nome: "cena2_maos",
      texto: "Weathered calloused hands of elderly Brazilian farmer holding a ceramic coffee mug on rustic wooden table, morning light through window, warm sepia tones, close-up, cinematic, #D4651A #8B4513 color palette",
    },
    {
      nome: "cena3_campo",
      texto: "Rural Brazilian farm at golden hour sunset, cattle grazing on green pasture, dirt road, simple farmhouse in background, dramatic orange sky, cinematic wide shot, warm nostalgic tones",
    },
  ];

  for (const p of prompts) {
    try {
      // Flux Dev
      await gerarImagem(
        "black-forest-labs/flux-dev",
        p.texto,
        `flux-dev_${p.nome}.jpg`
      );

      // Imagen 3 Fast
      await gerarImagem(
        "google/imagen-3-fast",
        p.texto,
        `imagen3-fast_${p.nome}.jpg`
      );

    } catch (erro: any) {
      console.log(`✗ Erro: ${erro.message}`);
    }
  }

  console.log("\n=== TESTE CONCLUÍDO ===");
  console.log(`Abra a pasta para comparar:\n${PASTA_TESTE}`);
}

main().catch(console.error);
