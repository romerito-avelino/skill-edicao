import * as readline from "readline";
import {
  PropostaCena,
  PaletaCanal,
  gerarPropostaCena,
  aplicarAcaoAprovacao,
} from "./cena-aprovacao";

function perguntar(rl: readline.Interface, pergunta: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(pergunta, answer => resolve(answer.trim()));
  });
}

function exibirProposta(proposta: PropostaCena): void {
  const { clipId, tipoMomento, atmosfera, fraseImpacto, templateAtual, variaveis, metadadosTemplate, origem } = proposta;

  console.log("\n  ────────────────────────────────────────");
  console.log(`  [cena ${clipId}] Momento: ${tipoMomento} | Tom: ${atmosfera} | Origem: ${origem}`);
  console.log(`  Template: ${templateAtual}`);
  console.log(`  Frase: "${fraseImpacto}"`);

  if (metadadosTemplate && metadadosTemplate.variaveis.length > 0) {
    console.log("\n  Variáveis principais:");
    const primeiras = metadadosTemplate.variaveis.slice(0, 5);
    for (const v of primeiras) {
      const val = variaveis[v.id];
      const valStr = typeof val === "string" ? `"${val}"` : String(val ?? "(padrão)");
      console.log(`    ${v.id}: ${valStr}`);
    }
    const resto = metadadosTemplate.variaveis.length - 5;
    if (resto > 0) console.log(`    ... e mais ${resto} variável(eis)`);
  }

  console.log("\n  [A] Aprovar  [T] Trocar template  [E] Editar variável  [H] Herói⇄Fábrica  [P] Pular");
}

async function tratarTrocaTemplate(
  rl: readline.Interface,
  proposta: PropostaCena,
  paleta: PaletaCanal
): Promise<PropostaCena> {
  console.log("\n  Opções disponíveis:");
  console.log(`    [0] ${proposta.templateAtual} (atual)`);
  proposta.templatesAlternativos.forEach((t, i) => {
    console.log(`    [${i + 1}] ${t}`);
  });

  const entrada = await perguntar(rl, "  Número ou nome do template: ");
  const numero = parseInt(entrada, 10);

  let novoTemplate: string | undefined;
  if (!isNaN(numero) && numero === 0) return proposta;
  if (!isNaN(numero) && numero >= 1 && numero <= proposta.templatesAlternativos.length) {
    novoTemplate = proposta.templatesAlternativos[numero - 1];
  } else if (entrada.length > 0 && isNaN(numero)) {
    novoTemplate = entrada;
  }

  if (!novoTemplate) return proposta;

  const nova = aplicarAcaoAprovacao(proposta, "trocar_template", { novoTemplate }, paleta);
  console.log(`  ✓ Template trocado para: ${novoTemplate}`);
  return nova;
}

async function tratarEdicaoVariavel(
  rl: readline.Interface,
  proposta: PropostaCena
): Promise<PropostaCena> {
  if (proposta.metadadosTemplate) {
    console.log("\n  Variáveis disponíveis:");
    for (const v of proposta.metadadosTemplate.variaveis) {
      const val = proposta.variaveis[v.id];
      const valStr = typeof val === "string" ? `"${val}"` : String(val ?? "(padrão)");
      console.log(`    ${v.id} [${v.type}]: ${valStr}`);
    }
  }

  let propostaAtual = proposta;

  while (true) {
    const variavelId = await perguntar(rl, '  ID da variável (ou "ok"): ');
    if (!variavelId || variavelId.toLowerCase() === "ok") break;

    const novoValorStr = await perguntar(rl, `  Novo valor para "${variavelId}": `);
    const varMeta = proposta.metadadosTemplate?.variaveis.find(v => v.id === variavelId);

    let novoValor: unknown = novoValorStr;
    if (varMeta?.type === "number") {
      const n = parseFloat(novoValorStr);
      if (!isNaN(n)) novoValor = n;
    } else if (varMeta?.type === "boolean") {
      novoValor = novoValorStr.toLowerCase() === "true";
    }

    propostaAtual = aplicarAcaoAprovacao(propostaAtual, "editar_variavel", { variavelId, novoValor });
    console.log(`  ✓ ${variavelId} = ${JSON.stringify(novoValor)}`);
  }

  return propostaAtual;
}

export async function rodarRevisaoCLI(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  segmentosComAnimacao: any[],
  paleta: PaletaCanal
): Promise<Map<string, PropostaCena>> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resultados = new Map<string, PropostaCena>();

  console.log("\n═══ REVISÃO DE CENAS — MODO SEMI-MANUAL ═══");
  console.log(`${segmentosComAnimacao.length} cenas para revisar\n`);

  for (const segmento of segmentosComAnimacao) {
    let proposta = gerarPropostaCena(segmento, paleta);

    while (proposta.statusRevisao === "pendente") {
      exibirProposta(proposta);
      const escolha = (await perguntar(rl, "  Escolha: ")).toLowerCase();

      if (escolha === "a") {
        proposta = aplicarAcaoAprovacao(proposta, "aprovar");
        console.log(`  ✓ Cena ${proposta.clipId} aprovada`);
      } else if (escolha === "t") {
        proposta = await tratarTrocaTemplate(rl, proposta, paleta);
      } else if (escolha === "e") {
        proposta = await tratarEdicaoVariavel(rl, proposta);
      } else if (escolha === "h") {
        proposta = aplicarAcaoAprovacao(proposta, "alternar_origem");
        console.log(`  → Cena ${proposta.clipId} agora é: ${proposta.origem}`);
      } else if (escolha === "p") {
        proposta = aplicarAcaoAprovacao(proposta, "pular");
        console.log(`  → Cena ${proposta.clipId} pulada`);
      }
    }

    resultados.set(proposta.clipId, proposta);
  }

  rl.close();

  const aprovadas = [...resultados.values()].filter(p => p.statusRevisao === "aprovado").length;
  const puladas   = [...resultados.values()].filter(p => p.statusRevisao === "pulado").length;
  console.log(`\n${aprovadas} cenas aprovadas, ${puladas} puladas`);

  return resultados;
}
