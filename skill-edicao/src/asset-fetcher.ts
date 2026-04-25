import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import * as https from "https";
import * as http from "http";

export interface ResultadoAsset {
  clip_id: string;
  tipo: string;
  arquivo_baixado: string;
  sucesso: boolean;
  erro?: string;
  fonte_url?: string;
}

function baixarArquivo(url: string, destino: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pasta = path.dirname(destino);
    if (!fs.existsSync(pasta)) {
      fs.mkdirSync(pasta, { recursive: true });
    }

    const arquivo = fs.createWriteStream(destino);
    const protocolo = url.startsWith("https") ? https : http;

    protocolo
      .get(url, (resposta) => {
        if (
          resposta.statusCode === 301 ||
          resposta.statusCode === 302 ||
          resposta.statusCode === 307
        ) {
          arquivo.close();
          fs.unlinkSync(destino);
          baixarArquivo(resposta.headers.location!, destino)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (resposta.statusCode !== 200) {
          reject(new Error(`HTTP ${resposta.statusCode}`));
          return;
        }

        resposta.pipe(arquivo);
        arquivo.on("finish", () => {
          arquivo.close();
          resolve();
        });
      })
      .on("error", (erro) => {
        fs.unlinkSync(destino);
        reject(erro);
      });
  });
}

export async function buscarPexelsVideo(
  queries: string[],
  duracao_ms: number,
  clip_id: string,
  pastaDestino: string
): Promise<ResultadoAsset> {
  const PEXELS_KEY = process.env.PEXELS_API_KEY || "";

  if (!PEXELS_KEY) {
    return {
      clip_id,
      tipo: "video_stock",
      arquivo_baixado: "",
      sucesso: false,
      erro: "PEXELS_API_KEY não configurada",
    };
  }

  const duracao_seg = Math.ceil(duracao_ms / 1000);

  for (const query of queries) {
    try {
      const queryEncoded = encodeURIComponent(query);
      const url = `https://api.pexels.com/videos/search?query=${queryEncoded}&per_page=5&min_duration=${duracao_seg}&orientation=landscape`;

      const dados = await new Promise<any>((resolve, reject) => {
        https
          .get(
            url,
            {
              headers: {
                Authorization: PEXELS_KEY,
              },
            },
            (res) => {
              let body = "";
              res.on("data", (chunk) => (body += chunk));
              res.on("end", () => {
                try {
                  resolve(JSON.parse(body));
                } catch (e) {
                  reject(e);
                }
              });
            }
          )
          .on("error", reject);
      });

      if (dados.videos && dados.videos.length > 0) {
        const video = dados.videos[0];
        const arquivo_hd = video.video_files.find(
          (f: any) =>
            f.quality === "hd" &&
            f.width >= 1280
        ) || video.video_files[0];

        const destino = path.join(
          pastaDestino,
          `${clip_id}_source.mp4`
        );

        console.log(
          `  Baixando Pexels: "${query}" → ${arquivo_hd.link.substring(0, 60)}...`
        );

        await baixarArquivo(arquivo_hd.link, destino);

        return {
          clip_id,
          tipo: "video_stock",
          arquivo_baixado: destino,
          sucesso: true,
          fonte_url: arquivo_hd.link,
        };
      }
    } catch (erro: any) {
      console.log(`  Query falhou: "${query}" — ${erro.message}`);
    }
  }

  return {
    clip_id,
    tipo: "video_stock",
    arquivo_baixado: "",
    sucesso: false,
    erro: `Nenhum resultado para queries: ${queries.join(", ")}`,
  };
}

export async function gerarImagemReplicate(
  prompt: string,
  clip_id: string,
  pastaDestino: string
): Promise<ResultadoAsset> {
  const REPLICATE_KEY = process.env.REPLICATE_API_KEY || "";

  if (!REPLICATE_KEY) {
    return {
      clip_id,
      tipo: "imagem_ia",
      arquivo_baixado: "",
      sucesso: false,
      erro: "REPLICATE_API_KEY não configurada",
    };
  }

  try {
    console.log(`    Gerando imagem IA: "${prompt.substring(0, 60)}..."`);

    const bodyObj = {
      input: {
        prompt,
        width: 1920,
        height: 1080,
        num_outputs: 1,
        output_format: "jpg",
        output_quality: 85,
      },
    };

    const body = JSON.stringify(bodyObj);

    const resposta = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.replicate.com",
          path: "/v1/models/google/imagen-3-fast/predictions",
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
      req.on("error", reject);
      req.setTimeout(90000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
      req.write(body);
      req.end();
    });

    if (resposta.error) {
      throw new Error(resposta.error);
    }

    let url_imagem = "";

    if (resposta.status === "succeeded" && resposta.output) {
      url_imagem = Array.isArray(resposta.output)
        ? resposta.output[0]
        : resposta.output;
    } else {
      const prediction_id = resposta.id;
      let tentativas = 0;

      while (tentativas < 40) {
        await new Promise((r) => setTimeout(r, 3000));
        process.stdout.write(".");

        const status = await new Promise<any>((resolve, reject) => {
          https.get(
            `https://api.replicate.com/v1/predictions/${prediction_id}`,
            {
              headers: {
                Authorization: `Bearer ${REPLICATE_KEY}`,
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
          ).on("error", reject);
        });

        if (status.status === "succeeded") {
          url_imagem = Array.isArray(status.output)
            ? status.output[0]
            : status.output;
          break;
        } else if (status.status === "failed") {
          throw new Error(`Replicate falhou: ${status.error}`);
        }

        tentativas++;
      }
    }

    if (!url_imagem) {
      throw new Error("Timeout — imagem não gerada em 2 minutos");
    }

    const destino = path.join(pastaDestino, `${clip_id}_source.jpg`);
    await baixarArquivo(url_imagem, destino);
    console.log(`\n    ✓ Imagem salva: ${clip_id}_source.jpg`);

    return {
      clip_id,
      tipo: "imagem_ia",
      arquivo_baixado: destino,
      sucesso: true,
      fonte_url: url_imagem,
    };
  } catch (erro: any) {
    return {
      clip_id,
      tipo: "imagem_ia",
      arquivo_baixado: "",
      sucesso: false,
      erro: erro.message,
    };
  }
}

export function criarPastasOutput(raiz: string): void {
  const pastas = [
    path.join(raiz, "assets", "downloaded"),
    path.join(raiz, "assets", "avatar"),
    path.join(raiz, "cenas"),
    path.join(raiz, "output"),
  ];

  for (const pasta of pastas) {
    if (!fs.existsSync(pasta)) {
      fs.mkdirSync(pasta, { recursive: true });
      console.log(`Pasta criada: ${pasta}`);
    }
  }
}

if (require.main === module) {
  console.log("=== ASSET FETCHER ===");
  console.log("Pexels Key:", process.env.PEXELS_API_KEY ? "configurada" : "ausente");
  console.log("Replicate Key:", process.env.REPLICATE_API_KEY ? "configurada" : "ausente");

  criarPastasOutput(".");
  console.log("\nEstrutura de pastas criada com sucesso!");
  console.log("\nPara configurar as APIs, crie um arquivo .env na pasta skill-edicao com:");
  console.log("PEXELS_API_KEY=sua_chave_aqui");
  console.log("REPLICATE_API_KEY=sua_chave_aqui");
}
