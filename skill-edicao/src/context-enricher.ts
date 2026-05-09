import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Anthropic from "@anthropic-ai/sdk";
import { Segmento } from "./srt-parser";
import { ConfigEditorial } from "./editorial";

// Interface mínima para evitar importação circular com planner.ts
export interface CanalContexto {
  nome: string;
  persona: string;
  nicho?: string;
  publicoAlvo?: string;
  tomProibido?: string[];
}

export interface SegmentoEnriquecido {
  numero: number;
  textoOriginal: string;
  textoCompleto: string;
  emocao: "frustração" | "esperança" | "tristeza" | "alegria" | "reflexão" | "urgência" | "neutro";
  intensidade: "baixa" | "media" | "alta";
  contextoVisual: string;
  promptImagem: string;
  queryPexels: string;
  fraseAnimacao: string;
  sensivel: boolean;
  motivoSensivel: string;
}

const client = new Anthropic();

function construirMapa(
  lista: SegmentoEnriquecido[],
  segmentos: Segmento[]
): Map<string, SegmentoEnriquecido> {
  const mapa = new Map<string, SegmentoEnriquecido>();
  lista.forEach((e, i) => {
    const seg = segmentos[i];
    if (seg) mapa.set(seg.id, e);
  });
  return mapa;
}

export async function enriquecerContexto(
  segmentos: Segmento[],
  canal: CanalContexto,
  configEditorial: ConfigEditorial,
  pastaProjeto: string,
  forcarReenriquecimento = false
): Promise<Map<string, SegmentoEnriquecido>> {
  const arquivoCache = path.join(pastaProjeto, "contexto-enriquecido.json");

  if (!forcarReenriquecimento && fs.existsSync(arquivoCache)) {
    console.log("  Reutilizando contexto-enriquecido.json (use --reenriquecer para forçar)");
    const lista: SegmentoEnriquecido[] = JSON.parse(fs.readFileSync(arquivoCache, "utf-8"));
    return construirMapa(lista, segmentos);
  }

  const todosSegmentosFormatados = segmentos
    .map((s, i) => `[${i + 1}] (id:${s.id}) ${s.texto}`)
    .join("\n");

  const tomProibido = (canal.tomProibido || []).join(", ");

  const prompt = `Você é um especialista em edição de vídeo para YouTube.

CANAL: ${canal.nome}
PERSONA: ${canal.persona}
NICHO: ${canal.nicho || ""}
PÚBLICO-ALVO: ${canal.publicoAlvo || ""}
TOM PROIBIDO: ${tomProibido}
ESTILO DE IMAGEM: ${configEditorial.estiloImagem}
ESPECIFICIDADE: ${configEditorial.especificidadeImagem}

ROTEIRO COMPLETO:
${todosSegmentosFormatados}

Para cada segmento, analise o contexto COMPLETO do roteiro e retorne um JSON com:
{
  "segmentos": [
    {
      "numero": 1,
      "textoOriginal": "texto bruto do SRT",
      "textoCompleto": "frase completa sem cortes, preenchendo lacunas do contexto",
      "emocao": "frustração|esperança|tristeza|alegria|reflexão|urgência|neutro",
      "intensidade": "baixa|media|alta",
      "contextoVisual": "descrição em português do que deve aparecer na tela",
      "promptImagem": "prompt em inglês para geração de imagem, estrutura: [sujeito] [ação] [ambiente] [luz] [estilo] [qualidade]",
      "queryPexels": "3-5 palavras em inglês para busca de vídeo stock",
      "fraseAnimacao": "frase curta e impactante para animação Remotion (máx 8 palavras)",
      "sensivel": false,
      "motivoSensivel": ""
    }
  ]
}

REGRAS ABSOLUTAS:
- promptImagem SEMPRE em inglês, NUNCA copie texto do SRT
- promptImagem NUNCA com violência, conteúdo adulto, texto na imagem
- Se o segmento tiver texto cortado, complete com o contexto do roteiro
- fraseAnimacao deve ser impactante e em português correto
- sensivel: true se o prompt puder ser rejeitado pelo Replicate
- Retorne APENAS o JSON, sem explicações`;

  console.log(`  Chamando IA para ${segmentos.length} segmentos (1 chamada)...`);

  const resposta = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const conteudo = resposta.content[0];
  if (conteudo.type !== "text") throw new Error("Resposta inesperada do enriquecedor");

  const texto = conteudo.text.trim();
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("JSON não encontrado na resposta do enriquecedor");

  const resultado = JSON.parse(jsonMatch[0]);
  const lista: SegmentoEnriquecido[] = resultado.segmentos;

  fs.writeFileSync(arquivoCache, JSON.stringify(lista, null, 2), "utf-8");
  console.log(`  ✓ Contexto salvo: ${arquivoCache}`);

  return construirMapa(lista, segmentos);
}
