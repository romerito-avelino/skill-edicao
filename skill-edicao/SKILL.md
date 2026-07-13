---
name: skill-edicao
description: Use esta skill para criar planos de edição completos para vídeos de histórias no YouTube. Recebe os inputs do projeto — Pacote de Dados (PDF), arquivo SRT com roteiro, e thumbnail/config do canal — e produz um arquivo plano-edicao.json e uma pasta output/cenas com todos os assets visuais numerados e prontos para montagem no editor de vídeo.
---

# Skill-Edição — Manual de Operação Completo

## Visão Geral

Esta skill é uma fábrica de assets visuais. Ela NÃO monta o vídeo final. Ela entrega ao usuário todos os ingredientes visuais organizados, numerados e no tempo certo, para que ele faça a montagem final no editor de vídeo de sua preferência (CapCut, DaVinci Resolve, Premiere).

A lógica central é: cada segmento SRT pode — e geralmente vai — gerar MÚLTIPLOS clips visuais. Um segmento longo nunca fica com um único clip parado. A Skill calcula quantos clips são necessários e os gera com variação de tipo e conteúdo.

O projeto NÃO é exclusivo de um canal — foi desenhado para servir múltiplos canais de histórias documentais, histórias pessoais e conteúdo educativo com dados.

## Stack de ferramentas (ATUAL)

- **HyperFrames** (HTML + GSAP) — motor central de animações de texto e de dados. Render em lote via CLI (`npx hyperframes@0.6.110 render` com `--variables-file`).
- **Pexels API** — busca de vídeos e imagens stock (gratuito). Cada clipe recebe uma máscara visual via FFmpeg para ficar único.
- **OpenAI GPT Image** (`gpt-image-1-mini`) — geração de imagens por IA. Retorna base64, gravado direto no disco.
- **Remotion** — usado APENAS para o efeito Ken Burns (pan/zoom) nas imagens IA. Não gera mais animações de texto/gráficos.
- **ffmpeg** — corte, formatação, padronização e máscaras dos clips.

> Histórico: o pipeline já usou Replicate (Flux/Kling) para imagens e o Remotion para animações geradas por IA. Ambos foram descontinuados — Replicate deu lugar ao OpenAI, e as animações passaram todas para o HyperFrames (o Remotion via IA gerava "tela preta" com 3D). O código dessas rotas antigas pode existir dormente, mas não é acionado.

## Inputs obrigatórios

### 1. Pacote de Dados (PDF)
Arquivo PDF gerado pelo Agente-Ideias. Contém identidade do canal e avatar, nicho e subnicho, público-alvo e dores, gap de edição (instrução visual mais importante), estilo de narração e tom proibido, gatilhos emocionais e palavras-chave, referências de concorrentes.

**Ação:** Leia o Gap de Edição com atenção máxima. Ele define o estilo visual de TODO o vídeo.

### 2. SRT + Roteiro
Arquivo `.srt` com marcação temporal. O `context-enricher` lê o roteiro inteiro em UMA chamada de IA e extrai, por segmento: tipoMomento, atmosfera, fraseImpacto, descricaoVisual, elementosVisuais, dadosVisuais, queryPexels e promptImagem.

### 3. Configuração de canal / Thumbnail
Cada projeto aponta para um canal (`projeto.json` → `canal_id`), e o canal define a paleta usada nos prompts e animações, mantendo coerência visual.

## Ritmo de corte — regra central (PRESERVADA)

**O ritmo padrão de troca visual é de 4 a 6 segundos por clip.**

| Terço | Duração por clip | Motivo |
|---|---|---|
| Agressivo | 4s | Corte rápido cria tensão |
| Duvidoso | 5s | Ritmo médio, reflexivo |
| Esperançoso | 6s | Corte lento transmite serenidade |

### Fórmula de cálculo de clips por segmento
num_clips = max(1, arredondar(duracao_segmento_ms ÷ ritmo_do_terco_ms))

Exemplos:
- Segmento de 30s no terço agressivo (4s): 30 ÷ 4 = **7 clips**
- Segmento de 30s no terço duvidoso (5s): 30 ÷ 5 = **6 clips**
- Segmento de 30s no terço esperançoso (6s): 30 ÷ 6 = **5 clips**
- Segmento de 5s em qualquer terço: **1 clip**

**Regras de limite:**
- Mínimo: 1 clip por segmento (nunca zero)
- Nunca criar clip com menos de 3 segundos de duração
- Se o último clip de um segmento ficar com menos de 3s, incorpore esse tempo ao clip anterior

## Fluxo de trabalho (ATUAL — três comandos)

O pipeline opera em três fases, cada uma um comando:

```
cd "F:\1-YOUTUBE\agente-edicoes\skill-edicao"
npx tsx src/index.ts [projeto] --planejar
npx tsx src/index.ts [projeto] --revisar
npx tsx src/index.ts [projeto] --executar
```

### FASE A — Planejamento (`--planejar`)

1. **context-enricher.ts** — 1 chamada de IA (claude-sonnet-4-6) lê o SRT inteiro e enriquece cada segmento. Gera `contexto-enriquecido.json`. O `promptImagem` já injeta o ESTILO de imagem escolhido no menu e aplica a regra anti-avatar (cena/paisagem/metáfora, nunca retrato do narrador).

2. **planner.ts** — decide a ferramenta de cada clip e gera `plano-edicao.json`:
   - **MOMENTOS_FORCAM_HYPERFRAMES**: momentos como `dado_estatistico`, `introducao_personagem`, `localizacao_geografica`, `conceito_explicacao`, `sequencia_temporal` são forçados para animação HyperFrames.
   - **CAMINHO A (anti-duplicação)**: quando um segmento gera 2+ clipes visuais, o 2º+ que seria imagem IA é convertido para vídeo stock — impossível ter duas imagens quase idênticas no mesmo segmento.
   - **Motor sempre HyperFrames**: toda animação usa o motor HyperFrames. O Remotion não gera mais animação (só Ken Burns).

### FASE REVISÃO (`--revisar`) — só no modo semi-manual
Revisão cena a cena no terminal: **[A]**provar · **[T]**rocar template · **[E]**ditar variável · **[P]**ular. Salva `templateAprovado` e `variaveisAprovadas` no plano, para a execução não precisar chamar a API.

### FASE B — Execução (`--executar`)
- **batch-animator.ts** — orquestra a geração. HyperFrames via `--variables-file` (sem API quando pré-aprovado).
- **asset-fetcher.ts** — vídeo stock (Pexels) + imagem IA (OpenAI GPT Image).
- **ffmpeg-processor.ts** — máscaras nos vídeos stock + Ken Burns nas imagens.
- **remotion-renderer.ts** — SÓ o Ken Burns das imagens IA.

Saída final: MP4s numerados em `projetos/[nome]/output/cenas/`.

## Menu de Estilo de Imagem (5 estilos, todos ilustração)

No `--planejar`, o usuário escolhe o estilo visual das imagens IA:
- **[1]** Ilustração editorial / conceitual
- **[2]** Aquarela
- **[3]** Traço / line art
- **[4]** Personagens palito
- **[5]** Storyboard / quadrinhos

Fotorrealista e Cinematográfico foram removidos (o projeto foca em ilustração para diferenciar das imagens de stock). O antigo menu de "Especificidade" foi removido por completo. O estilo escolhido é injetado no `promptImagem` com reforço "NON-photorealistic", e há reescrita inteligente de prompt caso a OpenAI recuse por política.

## Templates HyperFrames — mapa por momento narrativo

Cada `tipoMomento` aponta para um ou mais templates (MAPA_TEMPLATE_MOMENTO em hyperframes-renderer.ts):

| Template | Tipo | Momentos |
|---|---|---|
| caption-editorial-emphasis | word-seq | reflexao_arrependimento, reflexao_melancolia, introducao_personagem, abertura_esperanca, transicao_historia |
| caption-texture | word-seq | reflexao_melancolia, reflexao_arrependimento, pausa_reflexiva |
| caption-kinetic-slam | word-seq | climax_emocional, virada_narrativa, confronto, abertura_historia, descoberta |
| caption-neon-accent | word-seq | abertura_esperanca |
| caption-parallax-layers | word-seq | conceito_explicacao, pausa_reflexiva |
| data-chart | dados | dado_estatistico |
| flowchart | dados | conceito_explicacao, sequencia_temporal |
| north-korea-locked-down | mapa | localizacao_geografica |
| apple-money-count | dados | dado_estatistico (alternativo) |

**Templates word-sequenciais** distribuem a `fraseImpacto` palavra por palavra, com ajuste automático de duração pelo número de palavras.
**Templates de dados** têm timeline coreografada com duração fixa (data-chart 15s, flowchart 12s, north-korea 7s) — não ajustar. O headline é mapeado automaticamente; dados numéricos ainda exigem edição via [E] no `--revisar`.

**morph-text foi APOSENTADO do fluxo automático**: é um template de morph estilo Apple (2-5 frases curtas independentes, duração fixa de 15s). Alimentá-lo palavra-por-slot causava "palavra solta" e vídeo de 15s. Continua no catálogo para uso manual/avulso.

**Reservados para uso avulso** (fora do pipeline): yt-lower-third, world-map, vfx-liquid-background, nyc-paris-flight, app-showcase, vpn-youtube-spot, macos-tahoe-liquid-glass, morph-text.
**Incompatíveis** (nunca usar): vfx-shatter, caption-blend-difference, transitions-3d, transitions-scale.

## Vídeo Stock — máscaras visuais (FFmpeg)

Cada clipe de vídeo stock recebe uma máscara para ficar visualmente único e evitar penalização do YouTube por conteúdo repetido de banco gratuito. Sorteio **determinístico por clip_id** (o mesmo clipe sempre recebe a mesma máscara, reprodutível). Pool de 6:
preto e branco, desfoque leve, saturação alta, saturação baixa, vinheta, grão de filme.
A inversão horizontal (hflip) fica FORA do sorteio automático (espelha texto/rostos/logos) — disponível só manualmente. Uma blacklist de IDs já baixados evita repetição entre clipes.

## Regras absolutas (nunca violar)

1. Clip nunca tem menos de 3 segundos de duração
2. Toda query de busca no Pexels em INGLÊS
3. Todo prompt de imagem IA respeita o estilo escolhido e a regra anti-avatar
4. Cada clip em `output/cenas` tem EXATAMENTE a duração calculada
5. Nomenclatura: segmento 3 dígitos, clip 2 dígitos (003-01, 003-02...)
6. Nunca mais de 2 clips do mesmo tipo em sequência no mesmo segmento
7. O terço agressivo usa 4s por clip, duvidoso 5s, esperançoso 6s
8. Toda animação passa pelo HyperFrames (o Remotion só faz Ken Burns)
9. Nunca editar `compositions-backup/` (originais intactos)
10. Nunca rodar `--executar` antes de validar o `--revisar`

## Regras visuais por nicho (PRESERVADAS)

### Erros financeiros / Finanças pessoais (ex: Aroldo do Pix)
- Paleta: tons terrosos, quentes, alaranjados, sépia
- Assets: fazenda, campo, pôr do sol, mãos calejadas, cadeira de madeira, café, gado, interior do Brasil, homens mais velhos
- Evitar: gráficos modernos, escritório, cidade grande, jovens
- Animação: tom nostálgico, sem animações modernas

### Terror / Suspense
- Paleta: escura, alto contraste, dessaturada
- Assets: noite, floresta, casas abandonadas, névoa, sombras
- Animação: fonte bold, aparição rápida do texto, cor vermelha escura

### Romance / Drama
- Paleta: quente, suave, dourada
- Assets: pores do sol, mãos dadas, flores, cartas, cidades à noite
- Animação: fonte serifada elegante, fade lento

### True Crime / Crimes reais
- Paleta: dessaturada, cinza e vermelho escuro
- Assets: arquivos, mapas, jornais, cenas de investigação, manchetes
- Animação: fonte monospace, efeito máquina de escrever

### Histórias bíblicas / Espirituais
- Paleta: dourada, azul profundo, luz dramática
- Assets: desertos, templos, multidões em épocas antigas, céu dramático
- Animação: fonte serifada, dourado, aparição suave

## Output final esperado

```
skill-edicao/projetos/[nome-projeto]/
├── roteiro.srt                 ← input
├── pacote-dados.pdf            ← input
├── projeto.json                ← {"canal_id": "..."}
├── contexto-enriquecido.json   ← gerado no --planejar
├── plano-edicao.json           ← mapa completo de segmentos e clips
└── output/
    └── cenas/
        ├── 001-01.mp4          ← cada clip individual, pronto para montagem
        ├── 001-02.mp4
        ├── 002-01.mp4
        └── ...
```

O usuário pega a pasta `output/cenas` e o `plano-edicao.json`, abre o editor de vídeo e monta o vídeo adicionando o avatar (HeyGen) por cima de cada clip conforme as instruções, a narração e os efeitos sonoros.

## Comandos úteis

```powershell
# Pipeline completo
npx tsx src/index.ts [projeto] --planejar
npx tsx src/index.ts [projeto] --revisar
npx tsx src/index.ts [projeto] --executar

# Forçar re-enriquecimento do contexto
npx tsx src/index.ts [projeto] --planejar --reenriquecer

# Testar todos os templates (gratuito, sem API)
npm run teste-templates

# Verificar erros de tipo
npx tsc --noEmit

# Para testar troca de estilo/prompt: apagar OS DOIS caches
# (só apagar o plano não basta — o enricher reusa o contexto)
Remove-Item "...\projetos\[proj]\plano-edicao.json"
Remove-Item "...\projetos\[proj]\contexto-enriquecido.json"
```

## Custos

- API Claude (claude-sonnet-4-6): ~$0,30 por vídeo de 20-25min (enriquecimento)
- OpenAI GPT Image (gpt-image-1-mini): ~$0,20–0,50 por vídeo
- Pexels: gratuito
- HyperFrames render: local, sem custo
- Total estimado: bem abaixo de $1 por vídeo