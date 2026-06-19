import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Anthropic from "@anthropic-ai/sdk";
import { Segmento } from "./srt-parser";
import { ConfigEditorial } from "./editorial";

export interface CanalContexto {
  nome: string;
  persona: string;
  nicho?: string;
  publicoAlvo?: string;
  tomProibido?: string[];
}

export interface SegmentoEnriquecido {
  // Análise narrativa cirúrgica
  segmentoId: string;
  tipoMomento: string;
  atmosfera: string;
  fraseImpacto: string;
  descricaoVisual: string;
  elementosVisuais: string[];
  dadosVisuais: Record<string, unknown>;
  templatePrimario: string;
  templateSecundario: string | null;
  motorRender: "hyperframes" | "remotion";
  // Assets visuais — usados pelo visual-selector (bypass de IA)
  queryPexels: string;
  promptImagem: string;
  fraseAnimacao: string;
  sensivel: boolean;
  motivoSensivel: string | null;
  // Metadados emocionais — usados pelo batch-animator (Remotion)
  emocao: string;
  intensidade: string;
  referenciaVisual: string | null;
}

const client = new Anthropic();

const MAPA_TEMPLATES = `
  abertura_historia       → vfx-liquid-background, morph-text
  climax_emocional        → vfx-shatter, caption-kinetic-slam
  reflexao_melancolia     → caption-texture, caption-editorial-emphasis
  reflexao_arrependimento → caption-editorial-emphasis, caption-texture
  transicao_historia      → cinematic-zoom, transitions-3d
  dado_estatistico        → data-chart, apple-money-count
  localizacao_geografica  → world-map, north-korea-locked-down
  abertura_esperanca      → caption-neon-accent, caption-editorial-emphasis
  dialogo_personagem      → yt-lower-third, caption-blend-difference
  conceito_explicacao     → flowchart, caption-parallax-layers
  virada_narrativa        → vfx-magnetic, caption-kinetic-slam
  pausa_reflexiva         → caption-parallax-layers, caption-texture
  confronto               → vfx-shatter, caption-kinetic-slam
  descoberta              → vfx-magnetic, morph-text
  introducao_personagem   → yt-lower-third, caption-editorial-emphasis
  sequencia_temporal      → transitions-3d, flowchart
`.trim();

function construirMapa(
  lista: SegmentoEnriquecido[],
  segmentos: Segmento[]
): Map<string, SegmentoEnriquecido> {
  const mapa = new Map<string, SegmentoEnriquecido>();
  const porIdNum = new Map(lista.map(e => [parseInt(e.segmentoId, 10), e]));
  segmentos.forEach((seg, i) => {
    const n = parseInt(seg.id, 10);
    const enriquecido = porIdNum.get(n) ?? lista[i];
    if (enriquecido) mapa.set(seg.id, enriquecido);
  });
  return mapa;
}

function validar(lista: SegmentoEnriquecido[]): SegmentoEnriquecido[] {
  return lista.map(e => {
    let tipo = e.tipoMomento;
    const dv = e.dadosVisuais as Record<string, unknown>;

    // Regra 1: localizacao_geografica sem origem E destino → reflexao_melancolia
    if (tipo === "localizacao_geografica") {
      const origem = dv?.origem as Record<string, unknown> | null;
      const destino = dv?.destino as Record<string, unknown> | null;
      const semOrigem = !origem || (origem.cidade == null && origem.pais == null);
      const semDestino = !destino || (destino.cidade == null && destino.pais == null);
      if (semOrigem && semDestino) tipo = "reflexao_melancolia";
    }

    // Regra 2: dado_estatistico sem valor → conceito_explicacao
    if (tipo === "dado_estatistico" && dv?.valor == null) {
      tipo = "conceito_explicacao";
    }

    // fraseAnimacao sempre igual a fraseImpacto
    const fraseAnimacao = e.fraseImpacto;

    return { ...e, tipoMomento: tipo, fraseAnimacao };
  });
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

  const roteiro = segmentos
    .map(s => `[${s.id.padStart(3, "0")}] ${s.texto}`)
    .join("\n");

  const tomProibido = (canal.tomProibido ?? []).join(", ");

  const prompt = `Você é um analista narrativo e diretor de arte especialista em YouTube.

Leia o roteiro COMPLETO antes de classificar qualquer segmento.
Construa mentalmente: quem narra, qual o arco emocional, onde está o clímax, como resolve.

═══ CANAL ═══
Nome: ${canal.nome}
Persona: ${canal.persona}
Nicho: ${canal.nicho ?? "não especificado"}
Público-alvo: ${canal.publicoAlvo ?? "não especificado"}
Tom proibido: ${tomProibido || "nenhum"}

═══ ROTEIRO COMPLETO (${segmentos.length} segmentos) ═══
${roteiro}

═══ MAPA DE TEMPLATES ═══
${MAPA_TEMPLATES}

═══ SCHEMA DE SAÍDA (um objeto por segmento) ═══

{
  "segmentoId": "001",

  // ANÁLISE NARRATIVA
  "tipoMomento": "EXATAMENTE um dos 16 valores abaixo",
  "atmosfera": "EXATAMENTE uma das 9 palavras abaixo",
  "fraseImpacto": "máximo 8 palavras, impactante, sem reticências no início",
  "descricaoVisual": "2+ frases cinematográficas: texturas, iluminação, movimento, tipografia",
  "elementosVisuais": ["3 a 5 elementos concretos e específicos"],
  "dadosVisuais": { /* estrutura varia por tipoMomento — ver abaixo */ },
  "templatePrimario": "template1 do mapa acima para este tipoMomento",
  "templateSecundario": "template2 do mapa acima ou null",
  "motorRender": "hyperframes",

  // ASSETS VISUAIS (para busca de vídeo stock e geração de imagem)
  "queryPexels": "3-5 palavras em inglês para busca de vídeo stock",
  "promptImagem": "English image generation prompt — [subject] [action/state] [environment] [lighting] [cinematic style]. NUNCA inclua texto na imagem. NUNCA copie literalmente o SRT.",
  "fraseAnimacao": "igual a fraseImpacto",
  "sensivel": false,
  "motivoSensivel": null,

  // METADADOS EMOCIONAIS (para animações Remotion)
  "emocao": "frustração|esperança|tristeza|alegria|reflexão|urgência|neutro",
  "intensidade": "baixa|media|alta",
  "referenciaVisual": null
}

═══ VALORES VÁLIDOS ═══

tipoMomento (escolha exatamente um dos 16):
abertura_historia | climax_emocional | reflexao_melancolia |
reflexao_arrependimento | transicao_historia | dado_estatistico |
localizacao_geografica | abertura_esperanca | dialogo_personagem |
conceito_explicacao | virada_narrativa | pausa_reflexiva |
confronto | descoberta | introducao_personagem | sequencia_temporal

atmosfera (escolha exatamente uma das 9):
dramatico | melancolico | esperancoso | urgente | reflexivo | pesado | tenso | neutro | suave

═══ ESTRUTURA DE dadosVisuais POR tipoMomento ═══

localizacao_geografica:
  { "tipo": "voo"|"deslocamento"|"destaque_pais"|null,
    "origem": { "cidade": string|null, "pais": string|null }|null,
    "destino": { "cidade": string|null, "pais": string|null }|null,
    "data": string|null, "personagem": string|null, "detalhe_narrativo": string|null }

dado_estatistico:
  { "valor": number|null, "unidade": "%"|"USD"|"BRL"|"anos"|"pessoas"|string|null,
    "contexto": string|null, "comparacao": string|null }

introducao_personagem:
  { "nome": string|null, "idade": number|null,
    "profissao": string|null, "papel_narrativo": string|null }

sequencia_temporal:
  { "eventos": [{ "data": string, "evento": string }]|null }

conceito_explicacao:
  { "conceito_central": string|null, "relacoes": [string]|null }

todos os outros tipoMomento:
  { "detalhe": string|null }

═══ REGRAS INVIOLÁVEIS ═══
1. NUNCA invente dados não presentes no texto → null se não existe
2. fraseImpacto e fraseAnimacao: máximo 8 palavras, sem reticências no início
3. elementosVisuais: 3 a 5 itens concretos e específicos
4. templatePrimario e templateSecundario: EXATAMENTE os nomes do MAPA DE TEMPLATES para o tipoMomento escolhido
5. motorRender: sempre "hyperframes" para templates deste mapa
6. promptImagem: sempre em inglês, nunca com violência, nudez ou texto sobreposto
7. Considere o arco narrativo completo: o mesmo segmento classifica diferente dependendo de onde aparece no vídeo
8. sensivel: true se o promptImagem puder ser rejeitado por APIs de geração de imagem

═══ VALIDAÇÕES AUTOMÁTICAS (aplique antes de retornar) ═══
- SE tipoMomento = "localizacao_geografica"
  E dadosVisuais.origem = null E dadosVisuais.destino = null
  → troque para "reflexao_melancolia"
- SE tipoMomento = "dado_estatistico" E dadosVisuais.valor = null
  → troque para "conceito_explicacao"

SAÍDA: JSON puro, sem markdown, sem explicações.
Array com um objeto por segmento, na mesma ordem do roteiro.
[{...}, {...}, ...]`;

  console.log(`  Chamando IA para ${segmentos.length} segmentos (1 chamada)...`);

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const conteudo = resposta.content[0];
  if (conteudo.type !== "text") throw new Error("Resposta inesperada do enriquecedor");

  const texto = conteudo.text.trim();

  const jsonMatch = texto.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Array JSON não encontrado na resposta do enriquecedor");

  let lista: SegmentoEnriquecido[] = JSON.parse(jsonMatch[0]);
  lista = validar(lista);

  fs.writeFileSync(arquivoCache, JSON.stringify(lista, null, 2), "utf-8");
  console.log(`  ✓ Contexto salvo: ${arquivoCache}`);

  return construirMapa(lista, segmentos);
}
