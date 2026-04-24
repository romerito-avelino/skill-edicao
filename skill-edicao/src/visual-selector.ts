import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Anthropic from "@anthropic-ai/sdk";
import { Segmento } from "./srt-parser";

const client = new Anthropic();

export type TipoAsset = "video_stock" | "imagem_ia" | "remotion";
export type Terco = "agressivo" | "duvidoso" | "esperançoso";

export interface PaletaThumbnail {
  cor_primaria: string;
  cor_secundaria: string;
  cor_acento: string;
  mood: string;
}

export interface InfoCanal {
  nome_canal: string;
  nicho: string;
  avatar: string;
  gap_de_edicao: string;
  estilo_visual: string;
  tom_proibido: string;
  palavras_engajam: string[];
}

export interface Clip {
  clip_id: string;
  inicio_relativo_ms: number;
  fim_relativo_ms: number;
  duracao_ms: number;
  tipo: TipoAsset;
  queries?: string[];
  prompt?: string;
  animacao_remotion?: string;
  texto_animado?: string;
  arquivo_final: string;
  fallback_tipo?: TipoAsset;
  fallback_prompt?: string;
}

export interface SegmentoProcessado {
  id: string;
  bloco: string;
  inicio_ms: number;
  fim_ms: number;
  duracao_ms: number;
  texto: string;
  terco: Terco;
  intensidade: number;
  tipo_momento: string;
  ritmo_corte_ms: number;
  total_clips: number;
  clips: Clip[];
}

export async function processarTodosSegmentos(
  segmentos: Segmento[],
  infoCanal: InfoCanal,
  paleta: PaletaThumbnail
): Promise<SegmentoProcessado[]> {

  const segmentosResumidos = segmentos.map(s => ({
    id: s.id,
    inicio_ms: s.inicio_ms,
    fim_ms: s.fim_ms,
    duracao_ms: s.duracao_ms,
    texto: s.texto,
  }));

  const prompt = `Você é o motor de decisão visual da Skill-Edição de vídeos de histórias para YouTube.

CANAL: ${infoCanal.nome_canal}
NICHO: ${infoCanal.nicho}
GAP DE EDIÇÃO: ${infoCanal.gap_de_edicao}
ESTILO: ${infoCanal.estilo_visual}
PALETA: primaria=${paleta.cor_primaria} secundaria=${paleta.cor_secundaria} acento=${paleta.cor_acento}

REGRAS DE DECISÃO:
- Terço emocional: segmentos iniciais=agressivo, meio=duvidoso, finais=esperançoso
- Ritmo: agressivo=4000ms, duvidoso=5000ms, esperançoso=6000ms
- num_clips = max(1, round(duracao_ms / ritmo_ms))
- Tipos: video_stock (cenas filmáveis genéricas), imagem_ia (abstrato/emocional/específico do canal), remotion (frases-chave/viradas emocionais)
- NUNCA mais de 2 clips do mesmo tipo seguidos
- Queries Pexels SEMPRE em inglês
- Prompts imagem_ia incluem sempre as cores da paleta

SEGMENTOS A PROCESSAR:
${JSON.stringify(segmentosResumidos, null, 2)}

Retorne APENAS um JSON válido com esta estrutura exata, sem texto adicional:
{
  "segmentos": [
    {
      "id": "001",
      "terco": "agressivo",
      "intensidade": 7,
      "tipo_momento": "abertura",
      "bloco": "BLOCO 1 — ABERTURA",
      "ritmo_corte_ms": 4000,
      "total_clips": 2,
      "clips": [
        {
          "clip_id": "001-01",
          "inicio_relativo_ms": 0,
          "fim_relativo_ms": 4000,
          "duracao_ms": 4000,
          "tipo": "video_stock",
          "queries": ["elderly man porch sunset brazil", "senior man wooden chair farm", "countryside evening relaxing"],
          "arquivo_final": "cenas/001-01.mp4",
          "fallback_tipo": "imagem_ia",
          "fallback_prompt": "elderly Brazilian man on wooden porch at sunset, warm orange tones ${paleta.cor_primaria}, cinematic, nostalgic"
        }
      ]
    }
  ]
}

Para clips imagem_ia use:
{
  "clip_id": "001-02",
  "inicio_relativo_ms": 4000,
  "fim_relativo_ms": 8000,
  "duracao_ms": 4000,
  "tipo": "imagem_ia",
  "prompt": "descrição detalhada em inglês, cores ${paleta.cor_primaria}, cinematic",
  "animacao_remotion": "ken_burns_zoom_in",
  "arquivo_final": "cenas/001-02.mp4"
}

Para clips remotion use:
{
  "clip_id": "001-03",
  "inicio_relativo_ms": 8000,
  "fim_relativo_ms": 14000,
  "duracao_ms": 6000,
  "tipo": "remotion",
  "texto_animado": "frase exata do segmento",
  "animacao_remotion": "palavra_por_palavra",
  "arquivo_final": "cenas/001-03.mp4"
}`;

  console.log(`Analisando ${segmentos.length} segmentos em uma única chamada...`);

  const resposta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const conteudo = resposta.content[0];
  if (conteudo.type !== "text") {
    throw new Error("Resposta inesperada da API");
  }

  const texto = conteudo.text.trim();
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("JSON não encontrado na resposta");
  }

  const resultado = JSON.parse(jsonMatch[0]);

  return resultado.segmentos.map((s: any) => ({
    id: s.id,
    bloco: s.bloco || "",
    inicio_ms: segmentos.find(seg => seg.id === s.id)?.inicio_ms || 0,
    fim_ms: segmentos.find(seg => seg.id === s.id)?.fim_ms || 0,
    duracao_ms: segmentos.find(seg => seg.id === s.id)?.duracao_ms || 0,
    texto: segmentos.find(seg => seg.id === s.id)?.texto || "",
    terco: s.terco,
    intensidade: s.intensidade,
    tipo_momento: s.tipo_momento,
    ritmo_corte_ms: s.ritmo_corte_ms,
    total_clips: s.total_clips,
    clips: s.clips,
  }));
}
