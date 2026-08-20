import * as fs from "fs";
import * as path from "path";
import { ConfigProjeto, ConfigCanal, PlanoEdicao } from "./planner";

const TEMPLATE_PATH = path.resolve(__dirname, "..", "template-mae-chat.md");
const SEM_DADO = "(não extraído automaticamente — preencha manualmente)";

// Remove/mantém blocos <!-- IF:tipo1,tipo2 --> ... <!-- ENDIF --> conforme o
// tipoFrase da cena-herói. Bloco cujo tipo não bate com a cena é removido inteiro.
function processarCondicionais(template: string, tipoFrase: string): string {
  return template.replace(
    /<!--\s*IF:([\w,]+)\s*-->([\s\S]*?)<!--\s*ENDIF\s*-->\n?/g,
    (_match, tipos: string, bloco: string) => {
      const lista = tipos.split(",").map(t => t.trim());
      return lista.includes(tipoFrase) ? bloco : "";
    }
  );
}

function substituirCampos(template: string, dados: Record<string, string>): string {
  let resultado = template;
  for (const [chave, valor] of Object.entries(dados)) {
    resultado = resultado.split(`{{${chave}}}`).join(valor);
  }
  return resultado;
}

function carregarEnriquecidos(pastaProjeto: string): Record<string, unknown>[] {
  const arquivo = path.join(pastaProjeto, "contexto-enriquecido.json");
  if (!fs.existsSync(arquivo)) return [];
  try {
    return JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  } catch {
    return [];
  }
}

// contexto-enriquecido.json é um array na ordem dos segmentos (001=índice 0)
function getEnriquecido(
  enriquecidos: Record<string, unknown>[],
  segmentoId: string
): Record<string, unknown> | null {
  const idx = parseInt(segmentoId, 10) - 1;
  return idx >= 0 ? (enriquecidos[idx] ?? null) : null;
}

const TOM_POR_TERCO: Record<string, string> = {
  agressivo: "tom explosivo, clima tenso e urgente",
  duvidoso: "tom questionador, atmosfera de dúvida",
  esperancoso: "tom suave, atmosfera esperançosa",
};

function extrairTomNicho(canal: ConfigCanal, terco: string): string {
  const nicho = canal.nicho || canal.tipoPadrao || "sem nicho definido";
  const tom = TOM_POR_TERCO[terco] ?? "tom neutro";
  return `${nicho} — ${tom}`;
}

// dadosVisuais de dado_estatistico: { valor, unidade, contexto, comparacao }
function extrairDadoEstatistico(dv: Record<string, unknown> | undefined): string {
  if (!dv) return SEM_DADO;
  const valor = dv.valor;
  if (valor === null || valor === undefined) return SEM_DADO;
  const unidade = typeof dv.unidade === "string" ? dv.unidade : "";
  const contexto = typeof dv.contexto === "string" ? dv.contexto : "";
  const comparacao = typeof dv.comparacao === "string" ? dv.comparacao : "";
  let texto = `${valor}${unidade}`;
  if (contexto) texto += ` — ${contexto}`;
  if (comparacao) texto += ` (comparação: ${comparacao})`;
  return texto;
}

// dadosVisuais de localizacao_geografica: { origem: {cidade,pais}, destino: {cidade,pais}, data, personagem }
function extrairRotaGeografica(dv: Record<string, unknown> | undefined): string {
  if (!dv) return SEM_DADO;
  const origem = dv.origem as { cidade?: string | null; pais?: string | null } | null | undefined;
  const destino = dv.destino as { cidade?: string | null; pais?: string | null } | null | undefined;
  const nomeOrigem = origem ? [origem.cidade, origem.pais].filter(Boolean).join(", ") : "";
  const nomeDestino = destino ? [destino.cidade, destino.pais].filter(Boolean).join(", ") : "";
  if (!nomeOrigem && !nomeDestino) return SEM_DADO;
  let texto = `${nomeOrigem || "?"} → ${nomeDestino || "?"}`;
  if (typeof dv.data === "string" && dv.data) texto += ` (${dv.data})`;
  if (typeof dv.personagem === "string" && dv.personagem) texto += ` — ${dv.personagem}`;
  return texto;
}

// dadosVisuais de sequencia_temporal: { eventos: [{ data, evento }] }
function extrairEventosTemporais(dv: Record<string, unknown> | undefined): string {
  if (!dv) return SEM_DADO;
  const eventos = dv.eventos as Array<{ data?: string; evento?: string }> | null | undefined;
  if (!eventos || eventos.length === 0) return SEM_DADO;
  return eventos.map(e => `- ${e.data ?? "?"}: ${e.evento ?? "?"}`).join("\n");
}

export async function exportarHerois(config: ConfigProjeto): Promise<void> {
  const arquivoPlano = path.join(config.pasta, "plano-edicao.json");

  if (!fs.existsSync(arquivoPlano)) {
    console.error(`Plano não encontrado: ${arquivoPlano}`);
    console.error("Gere o plano primeiro com --planejar");
    process.exit(1);
  }

  const plano: PlanoEdicao = JSON.parse(fs.readFileSync(arquivoPlano, "utf-8"));
  const herois = plano.segmentos.filter(s => s.origem === "heroi");

  console.log("\n═══ EXPORTAÇÃO DE BRIEFINGS — CENAS-HERÓI ═══");

  if (herois.length === 0) {
    console.log("Nenhuma cena-herói neste plano.");
    return;
  }

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template-mãe não encontrado: ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const templateBase = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  const pastaHerois = path.join(config.pasta, "output", "herois");
  if (!fs.existsSync(pastaHerois)) fs.mkdirSync(pastaHerois, { recursive: true });

  const paleta = config.canal!.paleta;
  const pastaReferencias = path.join(config.pasta, "referencias");
  const enriquecidos = carregarEnriquecidos(config.pasta);

  const indice: string[] = [
    "# Cenas-Herói — Checklist",
    "",
    `Projeto: ${plano.projeto}`,
    `Total: ${herois.length}`,
    "",
    "| clipId | tipoFrase | duração | status |",
    "|---|---|---|---|",
  ];

  for (const clip of herois) {
    const duracaoFrames = Math.ceil((clip.duracao / 1000) * 30);
    const enriquecido = getEnriquecido(enriquecidos, clip.segmentoId);
    const dv = enriquecido?.dadosVisuais as Record<string, unknown> | undefined;

    const dados: Record<string, string> = {
      CLIP_ID: clip.clipId,
      TIPO_FRASE: clip.tipoFrase,
      FRASE_IMPACTO: clip.fraseImpacto ?? clip.texto,
      TEXTO: clip.texto,
      DURACAO_SEG: (clip.duracao / 1000).toFixed(2),
      DURACAO_FRAMES: String(duracaoFrames),
      PALETA_PRIMARIA: paleta.primaria,
      PALETA_SECUNDARIA: paleta.secundaria,
      PALETA_DESTAQUE: paleta.destaque,
      PALETA_TEXTO: paleta.texto,
      PALETA_FUNDO: paleta.fundo,
      PASTA_REFERENCIAS: pastaReferencias,
      TOM_NICHO: extrairTomNicho(config.canal!, clip.terco),
      DADO_EXTRAIDO: extrairDadoEstatistico(dv),
      ROTA_EXTRAIDA: extrairRotaGeografica(dv),
      EVENTOS_EXTRAIDOS: extrairEventosTemporais(dv),
    };

    let conteudo = processarCondicionais(templateBase, clip.tipoFrase);
    conteudo = substituirCampos(conteudo, dados);

    const arquivoSaida = path.join(pastaHerois, `${clip.clipId}.md`);
    fs.writeFileSync(arquivoSaida, conteudo, "utf-8");
    console.log(`  ✓ ${path.basename(arquivoSaida)}`);

    indice.push(`| ${clip.clipId} | ${clip.tipoFrase} | ${(clip.duracao / 1000).toFixed(1)}s | pendente |`);
  }

  const arquivoIndice = path.join(pastaHerois, "_INDEX.md");
  fs.writeFileSync(arquivoIndice, indice.join("\n") + "\n", "utf-8");

  console.log(`\n✓ ${herois.length} briefing(s) exportado(s): ${pastaHerois}`);
  console.log(`  Índice: ${arquivoIndice}`);
  console.log("\nProduza as cenas reais no chat, depois rode --executar e --reincorporar.");
}
