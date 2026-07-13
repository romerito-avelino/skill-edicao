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

const BLACKLIST_PATH = path.resolve(__dirname, "../assets/pexels-blacklist.json");

function carregarBlacklist(): Set<number> {
  try {
    const raw = fs.readFileSync(BLACKLIST_PATH, "utf-8");
    const ids: number[] = JSON.parse(raw);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function salvarNaBlacklist(videoId: number): void {
  try {
    const blacklist = carregarBlacklist();
    blacklist.add(videoId);
    fs.writeFileSync(BLACKLIST_PATH, JSON.stringify([...blacklist], null, 2), "utf-8");
  } catch (e: any) {
    console.log(`  ⚠ Blacklist: não foi possível salvar ID ${videoId} — ${e.message}`);
  }
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

  const blacklist = carregarBlacklist();
  const duracao_seg = Math.ceil(duracao_ms / 1000);

  for (const query of queries) {
    try {
      const queryEncoded = encodeURIComponent(query);
      const url = `https://api.pexels.com/videos/search?query=${queryEncoded}&per_page=10&min_duration=${duracao_seg}&orientation=landscape`;

      const dados = await new Promise<any>((resolve, reject) => {
        https
          .get(url, { headers: { Authorization: PEXELS_KEY } }, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
              try { resolve(JSON.parse(body)); }
              catch (e) { reject(e); }
            });
          })
          .on("error", reject);
      });

      if (dados.videos && dados.videos.length > 0) {
        const candidatos: any[] = dados.videos.filter((v: any) => !blacklist.has(v.id));

        if (candidatos.length === 0) {
          console.log(`  ⚠ Todos os resultados para "${query}" estão na blacklist, tentando próxima query...`);
          continue;
        }

        const video = candidatos[0];
        const arquivo_hd =
          video.video_files.find((f: any) => f.quality === "hd" && f.width >= 1280) ||
          video.video_files[0];

        const destino = path.join(pastaDestino, `${clip_id}_source.mp4`);
        console.log(`  Baixando Pexels: "${query}" → ${arquivo_hd.link.substring(0, 60)}...`);
        await baixarArquivo(arquivo_hd.link, destino);

        salvarNaBlacklist(video.id);

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

async function chamarReplicateApi(prompt: string, REPLICATE_KEY: string): Promise<string> {
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

    while (tentativas < 80) {
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
    throw new Error("Timeout — imagem não gerada em 4 minutos");
  }

  return url_imagem;
}

export async function gerarImagemReplicate(
  prompt: string,
  clip_id: string,
  pastaDestino: string,
  estiloVisual = "cinematic",
  tipoCena = "dramatic",
  sensivel = false
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
    let url_imagem: string;

    if (sensivel) {
      console.log(`    ⚠ Clip marcado como sensível — usando prompt alternativo preventivo`);
      const promptSeguro =
        `${estiloVisual}, ${tipoCena} atmosphere, ` +
        `Brazilian rural setting, natural lighting, cinematic composition, ` +
        `no people, landscape, 8k quality, safe for work`;
      url_imagem = await chamarReplicateApi(promptSeguro, REPLICATE_KEY);
    } else {
      console.log(`    Gerando imagem IA: "${prompt.substring(0, 60)}..."`);
      try {
        url_imagem = await chamarReplicateApi(prompt, REPLICATE_KEY);
      } catch (erroInicial: any) {
        const ehSensivel =
          erroInicial.message.includes("E005") ||
          erroInicial.message.toLowerCase().includes("flagged as sensitive");
        const ehTimeout = erroInicial.message.includes("Timeout");

        if (!ehSensivel && !ehTimeout) throw erroInicial;

        if (ehSensivel) {
          console.log(`\n    ⚠ Prompt sensível (E005), tentando prompt alternativo...`);
        } else {
          console.log(`\n    ⚠ Timeout atingido, tentando prompt alternativo...`);
        }
        const promptAlternativo =
          `${estiloVisual}, ${tipoCena} atmosphere, ` +
          `Brazilian rural setting, natural lighting, cinematic composition, ` +
          `no people, landscape, 8k quality, safe for work`;
        url_imagem = await chamarReplicateApi(promptAlternativo, REPLICATE_KEY);
      }
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
