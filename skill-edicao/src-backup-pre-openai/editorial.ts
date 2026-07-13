import * as readline from "readline";

export interface Distribuicao {
  video_stock: number;
  remotion_animacao: number;
  imagem_ia: number;
}

export interface ConfigEditorial {
  usarVideoStock: boolean;
  usarRemotion: boolean;
  usarImagemIA: boolean;
  estiloImagem: number;
  tomVisual: number;
  distribuicao: Distribuicao;
  templateAnimacao: string;
  modoGeracao: "automatico" | "semi_manual";
}

function perguntar(rl: readline.Interface, pergunta: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(pergunta, answer => resolve(answer.trim().toLowerCase()));
  });
}

const NOMES_FERRAMENTA: Record<string, string> = {
  video_stock:       "Vídeos stock (Pexels)",
  remotion_animacao: "Animações (Remotion)",
  imagem_ia:         "Imagens IA",
};

async function perguntarDistribuicao(
  rl: readline.Interface,
  ferramentasAtivas: string[]
): Promise<Distribuicao> {
  let dist: Distribuicao = { video_stock: 0, remotion_animacao: 0, imagem_ia: 0 };

  while (true) {
    console.log("\n── DISTRIBUIÇÃO ─────────────────────");
    console.log("Defina a proporção entre as ferramentas (deve somar 100):");

    const pcts: Record<string, number> = {};
    for (const f of ferramentasAtivas) {
      pcts[f] = parseInt(await perguntar(rl, `${NOMES_FERRAMENTA[f]} %: `)) || 0;
    }

    const soma = ferramentasAtivas.reduce((acc, f) => acc + pcts[f], 0);
    if (soma === 100) {
      dist.video_stock       = pcts["video_stock"]       ?? 0;
      dist.remotion_animacao = pcts["remotion_animacao"] ?? 0;
      dist.imagem_ia         = pcts["imagem_ia"]         ?? 0;
      return dist;
    }

    console.log(`✗ A soma foi ${soma}%. Tente novamente.`);
  }
}

export async function controleEditorial(): Promise<ConfigEditorial> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n═══════════════════════════════════════");
  console.log("   SKILL-EDIÇÃO | Controle Editorial");
  console.log("═══════════════════════════════════════\n");

  console.log("── FERRAMENTAS ──────────────────────");
  const usarVideoStock = (await perguntar(rl, "Usar vídeos stock (Pexels)? [s/n] ")) === "s";
  const usarRemotion   = (await perguntar(rl, "Usar animações gráficas (Remotion)? [s/n] ")) === "s";
  const usarImagemIA   = (await perguntar(rl, "Usar geração de imagens IA? [s/n] ")) === "s";

  const ferramentasAtivas = [
    usarVideoStock && "video_stock",
    usarRemotion   && "remotion_animacao",
    usarImagemIA   && "imagem_ia",
  ].filter(Boolean) as string[];

  if (ferramentasAtivas.length === 0) {
    console.log("\n⚠  Nenhuma ferramenta selecionada. Ativando todas por padrão.");
    rl.close();
    return {
      usarVideoStock: true,
      usarRemotion: true,
      usarImagemIA: true,
      estiloImagem: 1,
      tomVisual: 1,
      distribuicao: { video_stock: 34, remotion_animacao: 33, imagem_ia: 33 },
      templateAnimacao: "",
      modoGeracao: "automatico",
    };
  }

  let distribuicao: Distribuicao;
  if (ferramentasAtivas.length === 1) {
    const unica = ferramentasAtivas[0];
    distribuicao = {
      video_stock:       unica === "video_stock"       ? 100 : 0,
      remotion_animacao: unica === "remotion_animacao" ? 100 : 0,
      imagem_ia:         unica === "imagem_ia"         ? 100 : 0,
    };
  } else {
    distribuicao = await perguntarDistribuicao(rl, ferramentasAtivas);
  }

  let estiloImagem = 1;

  if (usarImagemIA) {
    console.log("\n── ESTILO DE IMAGENS ──────────────");
    console.log("Estilo visual das imagens:");
    console.log("  [1] Ilustração editorial / conceitual");
    console.log("  [2] Aquarela");
    console.log("  [3] Traço / line art");
    console.log("  [4] Personagens palito");
    console.log("  [5] Storyboard / quadrinhos");
    estiloImagem = parseInt(await perguntar(rl, "Escolha: ")) || 1;
  }

  let templateAnimacao = "";

  if (usarRemotion) {
    console.log("\n── TEMPLATE DE ANIMAÇÃO ─────────────────────");
    console.log("Descreva o estilo visual das animações:");
    console.log("(O agente criará variações contextuais baseadas nessa descrição)\n");
    console.log("Exemplos:");
    console.log('  • "Texto em neon sobre fundo escuro com partículas"');
    console.log('  • "Bonecos numa fazenda com balões de fala e céu azul"');
    console.log('  • "Estilo jornal antigo com manchetes e fotos sépia"');
    console.log('  • "Elementos geométricos minimalistas em movimento"');
    templateAnimacao = await new Promise<string>(resolve => {
      rl.question("\nSeu template: ", answer => resolve(answer.trim()));
    });
  }

  console.log("\n── TOM VISUAL ─────────────────────");
  console.log("  [1] Dramático / emocional");
  console.log("  [2] Inspiracional / esperançoso");
  console.log("  [3] Reflexivo / melancólico");
  console.log("  [4] Neutro / documental");
  const tomVisual = parseInt(await perguntar(rl, "Escolha: ")) || 1;

  console.log("\n── MODO DE GERAÇÃO ──────────────────────");
  console.log("  [1] Automático — agente decide tudo e renderiza direto");
  console.log("  [2] Semi-manual — você revisa cada cena antes de renderizar");
  const modoGeracao = (await perguntar(rl, "Escolha: ")) === "2" ? "semi_manual" : "automatico";

  rl.close();

  const modoGeracaoFinal: "automatico" | "semi_manual" = modoGeracao;

  return {
    usarVideoStock,
    usarRemotion,
    usarImagemIA,
    estiloImagem,
    tomVisual,
    distribuicao,
    templateAnimacao,
    modoGeracao: modoGeracaoFinal,
  };
}

export function resumirConfigEditorial(c: ConfigEditorial): string {
  const tools = [
    c.usarVideoStock && `video_stock(${c.distribuicao.video_stock}%)`,
    c.usarImagemIA   && `imagem_ia(${c.distribuicao.imagem_ia}%)`,
    c.usarRemotion   && `remotion_animacao(${c.distribuicao.remotion_animacao}%)`,
  ].filter(Boolean).join(", ");
  const tons = ["", "Dramático", "Inspiracional", "Reflexivo", "Neutro"];
  const modo = c.templateAnimacao ? ` | Template: "${c.templateAnimacao.substring(0, 40)}"` : "";
  const geracao = c.modoGeracao === "semi_manual" ? " | Semi-manual" : "";
  return `Ferramentas: ${tools} | Tom: ${tons[c.tomVisual] || "?"}${modo}${geracao}`;
}
