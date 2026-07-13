import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import * as https from "https";
import * as http from "http";
import Anthropic from "@anthropic-ai/sdk";

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

// ── Motor de imagem: OpenAI GPT Image ──────────────────────────
// Chamada base64 direta. GPT Image sempre retorna b64_json (sem URL).
async function chamarOpenAIImage(
  prompt: string,
  OPENAI_KEY: string
): Promise<string> {
  const bodyObj = {
    model: "gpt-image-1-mini",
    prompt,
    n: 1,
    size: "1536x1024",
    quality: "medium",
    moderation: "low",
    output_format: "jpeg",
  };
  const body = JSON.stringify(bodyObj);

  const resposta = await new Promise<any>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path: "/v1/images/generations",
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
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
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
    req.write(body);
    req.end();
  });

  if (resposta.error) {
    const msg = resposta.error.message || JSON.stringify(resposta.error);
    const err = new Error(msg);
    // Marca recusas por política de conteúdo para o tratamento reativo
    if (
      /moderation|safety|content policy|content_policy|rejected|not allowed/i.test(msg)
    ) {
      (err as any).ehRecusa = true;
    }
    throw err;
  }

  const b64 = resposta?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Resposta sem imagem (b64_json ausente)");
  return b64;
}

// Reescreve um prompt recusado, mantendo a intenção visual mas suavizando.
async function reescreverPromptSeguro(promptOriginal: string): Promise<string> {
  const client = new Anthropic();
  const instrucao =
    `The following image-generation prompt was rejected by a content filter. ` +
    `Rewrite it so it passes moderation while keeping the SAME visual intent, ` +
    `scene and mood. Remove anything violent, graphic, sexual or otherwise ` +
    `sensitive; replace it with a suggestive but safe visual equivalent. ` +
    `Keep the same art style. Reply with ONLY the rewritten prompt in English, ` +
    `no explanation.\n\nPrompt: ${promptOriginal}`;

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: instrucao }],
  });
  const conteudo = resposta.content[0];
  if (conteudo.type !== "text") throw new Error("Reescrita inesperada");
  return conteudo.text.trim();
}

// Gera imagem via OpenAI. Mesma assinatura do antigo gerarImagemReplicate.
// Em caso de recusa por política, reescreve o prompt e tenta 1x mais.
export async function gerarImagemOpenAI(
  prompt: string,
  clip_id: string,
  pastaDestino: string
): Promise<ResultadoAsset> {
  const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
  if (!OPENAI_KEY) {
    return {
      clip_id,
      tipo: "imagem_ia",
      arquivo_baixado: "",
      sucesso: false,
      erro: "OPENAI_API_KEY não configurada",
    };
  }

  const salvarB64 = (b64: string): string => {
    const destino = path.join(pastaDestino, `${clip_id}_source.jpg`);
    const pasta = path.dirname(destino);
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(destino, Buffer.from(b64, "base64"));
    return destino;
  };

  try {
    console.log(`    Gerando imagem IA (OpenAI): "${prompt.substring(0, 60)}..."`);
    let b64: string;
    try {
      b64 = await chamarOpenAIImage(prompt, OPENAI_KEY);
    } catch (erroInicial: any) {
      if (!erroInicial.ehRecusa) throw erroInicial;
      console.log(`\n    ⚠ Prompt recusado — reescrevendo de forma mais segura...`);
      const promptReescrito = await reescreverPromptSeguro(prompt);
      console.log(`    → Novo prompt: "${promptReescrito.substring(0, 60)}..."`);
      b64 = await chamarOpenAIImage(promptReescrito, OPENAI_KEY);
    }

    const destino = salvarB64(b64);
    console.log(`\n    ✓ Imagem salva: ${clip_id}_source.jpg`);
    return {
      clip_id,
      tipo: "imagem_ia",
      arquivo_baixado: destino,
      sucesso: true,
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
  console.log("OpenAI Key:", process.env.OPENAI_API_KEY ? "configurada" : "ausente");

  criarPastasOutput(".");
  console.log("\nEstrutura de pastas criada com sucesso!");
  console.log("\nPara configurar as APIs, crie um arquivo .env na pasta skill-edicao com:");
  console.log("PEXELS_API_KEY=sua_chave_aqui");
  console.log("OPENAI_API_KEY=sua_chave_aqui");
}
