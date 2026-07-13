import { listarTemplatesDisponiveis, lerMetadadosTemplate } from "./hyperframes-templates";

function main() {
  console.log("\n═══ TEMPLATES DISPONÍVEIS ═══\n");
  const templates = listarTemplatesDisponiveis();

  if (templates.length === 0) {
    console.log("Nenhum template encontrado.");
    console.log("Verifique se a pasta HyperFrames/myproject/compositions/ existe.");
    return;
  }

  templates.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2, " ")}. ${t}`));
  console.log(`\nTotal: ${templates.length} templates\n`);

  // Mostra todos que tiverem variáveis, até 3
  console.log("═══ METADADOS (templates com variáveis) ═══\n");

  let encontrados = 0;
  for (const nome of templates) {
    if (encontrados >= 3) break;
    const meta = lerMetadadosTemplate(nome, true); // silencioso no scan
    if (!meta) continue;

    encontrados++;
    console.log(`• ${meta.arquivo}`);
    console.log(`  ID:      ${meta.templateId}`);
    console.log(`  Duração: ${meta.duracao !== null ? `${meta.duracao}s` : "não declarada"}`);
    console.log(`  Variáveis (${meta.variaveis.length}):`);
    for (const v of meta.variaveis) {
      const extra = v.type === "enum" ? ` [${v.options?.map(o => o.value).join("|")}]` : "";
      console.log(`    - ${v.id} (${v.type}${extra}): default=${JSON.stringify(v.default)}`);
    }
    console.log();
  }

  if (encontrados === 0) {
    console.log("Nenhum template tem data-composition-variables declarado ainda.");
    console.log("Adicione o atributo em um template HyperFrames para usá-lo aqui.");
  }
}

main();
