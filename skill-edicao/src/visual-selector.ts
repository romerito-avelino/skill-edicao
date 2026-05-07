import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Anthropic from "@anthropic-ai/sdk";
import { Segmento } from "./srt-parser";
import { ConfigEditorial } from "./editorial";

const client = new Anthropic();

export type TipoAsset = "video_stock" | "imagem_ia" | "remotion_animacao";
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
  persona?: string;
  publico_alvo?: string;
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

function descricaoEstiloImagem(estilo: number): string {
  const estilos: Record<number, string> = {
    1: "fotorrealista, fotografia documental, sem filtros artísticos",
    2: "pintura artística, estilo impressionista ou óleo",
    3: "cinematográfico, grão de filme, paleta rica",
    4: "ilustração ou desenho, linhas definidas",
    5: "escolher o estilo mais adequado para a cena",
  };
  return estilos[estilo] || estilos[5];
}

function descricaoEspecificidade(esp: number): string {
  const tipos: Record<number, string> = {
    1: "cenas genéricas: paisagens, símbolos, ambientes sem personagens específicos",
    2: "cenas específicas: personagem principal, ação concreta, detalhe narrativo",
    3: "misturar genéricas e específicas conforme a emoção do trecho",
  };
  return tipos[esp] || tipos[3];
}

function descricaoTom(tom: number): string {
  const tons: Record<number, string> = {
    1: "dramático e emocional — alto contraste, sombras, tensão visual",
    2: "inspiracional e esperançoso — luz quente, abertura, leveza",
    3: "reflexivo e melancólico — tons frios ou sépia, silêncio visual",
    4: "neutro e documental — luz natural, composição limpa",
  };
  return tons[tom] || tons[1];
}

function ferramentasHabilitadas(config: ConfigEditorial): TipoAsset[] {
  const tools: TipoAsset[] = [];
  if (config.usarVideoStock) tools.push("video_stock");
  if (config.usarImagemIA) tools.push("imagem_ia");
  if (config.usarRemotion) tools.push("remotion_animacao");
  return tools.length > 0 ? tools : ["video_stock", "imagem_ia", "remotion_animacao"];
}

export async function processarTodosSegmentos(
  segmentos: Segmento[],
  infoCanal: InfoCanal,
  paleta: PaletaThumbnail,
  configEditorial: ConfigEditorial
): Promise<SegmentoProcessado[]> {

  const tools = ferramentasHabilitadas(configEditorial);
  const toolsStr = tools.join(", ");

  const TAMANHO_LOTE = 15;
  const lotes: Segmento[][] = [];
  for (let i = 0; i < segmentos.length; i += TAMANHO_LOTE) {
    lotes.push(segmentos.slice(i, i + TAMANHO_LOTE));
  }

  console.log(`Processando ${segmentos.length} segmentos em ${lotes.length} lotes de ${TAMANHO_LOTE}...`);
  console.log(`Ferramentas ativas: ${toolsStr}`);

  const todosProcessados: SegmentoProcessado[] = [];

  for (let i = 0; i < lotes.length; i++) {
    const lote = lotes[i];
    console.log(`\nLote ${i + 1}/${lotes.length} — segmentos ${lote[0].id} a ${lote[lote.length - 1].id}`);

    const segmentosResumidos = lote.map(s => ({
      id: s.id,
      inicio_ms: s.inicio_ms,
      fim_ms: s.fim_ms,
      duracao_ms: s.duracao_ms,
      texto: s.texto,
    }));

    const prompt = `Você é o motor de decisão visual da Skill-Edição de vídeos de histórias para YouTube.

CANAL: ${infoCanal.nome_canal}
NICHO: ${infoCanal.nicho}
${infoCanal.persona ? `PERSONA: ${infoCanal.persona}` : ""}
${infoCanal.gap_de_edicao ? `GAP DE EDIÇÃO: ${infoCanal.gap_de_edicao}` : ""}
${infoCanal.estilo_visual ? `ESTILO: ${infoCanal.estilo_visual}` : ""}
${infoCanal.tom_proibido ? `TOM PROIBIDO: ${infoCanal.tom_proibido}` : ""}
${infoCanal.publico_alvo ? `PÚBLICO-ALVO: ${infoCanal.publico_alvo}` : ""}
PALETA: primaria=${paleta.cor_primaria} secundaria=${paleta.cor_secundaria} acento=${paleta.cor_acento}

FERRAMENTAS HABILITADAS (use APENAS esses tipos): ${toolsStr}
TOM VISUAL: ${descricaoTom(configEditorial.tomVisual)}
${configEditorial.usarImagemIA ? `ESTILO IMAGEM IA: ${descricaoEstiloImagem(configEditorial.estiloImagem)}` : ""}
${configEditorial.usarImagemIA ? `ESPECIFICIDADE: ${descricaoEspecificidade(configEditorial.especificidadeImagem)}` : ""}

REGRAS:
- Terço: primeiros 33% dos segmentos=agressivo, meio 33%=duvidoso, últimos 33%=esperançoso
- Ritmo: agressivo=4000ms, duvidoso=5000ms, esperançoso=6000ms
- num_clips = max(1, round(duracao_ms / ritmo_ms))
- Tipos disponíveis: ${toolsStr}
- video_stock: cenas genéricas filmáveis (query em inglês)
- imagem_ia: abstrato/emocional/específico (prompt em inglês detalhado)
- remotion_animacao: frases impactantes com animação gráfica
- NUNCA mais de 2 clips do mesmo tipo seguidos
- Queries Pexels SEMPRE em inglês, específicas e cinematográficas
- Prompts imagem_ia: SEMPRE em inglês, cinematográficos e detalhados

REGRAS DE PROMPT PARA IMAGEM IA:
Todo prompt de imagem_ia DEVE seguir esta estrutura:
[DESCRIÇÃO DA CENA em detalhes] + [ILUMINAÇÃO] + [ESTILO FOTOGRÁFICO] + [PALETA DE CORES]

Exemplos de prompts CORRETOS para o canal Aroldo do Pix:
- "Elderly Brazilian man in his 60s sitting alone on wooden porch at sunset, looking at rural landscape, warm golden backlight, cinematic photography, shallow depth of field, 35mm film grain, color palette ${paleta.cor_primaria} ${paleta.cor_secundaria}"
- "Close-up of weathered calloused hands holding unpaid bills on worn wooden table, single window casting warm shadow, nostalgic mood, cinematic close-up, natural lighting, ${paleta.cor_primaria} warm tones"

EVITAR nos prompts de imagem_ia:
- Rostos próximos (geram distorções)
- Membros em primeiro plano
- Texto na imagem
- Cenários urbanos modernos
- Pessoas jovens

REGRAS DE PROMPT PARA remotion_animacao:
O campo texto_animado DEVE conter uma frase curta e impactante do segmento.
Máximo 10 palavras. Preferencialmente uma frase que o avatar disse.
NUNCA deixar texto_animado vazio.

REGRAS DE QUERY PARA PEXELS:
Queries devem ser específicas e cinematográficas.
Exemplos CORRETOS:
- "elderly man wooden porch coffee sunset rural"
- "weathered hands holding document worried"
- "Brazilian farm cattle golden hour sunset"

SEGMENTOS:
${JSON.stringify(segmentosResumidos)}

Retorne APENAS JSON válido sem texto adicional:
{
  "segmentos": [
    {
      "id": "001",
      "terco": "agressivo",
      "intensidade": 7,
      "tipo_momento": "abertura_historia",
      "bloco": "BLOCO 1",
      "ritmo_corte_ms": 4000,
      "total_clips": 2,
      "clips": [
        {
          "clip_id": "001-01",
          "inicio_relativo_ms": 0,
          "fim_relativo_ms": 4000,
          "duracao_ms": 4000,
          "tipo": "video_stock",
          "queries": ["query1 english", "query2 english", "query3 english"],
          "arquivo_final": "cenas/001-01.mp4",
          "fallback_tipo": "imagem_ia",
          "fallback_prompt": "prompt em inglês com cor ${paleta.cor_primaria}"
        }
      ]
    }
  ]
}

Para clips remotion_animacao use:
{
  "clip_id": "001-03",
  "inicio_relativo_ms": 8000,
  "fim_relativo_ms": 14000,
  "duracao_ms": 6000,
  "tipo": "remotion_animacao",
  "texto_animado": "OBRIGATÓRIO: copie aqui a frase exata mais impactante do segmento",
  "animacao_remotion": "palavra_por_palavra",
  "arquivo_final": "cenas/001-03.mp4"
}

ATENÇÃO: O campo texto_animado é OBRIGATÓRIO em clips do tipo remotion_animacao.
Sempre copie uma frase curta e impactante do texto do segmento.
NUNCA deixe texto_animado vazio ou ausente.`;

    try {
      const resposta = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });

      const conteudo = resposta.content[0];
      if (conteudo.type !== "text") throw new Error("Resposta inesperada");

      const texto = conteudo.text.trim();
      const jsonMatch = texto.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON não encontrado");

      const resultado = JSON.parse(jsonMatch[0]);

      const processados = resultado.segmentos.map((s: any) => {
        const original = segmentos.find(seg => seg.id === s.id);
        return {
          id: s.id,
          bloco: s.bloco || "",
          inicio_ms: original?.inicio_ms || 0,
          fim_ms: original?.fim_ms || 0,
          duracao_ms: original?.duracao_ms || 0,
          texto: original?.texto || "",
          terco: s.terco,
          intensidade: s.intensidade,
          tipo_momento: s.tipo_momento,
          ritmo_corte_ms: s.ritmo_corte_ms,
          total_clips: s.total_clips,
          clips: s.clips,
        };
      });

      todosProcessados.push(...processados);
      console.log(`  ✓ ${processados.length} segmentos processados`);

      if (i < lotes.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }

    } catch (erro: any) {
      console.error(`  ✗ Erro no lote ${i + 1}: ${erro.message}`);
    }
  }

  return todosProcessados;
}
