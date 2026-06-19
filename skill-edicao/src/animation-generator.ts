import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import * as fs from "fs";
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
  descricaoVisual?: string;
  elementosVisuais?: string[];
  atmosfera?: string;
  estiloFundo?: string;
  referenciaVisual?: string | null;
}

// ─── Leitura de templates reais ───────────────────────────────────────────────

const REMOTION_COMPOSITIONS = path.resolve(
  __dirname, "..", "..", "Remotion", "src", "compositions"
);

const MAPA_TEMPLATE_ARQUIVO: Record<string, string> = {
  "textos-v1": "textos-impacto/V1PalavraPorPalavra.tsx",
  "textos-v2": "textos-impacto/V2LetrasCaindo.tsx",
  "textos-v3": "textos-impacto/V3Digitando.tsx",
  "textos-v4": "textos-impacto/V4ZoomDramatico.tsx",
  "mapas-v1":  "mapas-mentais/V1CirculoOrbital.tsx",
  "mapas-v2":  "mapas-mentais/V2ArvoreVertical.tsx",
  "mapas-v3":  "mapas-mentais/V3CascataDiagonal.tsx",
  "mapas-v4":  "mapas-mentais/V4PulsandoOndas.tsx",
  "linha-v1":  "linha-tempo/V1HorizontalPontos.tsx",
  "linha-v2":  "linha-tempo/V2VerticalCascata.tsx",
  "linha-v3":  "linha-tempo/V3CircularRelogio.tsx",
  "linha-v4":  "linha-tempo/V4ComIcones.tsx",
  "citacoes-v1": "citacoes/V1Manuscrito.tsx",
  "citacoes-v2": "citacoes/V2FadeSuave.tsx",
  "citacoes-v3": "citacoes/V3Cortina.tsx",
  "citacoes-v4": "citacoes/V4PalavrasOrbital.tsx",
  "3d-titulo-epico":     "3d-abertura/V1TituloEpico.tsx",
  "3d-particulas-chuva": "3d-abertura/V2ParticulesChuva.tsx",
  "3d-logo-reveal":      "3d-abertura/V3LogoReveal.tsx",
  "3d-globo-brasil":     "3d-mapas/V1GloboBrasil.tsx",
  "3d-mapa-brasil":      "3d-mapas/V2MapaBrasil.tsx",
  "3d-regiao-zoom":      "3d-mapas/V3RegiaoZoom.tsx",
  "3d-texto":            "3d-objetos/V1Texto3D.tsx",
  "3d-grafico":          "3d-objetos/V2Grafico3D.tsx",
  "3d-esfera":           "3d-objetos/V3EsferaConceito.tsx",
  "fade-texto-flutuante":  "FadeTextoFlutuante.tsx",
  "titulo-particulas":     "TituloParticulas.tsx",
  "texto-explosao-centro": "TextoExplosaoCentro.tsx",
  "texto-manuscrito":      "TextoManuscrito.tsx",
  "nos-conectados":        "NosConectados.tsx",
  "linha-tempo-animada":   "LinhaTempoAnimada.tsx",
};

function lerTemplateReal(tipoAnimacao: string): string | null {
  const arquivo = MAPA_TEMPLATE_ARQUIVO[tipoAnimacao];
  if (!arquivo) return null;
  const caminhoCompleto = path.join(REMOTION_COMPOSITIONS, arquivo);
  try {
    return fs.readFileSync(caminhoCompleto, "utf-8");
  } catch {
    return null;
  }
}

// ─── Fallback: instruções por tipo (geração do zero) ─────────────────────────

const instrucoesPorTipo: Record<string, string> = {
  "1": "Texto de impacto — palavras entram uma por uma com spring, fonte bold 700-900, presença dominante. Cada palavra em linha separada se necessário.",
  "2": "Mapa mental — nós circulares conectados por linhas animadas SVG, conceito central maior no meio, satélites aparecem em sequência orbital.",
  "3": "Linha do tempo — marcadores horizontais que surgem da esquerda, datas em destaque acima, descrições abaixo, progressão suave.",
  "4": "Citação elegante — aspas grandes decorativas aparecem primeiro, texto surge letra por letra ou fade suave, atribuição menor abaixo.",
  "5": "Misto criativo — combine elementos contextuais ao tema. Pode misturar formas geométricas, texto e partículas conforme o tom emocional.",
  "6": "Profundidade 3D com CSS — use perspective, rotateX/Y, translateZ para criar profundidade real. Elementos flutuam em camadas diferentes.",
  "7": "Gráfico animado — barras crescem do zero até valor final com spring, rótulos aparecem após as barras, use dados numéricos fictícios plausíveis ao contexto.",
  "8": "Parallax documental — mínimo 3 camadas com velocidades diferentes (0.2x, 0.5x, 1x), texto na camada frontal, elementos geométricos no meio, fundo lento.",
  "9": "Mão desenhando — use SVG com stroke-dashoffset animado via interpolate para simular traço sendo desenhado, depois texto aparece dentro do desenho.",
};

// ─── Geração via API ──────────────────────────────────────────────────────────

export async function gerarCodigoAnimacao(params: ParamsGerarAnimacao): Promise<string> {
  const client = new Anthropic();
  const fps    = 30;
  const frames = Math.ceil((params.duracao / 1000) * fps);

  const codigoBase = lerTemplateReal(params.template);

  if (codigoBase === null && params.template) {
    console.log(`  ⚠ Template "${params.template}" não mapeado — geração livre`);
  }

  let prompt: string;

  if (codigoBase !== null) {
    // ── Modo adaptação: template real encontrado ──────────────────────────────
    prompt = `Você é um diretor de arte cinematográfico especialista em \
motion graphics para documentários e webdocs brasileiros.
Seu trabalho é adaptar templates de animação para contar \
histórias visualmente — nunca ilustrar literalmente o texto.

=== TEMPLATE BASE ===
${codigoBase}

=== SUA TAREFA ===
Adapte este template para a cena descrita abaixo.
Faça ajustes cirúrgicos. Não reescreva do zero.
Mantenha toda a lógica de animação intacta.

=== CONTEXTO DA CENA ===
Frase a exibir: "${params.contexto}"
Atmosfera: ${params.atmosfera ?? params.emocao}
Momento narrativo: ${params.tipoAnimacao}
Posição no vídeo: clip ${params.indiceClip} de ${params.totalClips}

=== DESCRIÇÃO VISUAL CINEMATOGRÁFICA ===
${params.descricaoVisual ?? "Use o tom emocional como guia"}

=== ELEMENTOS VISUAIS A INCORPORAR ===
${params.elementosVisuais?.join(", ") ?? "Definir pelo tom emocional"}

=== ESTILO INSPIRACIONAL ===
${params.estiloFundo ?? "Livre criação contextual"}
IMPORTANTE: O estilo acima é INSPIRAÇÃO, não lei.
Adapte-o à atmosfera específica desta cena.

=== PALETA DE CORES ===
Primária:    ${params.paleta.primaria}
Secundária:  ${params.paleta.secundaria}
Destaque:    ${params.paleta.destaque}
Texto:       ${params.paleta.texto}
Fundo:       ${params.paleta.fundo}

=== PARÂMETROS TÉCNICOS ===
Duração: ${params.duracao}ms — ${frames} frames a 30fps
Resolução: 1920x1080

=== AJUSTES POR ATMOSFERA ===
dramatico:   spring stiffness 320-400, damping 8-12,
             fontWeight 800-900, sombras pesadas
melancolico: spring stiffness 60-90, damping 20-28,
             fontWeight 300-400, dessaturado
esperancoso: spring stiffness 120-160, damping 14-17,
             fontWeight 500-600, luz expansiva
urgente:     spring stiffness 350-450, damping 6-10,
             fontWeight 900, alto contraste
reflexivo:   spring stiffness 80-120, damping 18-22,
             fontWeight 400-500, movimento lento
pesado:      spring stiffness 200-280, damping 12-16,
             fontWeight 700-800, elementos densos
tenso:       spring stiffness 300-380, damping 8-14,
             fontWeight 700-800, vibração sutil

=== SEQUÊNCIA CINEMATOGRÁFICA OBRIGATÓRIA ===
FASE 1 (0% a 20%):   elementos de fundo e textura entram
FASE 2 (20% a 45%):  texto surge com fade suave
FASE 3 (45% a 80%):  estado estável com micro-animações
FASE 4 (80% a 100%): saída elegante

=== ZONAS SEGURAS ===
Decorativos: y 0-162px e y 918-1080px (zIndex máximo 10)
Texto principal: y 162-756px (zIndex mínimo 100)
Sempre adicione fundo semitransparente atrás do texto:
backgroundColor: rgba(0,0,0,0.70), borderRadius: 8,
padding: "12px 24px"

=== REGRAS DE CÓDIGO ===
- Renomeie o componente para: AnimacaoGerada
- Remova import de FraseImpactoProps — use React.FC sem props
- Mantenha todos os imports remotion existentes
- NÃO adicione imports externos
- Use Easing.ease (sem parênteses) como valor
- Use Easing.bezier(a,b,c,d) com argumentos quando necessário
- Retorne APENAS o código TSX, sem markdown, sem explicações`;

  } else {
    // ── Modo fallback: template não encontrado, gera do zero ─────────────────
    const instrucoes = instrucoesPorTipo[params.tipoAnimacao] ?? instrucoesPorTipo["5"];

    prompt = `Você é um diretor de arte cinematográfico especialista em motion graphics para documentários e webdocs brasileiros.

===== ESPECIFICAÇÕES TÉCNICAS =====
Duração  : ${params.duracao}ms
FPS      : ${fps}
Frames   : ${frames}
Resolução: 1920x1080px

===== CONTEXTO CINEMATOGRÁFICO =====
Frase a exibir: "${params.contexto}"
Atmosfera: ${params.atmosfera ?? params.emocao} (intensidade: ${params.intensidade})

DESCRIÇÃO VISUAL:
${params.descricaoVisual ?? "Crie com base no tom emocional da cena"}

ELEMENTOS A INCORPORAR:
${params.elementosVisuais?.join(", ") ?? "Livre criação contextual"}

ESTILO INSPIRACIONAL (adapte ao contexto):
${params.estiloFundo ?? "Livre criação"}

Posição no vídeo: clip ${params.indiceClip} de ${params.totalClips}

===== PALETA DE CORES =====
Primária   : ${params.paleta.primaria}
Secundária : ${params.paleta.secundaria}
Destaque   : ${params.paleta.destaque}
Texto      : ${params.paleta.texto}
Fundo      : ${params.paleta.fundo}

===== REGRAS DE IMPORTAÇÃO E USO DO REMOTION =====
Imports PERMITIDOS (exatamente estes, nada mais):
  import React from 'react'
  import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, Sequence } from 'remotion'

PROIBIDO importar qualquer outra biblioteca (three.js, gsap, framer-motion, etc.).
Use apenas CSS inline e animações via interpolate/spring do Remotion.

CORRETO:
  interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp', easing: Easing.ease })
  interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
  spring({ frame, fps, config: { stiffness: 200, damping: 15 } })
ERRADO (nunca use):
  easing: Easing.ease()
  spring({ ..., config: { duration: ... } })

Nome do componente: AnimacaoGerada
Export obrigatório: export const AnimacaoGerada: React.FC = () => { ... }

===== SEQUÊNCIA CINEMATOGRÁFICA OBRIGATÓRIA =====
FASE 1 (0% a 20%):   elementos de fundo e textura entram
FASE 2 (20% a 45%):  texto surge com fade suave
FASE 3 (45% a 80%):  estado estável com micro-animações
FASE 4 (80% a 100%): saída elegante

===== ZONAS SEGURAS =====
Decorativos: y 0-162px e y 918-1080px (zIndex máximo 10)
Texto principal: y 162-756px (zIndex mínimo 100)
SEMPRE adicione fundo semitransparente atrás do texto:
  backgroundColor: "rgba(0,0,0,0.70)", borderRadius: 8, padding: "12px 24px"

===== AJUSTES POR ATMOSFERA =====
dramatico:   spring stiffness 320-400, damping 8-12,  fontWeight 800-900, sombras pesadas
melancolico: spring stiffness 60-90,  damping 20-28, fontWeight 300-400, dessaturado
esperancoso: spring stiffness 120-160, damping 14-17, fontWeight 500-600, luz expansiva
urgente:     spring stiffness 350-450, damping 6-10,  fontWeight 900, alto contraste
reflexivo:   spring stiffness 80-120, damping 18-22,  fontWeight 400-500, movimento lento
pesado:      spring stiffness 200-280, damping 12-16, fontWeight 700-800, elementos densos
tenso:       spring stiffness 300-380, damping 8-14,  fontWeight 700-800, vibração sutil

===== TIPO DE ANIMAÇÃO: ${params.tipoAnimacao} =====
${instrucoes}

Retorne APENAS o código TSX, sem markdown, sem explicações. Export: export const AnimacaoGerada: React.FC = () => {`;
  }

  const resposta = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const conteudo = resposta.content[0];
  if (conteudo.type !== "text") throw new Error("Resposta inesperada da API");

  let codigo = conteudo.text.trim();
  codigo = codigo.replace(/^```(?:tsx?|jsx?|typescript|javascript)?\r?\n?/i, "");
  codigo = codigo.replace(/\r?\n?```\s*$/i, "");

  return codigo.trim();
}
