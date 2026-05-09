import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Anthropic from "@anthropic-ai/sdk";

export interface PaletaCanal {
  primaria: string;
  secundaria: string;
  destaque: string;
  texto: string;
  fundo: string;
}

export interface ParamsGerarAnimacao {
  template: string;
  contexto: string;
  tom: string;
  emocao: string;
  intensidade: string;
  duracao: number;
  paleta: PaletaCanal;
  tipoAnimacao: string;
  indiceClip: number;
  totalClips: number;
}

const instrucoesPorTipo: Record<string, string> = {
  "1": "Foco em textos de impacto. Palavras grandes, movimento forte, presença visual dominante.",
  "2": "Foco em conexões visuais. Elementos conectados, mapa mental, relações entre conceitos.",
  "3": "Foco em progressão temporal. Linha do tempo, sequência, evolução de eventos.",
  "4": "Foco em citação estilizada. Texto em destaque, aspas, elegância visual.",
  "5": "Misto. Combine elementos visuais variados de forma criativa e contextual.",
  "6": "Animação 3D ou com profundidade. Use perspectiva CSS, transforms 3D, elementos com profundidade.",
};

export async function gerarCodigoAnimacao(params: ParamsGerarAnimacao): Promise<string> {
  const client = new Anthropic();
  const fps = 30;
  const frames = Math.ceil((params.duracao / 1000) * fps);
  const instrucoes = instrucoesPorTipo[params.tipoAnimacao] ?? instrucoesPorTipo["5"];

  const prompt = `Você é um especialista em Remotion (biblioteca React para vídeos).
Gere um componente React/TSX para uma animação de vídeo.

ESPECIFICAÇÕES TÉCNICAS:
- Duração: ${params.duracao}ms (${fps} fps = ${frames} frames)
- Resolução: 1920x1080px
- Imports disponíveis: react, remotion (useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence)
- NÃO use imports externos (sem three.js, sem bibliotecas externas)
- Use apenas CSS inline e animações via interpolate/spring do Remotion
- O componente deve se chamar exatamente: AnimacaoGerada
- Export: export const AnimacaoGerada: React.FC = () => { ... }

TEMPLATE VISUAL DO USUÁRIO:
${params.template}

CONTEXTO DESTA CENA:
- Texto/frase: "${params.contexto}"
- Tom emocional: ${params.tom}
- Emoção: ${params.emocao}
- Intensidade: ${params.intensidade}
- Posição no vídeo: clip ${params.indiceClip} de ${params.totalClips}

PALETA DE CORES DO CANAL:
- Primária: ${params.paleta.primaria}
- Secundária: ${params.paleta.secundaria}
- Destaque: ${params.paleta.destaque}
- Texto: ${params.paleta.texto}
- Fundo: ${params.paleta.fundo}

TIPO DE ANIMAÇÃO: ${params.tipoAnimacao}
${instrucoes}

REGRAS OBRIGATÓRIAS:
1. Adapte o template visual ao contexto emocional da cena
2. Use as cores da paleta do canal
3. O texto "${params.contexto}" deve aparecer na animação
4. Varie levemente o estilo baseado na posição (clip ${params.indiceClip}/${params.totalClips})
5. Fundo de contraste atrás de textos para legibilidade
6. Animação deve ser fluida e profissional
7. NÃO inclua explicações — retorne APENAS o código TSX
8. O código deve compilar sem erros TypeScript

Retorne APENAS o código TypeScript/TSX, sem markdown, sem explicações.`;

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const conteudo = resposta.content[0];
  if (conteudo.type !== "text") throw new Error("Resposta inesperada da API");

  let codigo = conteudo.text.trim();
  // Remove markdown code fences if model included them
  codigo = codigo.replace(/^```(?:tsx?|jsx?|typescript|javascript)?\r?\n?/i, "");
  codigo = codigo.replace(/\r?\n?```\s*$/i, "");

  return codigo.trim();
}
