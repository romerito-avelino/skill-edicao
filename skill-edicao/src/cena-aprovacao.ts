import { lerMetadadosTemplate, listarTemplatesDisponiveis, MetadadosTemplate, VariavelTemplate } from "./hyperframes-templates";
import { MAPA_TEMPLATE_MOMENTO, TEMPLATES_COM_SLOTS_SEQUENCIAIS, TEMPLATES_INCOMPATIVEIS } from "./hyperframes-renderer";

export type PaletaCanal = {
  primaria: string;
  secundaria: string;
  destaque: string;
  texto: string;
  fundo: string;
};

export interface PropostaCena {
  clipId: string;
  tipoMomento: string;
  atmosfera: string;
  fraseImpacto: string;
  templateAtual: string;
  templatesAlternativos: string[];
  variaveis: Record<string, unknown>;
  metadadosTemplate: MetadadosTemplate | null;
  statusRevisao: "pendente" | "aprovado" | "pulado";
}

const TEMPLATES_FALLBACK = ["caption-editorial-emphasis", "morph-text"];

// ─── Mapeamento de variáveis ──────────────────────────────────────────────────

// IDs (em lowercase) tratados como enum implícito: nunca recebem texto livre
const VARIAVEIS_ENUM_RESTRITAS = new Set(["texture"]);

// Padrões que identificam o TEXTO PRINCIPAL de um template.
// Apenas esses recebem fraseImpacto — todo o resto mantém o default do template.
const PADROES_TEXTO_PRINCIPAL: RegExp[] = [
  /^headline/,       // headline, headlineA1, headlineA2, headline1 …
  /^titulo$/,
  /^frase$/,
  /^captiontext$/,   // captionText (normalizado para lowercase)
  /^nometitulo$/,
  /^textoheadline$/,
];

function ehTextoPrincipal(id: string): boolean {
  const lower = id.toLowerCase();
  if (VARIAVEIS_ENUM_RESTRITAS.has(lower)) return false;
  return PADROES_TEXTO_PRINCIPAL.some(re => re.test(lower));
}

// word{N} / palavra{N} — sequência indexada, ex: word0, word1, palavra1
function ehWordSequence(id: string): boolean {
  return /^word\d+$/i.test(id) || /^palavra\d+$/i.test(id);
}

function mapearVariaveis(
  variaveis: VariavelTemplate[],
  fraseImpacto: string,
  dadosVisuais: Record<string, unknown>,
  paleta: PaletaCanal,
  templateName: string
): Record<string, unknown> {
  // Passo 1: todos os campos recebem o default do template
  const resultado: Record<string, unknown> = {};
  for (const v of variaveis) {
    resultado[v.id] = v.default;
  }

  const coresPaleta = [paleta.destaque, paleta.primaria, paleta.texto, paleta.fundo, paleta.secundaria];
  let indiceCorAtual = 0;
  const palavras = fraseImpacto.split(/\s+/).filter(Boolean);

  // Passo 2: variáveis de cor → distribui paleta em ordem
  for (const v of variaveis) {
    if (v.type === "color") {
      resultado[v.id] = coresPaleta[indiceCorAtual % coresPaleta.length];
      indiceCorAtual++;
    }
  }

  // Passo 3: variáveis numéricas → correspondência por nome em dadosVisuais
  for (const v of variaveis) {
    if (v.type === "number") {
      const idLower = v.id.toLowerCase();
      const entrada = Object.entries(dadosVisuais).find(
        ([k, val]) =>
          typeof val === "number" &&
          (k.toLowerCase().includes(idLower) || idLower.includes(k.toLowerCase()))
      );
      if (entrada) resultado[v.id] = entrada[1];
    }
  }

  // Passo 4: sequência word{N}/palavra{N} → distribuição posicional pela ordem numérica.
  // Funciona corretamente tanto para word0..wordN quanto para word1..wordN:
  // a 1ª var da lista sorted recebe palavras[0], a 2ª recebe palavras[1], etc.
  const wordVars = variaveis
    .filter(v => v.type === "string" && ehWordSequence(v.id))
    .sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D+/g, ""), 10);
      const numB = parseInt(b.id.replace(/\D+/g, ""), 10);
      return numA - numB;
    });

  const ehSequencial = TEMPLATES_COM_SLOTS_SEQUENCIAIS.has(templateName);
  wordVars.forEach((v, pos) => {
    if (pos < palavras.length) {
      resultado[v.id] = palavras[pos];
    } else {
      resultado[v.id] = ehSequencial ? "" : (typeof v.default === "string" ? v.default : "");
    }
  });

  // Passo 5: texto principal (headline*, titulo, frase, captionText…)
  // Não toca variáveis já cobertas pela sequência word{N}
  const principaisVars = variaveis.filter(
    v => v.type === "string" && !ehWordSequence(v.id) && ehTextoPrincipal(v.id)
  );

  if (principaisVars.length === 1) {
    resultado[principaisVars[0].id] =
      fraseImpacto || (typeof principaisVars[0].default === "string" ? principaisVars[0].default : "");
  } else if (principaisVars.length > 1) {
    // Divide a frase proporcionalmente entre múltiplos campos de título (ex: headlineA1 + headlineA2)
    const tamanhoBloco = Math.ceil(palavras.length / principaisVars.length);
    principaisVars.forEach((v, i) => {
      const inicio = i * tamanhoBloco;
      const fim = Math.min(inicio + tamanhoBloco, palavras.length);
      const fatia = palavras.slice(inicio, fim).join(" ");
      resultado[v.id] = fatia || (typeof v.default === "string" ? v.default : "");
    });
  }

  return resultado;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

function escolherTemplatePrimario(tipoMomento: string): string {
  const opcoes = MAPA_TEMPLATE_MOMENTO[tipoMomento] ?? TEMPLATES_FALLBACK;
  return opcoes[0];
}

function gerarTemplatesAlternativos(tipoMomento: string, templateAtual: string): string[] {
  const opcoesDoMomento = MAPA_TEMPLATE_MOMENTO[tipoMomento] ?? TEMPLATES_FALLBACK;

  // Outras opções do mesmo momento (sem o atual, sem incompatíveis)
  const mesmoMomento = opcoesDoMomento.filter(t => t !== templateAtual && !TEMPLATES_INCOMPATIVEIS.has(t));

  // 1 template de cada uma de 3 categorias diferentes (ordem aleatória, sem incompatíveis)
  const outrosMomentos = Object.entries(MAPA_TEMPLATE_MOMENTO)
    .filter(([k]) => k !== tipoMomento)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(([, templates]) => templates.find(t => !TEMPLATES_INCOMPATIVEIS.has(t)))
    .filter((t): t is string => t !== undefined && t !== templateAtual);

  return [...mesmoMomento, ...outrosMomentos];
}

// ─── API pública ──────────────────────────────────────────────────────────────

export function gerarPropostaCena(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segmento: any,
  paleta: PaletaCanal
): PropostaCena {
  const tipoMomento: string = segmento.tipoFrase ?? segmento.tipo_momento ?? "abertura_historia";
  const fraseImpacto: string = segmento.fraseImpacto ?? segmento.texto?.substring(0, 80) ?? "";
  const atmosfera: string = segmento.atmosfera ?? "neutro";
  const dadosVisuais: Record<string, unknown> = segmento.dadosVisuais ?? {};

  const templateAtual = escolherTemplatePrimario(tipoMomento);
  const meta = lerMetadadosTemplate(templateAtual, true);

  const variaveis = meta
    ? mapearVariaveis(meta.variaveis, fraseImpacto, dadosVisuais, paleta, templateAtual)
    : {};

  return {
    clipId: segmento.clipId,
    tipoMomento,
    atmosfera,
    fraseImpacto,
    templateAtual,
    templatesAlternativos: gerarTemplatesAlternativos(tipoMomento, templateAtual),
    variaveis,
    metadadosTemplate: meta,
    statusRevisao: "pendente",
  };
}

export function aplicarAcaoAprovacao(
  proposta: PropostaCena,
  acao: "aprovar" | "trocar_template" | "editar_variavel" | "pular",
  payload?: { novoTemplate?: string; variavelId?: string; novoValor?: unknown }
): PropostaCena {
  switch (acao) {
    case "aprovar":
      return { ...proposta, statusRevisao: "aprovado" };

    case "pular":
      return { ...proposta, statusRevisao: "pulado" };

    case "trocar_template": {
      const novoTemplate = payload?.novoTemplate;
      if (!novoTemplate) return proposta;

      const novaMeta = lerMetadadosTemplate(novoTemplate, true);

      // Remapeia variáveis: reaproveitando valores quando os IDs coincidem
      const novasVars: Record<string, unknown> = {};
      if (novaMeta) {
        for (const v of novaMeta.variaveis) {
          novasVars[v.id] = proposta.variaveis[v.id] !== undefined
            ? proposta.variaveis[v.id]
            : v.default;
        }
      }

      return {
        ...proposta,
        templateAtual: novoTemplate,
        metadadosTemplate: novaMeta,
        variaveis: novasVars,
        templatesAlternativos: gerarTemplatesAlternativos(proposta.tipoMomento, novoTemplate),
      };
    }

    case "editar_variavel": {
      if (!payload?.variavelId) return proposta;
      return {
        ...proposta,
        variaveis: { ...proposta.variaveis, [payload.variavelId]: payload.novoValor },
      };
    }

    default:
      return proposta;
  }
}

export function listarTemplatesDoMesmoMomento(tipoMomento: string): string[] {
  return (MAPA_TEMPLATE_MOMENTO[tipoMomento] ?? TEMPLATES_FALLBACK)
    .filter(t => !TEMPLATES_INCOMPATIVEIS.has(t));
}

// Expõe todos os templates disponíveis para uso externo (ex.: UI web)
export function listarTodosTemplates(): string[] {
  return listarTemplatesDisponiveis();
}
