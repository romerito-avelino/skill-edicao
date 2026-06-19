import * as fs from "fs";
import * as path from "path";
import type { CompositionVariable } from "@hyperframes/core";

export interface VariavelTemplate {
  id: string;
  type: "string" | "number" | "color" | "boolean" | "enum";
  label: string;
  default: unknown;
  options?: { value: string; label: string }[];
}

export interface MetadadosTemplate {
  templateId: string;
  arquivo: string;
  duracao: number | null;
  variaveis: VariavelTemplate[];
}

const PASTA_COMPOSITIONS = path.resolve(
  __dirname, "..", "..", "HyperFrames", "myproject", "compositions"
);

function resolverCaminhoHtml(nomeArquivo: string): string | null {
  const candidatos = [
    path.join(PASTA_COMPOSITIONS, `${nomeArquivo}.html`),
    path.join(PASTA_COMPOSITIONS, "components", `${nomeArquivo}.html`),
  ];
  return candidatos.find(p => fs.existsSync(p)) ?? null;
}

// Extrai atributo data-* do primeiro elemento que o contém.
// Usa regex simples — sem DOM, sem dependência extra.
function extrairAtributo(html: string, attr: string): string | null {
  // Formato: attr="value" ou attr='value'
  const re = new RegExp(`${attr}=(?:"([^"]*)"|'([^']*)')`);
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

// Extrai o valor de data-duration do mesmo elemento que tem data-composition-id
function extrairDuracao(html: string): number | null {
  // Encontra o bloco de atributos do elemento com data-composition-id
  const bloco = html.match(/<[a-zA-Z][^>]*data-composition-id[^>]*>/);
  if (!bloco) return null;
  const m = bloco[0].match(/data-duration=(?:"([^"]*)"|'([^']*)')/);
  if (!m) return null;
  const val = parseFloat(m[1] ?? m[2] ?? "");
  return isFinite(val) ? val : null;
}

// Suporta dois formatos de data-composition-variables:
//   Array (formato novo):  [{"id":"x","type":"string","label":"X","default":"y"}]
//   Objeto (formato legado): {"x":{"type":"string","default":"y"}}
function parseVariaveis(raw: string): VariavelTemplate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (Array.isArray(parsed)) {
    // Formato novo — filtra itens com id, type e default válidos
    return (parsed as CompositionVariable[])
      .filter(v => typeof v.id === "string" && typeof v.type === "string")
      .map(v => ({
        id: v.id,
        type: v.type as VariavelTemplate["type"],
        label: v.label ?? v.id,
        default: v.default,
        options: v.type === "enum" ? (v as { options: { value: string; label: string }[] }).options : undefined,
      }));
  }

  if (typeof parsed === "object" && parsed !== null) {
    // Formato legado {id: {type, default, ...}}
    return Object.entries(parsed as Record<string, Record<string, unknown>>)
      .filter(([, v]) => typeof v.type === "string")
      .map(([id, v]) => ({
        id,
        type: (v.type as VariavelTemplate["type"]),
        label: (v.label as string | undefined) ?? id,
        default: v.default,
        options: v.type === "enum" ? (v.options as { value: string; label: string }[] | undefined) : undefined,
      }));
  }

  return [];
}

export function lerMetadadosTemplate(nomeArquivo: string, silencioso = false): MetadadosTemplate | null {
  const warn = (msg: string) => { if (!silencioso) console.warn(msg); };

  const caminho = resolverCaminhoHtml(nomeArquivo);
  if (!caminho) {
    warn(`[hf-templates] Não encontrado: ${nomeArquivo}`);
    return null;
  }

  const html = fs.readFileSync(caminho, "utf-8");

  const compositionId = extrairAtributo(html, "data-composition-id");
  if (!compositionId) {
    warn(`[hf-templates] ${nomeArquivo}: sem data-composition-id`);
    return null;
  }

  const duracao = extrairDuracao(html);

  const rawVars = extrairAtributo(html, "data-composition-variables");
  const variaveis = rawVars ? parseVariaveis(rawVars) : [];

  if (variaveis.length === 0) {
    warn(`[hf-templates] ${nomeArquivo}: sem data-composition-variables declaradas`);
    return null;
  }

  return { templateId: compositionId, arquivo: nomeArquivo, duracao, variaveis };
}

export function listarTemplatesDisponiveis(): string[] {
  const resultados: string[] = [];

  if (!fs.existsSync(PASTA_COMPOSITIONS)) return resultados;

  const coletar = (pasta: string) => {
    if (!fs.existsSync(pasta)) return;
    fs.readdirSync(pasta)
      .filter(f => f.endsWith(".html"))
      .forEach(f => resultados.push(path.basename(f, ".html")));
  };

  coletar(PASTA_COMPOSITIONS);
  coletar(path.join(PASTA_COMPOSITIONS, "components"));

  return resultados.sort();
}

// Usa validateVariables de @hyperframes/core via dynamic import (ESM-only package)
export async function validarValoresParaTemplate(
  valores: Record<string, unknown>,
  metadados: MetadadosTemplate
): Promise<{ valido: boolean; erros: string[] }> {
  const { validateVariables, formatVariableValidationIssue } = await import("@hyperframes/core");

  // Converte VariavelTemplate[] para CompositionVariable[] que o SDK espera
  const declaracoes: CompositionVariable[] = metadados.variaveis.map(v => {
    const base = { id: v.id, type: v.type, label: v.label, default: v.default };
    if (v.type === "enum") {
      return { ...base, type: "enum" as const, default: String(v.default), options: v.options ?? [] };
    }
    return base as CompositionVariable;
  });

  const issues = validateVariables(valores, declaracoes);
  return {
    valido: issues.length === 0,
    erros: issues.map(formatVariableValidationIssue),
  };
}
