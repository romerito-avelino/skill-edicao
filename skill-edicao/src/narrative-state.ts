import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import Anthropic from "@anthropic-ai/sdk";

export interface ContextoClip {
  revelados: string[];
  pontoAtual: string;
  conceito: string;
  temaPrincipal: string;
  progresso: number;
}

interface EstadoNarrativoData {
  temaPrincipal: string;
  pontosTEmporais: string[];
  conceitos: string[];
  frasesMarkantes: string[];
}

export class EstadoNarrativo {
  private data: EstadoNarrativoData = {
    temaPrincipal: "",
    pontosTEmporais: [],
    conceitos: [],
    frasesMarkantes: [],
  };
  private revelados: string[] = [];

  async inicializar(textos: string[], pastaProjeto: string): Promise<void> {
    const arquivo = path.join(pastaProjeto, "estado-narrativo.json");

    if (fs.existsSync(arquivo)) {
      try {
        this.data = JSON.parse(fs.readFileSync(arquivo, "utf-8"));
        console.log("  ✓ Estado narrativo carregado");
        return;
      } catch {
        // cai para regenerar
      }
    }

    try {
      const client = new Anthropic();
      const roteiro = textos.join("\n").substring(0, 6000);

      const resposta = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `Analise o roteiro abaixo e extraia elementos narrativos para animações de vídeo.

ROTEIRO:
${roteiro}

Retorne APENAS JSON válido:
{
  "temaPrincipal": "tema central em 3-5 palavras",
  "pontosTEmporais": ["evento com data/tempo"],
  "conceitos": ["conceito-chave abstrato"],
  "frasesMarkantes": ["frase curta impactante max 6 palavras"]
}

Regras:
- pontosTEmporais: 3-6 itens, eventos com datas ou durações mencionadas no texto (ex: "40 anos atrás", "2019 — a virada")
- conceitos: 3-6 itens, temas abstratos recorrentes (ex: família, dívida, coragem)
- frasesMarkantes: 4-6 itens, máximo 6 palavras cada, alto impacto emocional
- temaPrincipal: 3-5 palavras descrevendo o tema central`,
        }],
      });

      const conteudo = resposta.content[0];
      if (conteudo.type === "text") {
        const jsonMatch = conteudo.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          this.data = {
            temaPrincipal: parsed.temaPrincipal || "",
            pontosTEmporais: Array.isArray(parsed.pontosTEmporais) ? parsed.pontosTEmporais : [],
            conceitos: Array.isArray(parsed.conceitos) ? parsed.conceitos : [],
            frasesMarkantes: Array.isArray(parsed.frasesMarkantes) ? parsed.frasesMarkantes : [],
          };
          fs.writeFileSync(arquivo, JSON.stringify(this.data, null, 2), "utf-8");
          console.log("  ✓ Estado narrativo gerado e salvo");
        }
      }
    } catch (erro: any) {
      console.log(`  ⚠ Estado narrativo: ${erro.message?.substring(0, 60)} — usando fallback`);
    }
  }

  getContextoParaClip(numeroClip: number, totalClips: number): ContextoClip {
    const { pontosTEmporais, conceitos, temaPrincipal } = this.data;

    const progresso = totalClips > 1 ? (numeroClip - 1) / (totalClips - 1) : 0;

    const pontoAtual = pontosTEmporais.length > 0
      ? pontosTEmporais[(numeroClip - 1) % pontosTEmporais.length]
      : "";

    const conceito = conceitos.length > 0
      ? conceitos[(numeroClip - 1) % conceitos.length]
      : "";

    const revelados = [...this.revelados];

    // Alterna entre revelar um ponto temporal (clips ímpares) e um conceito (clips pares)
    const elementoAtual = numeroClip % 2 === 1 ? pontoAtual : conceito;
    if (elementoAtual && !this.revelados.includes(elementoAtual)) {
      this.revelados.push(elementoAtual);
    }

    return { revelados, pontoAtual, conceito, temaPrincipal, progresso };
  }
}
