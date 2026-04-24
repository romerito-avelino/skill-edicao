---
name: skill-edicao
description: Use esta skill para criar planos de edição completos para vídeos de histórias no YouTube. Recebe três inputs — Pacote de Dados (PDF), arquivo SRT com roteiro, e thumbnail — e produz um arquivo timeline.json e uma pasta /cenas com todos os assets visuais numerados e prontos para montagem no editor de vídeo.
---

# Skill-Edição — Manual de Operação Completo

## Visão Geral

Esta skill é uma fábrica de assets visuais. Ela NÃO monta o vídeo final. Ela entrega ao usuário todos os ingredientes visuais organizados, numerados e no tempo certo, para que ele faça a montagem final no editor de vídeo de sua preferência (CapCut, DaVinci Resolve, Premiere).

A lógica central é: cada segmento SRT pode — e geralmente vai — gerar MÚLTIPLOS clips visuais. Um segmento de 30 segundos nunca fica com um único clip parado. A Skill calcula quantos clips são necessários e os gera com variação de tipo e conteúdo.

## Stack de ferramentas

- **Pexels API** — busca de vídeos e imagens stock (gratuito)
- **Replicate API + Flux Schnell** — geração de imagens por IA
- **Replicate API + Kling** — geração de vídeos curtos por IA (5-10s)
- **Remotion** — textos animados e animações gráficas
- **ffmpeg** — corte, formatação e padronização dos clips

## Inputs obrigatórios

### 1. Pacote de Dados (PDF)
Arquivo PDF com 7 sessões gerado automaticamente pelo Agente-Ideias. Contém:
- Identidade do canal e avatar
- Nicho e subnicho
- Público-alvo e dores
- Gap de edição (instrução visual mais importante)
- Estilo de narração e tom proibido
- Gatilhos emocionais e palavras-chave
- Referências de canais concorrentes

**Ação:** Leia o Gap de Edição com atenção máxima. Ele define o
estilo visual de TODO o vídeo.

### 2. SRT + Roteiro
Arquivo `.srt` com marcação temporal em horas:minutos:segundos,milissegundos.
O roteiro está estruturado em blocos com:
- ORIENTAÇÃO DE CENA (descrição visual — use como base das queries)
- FALA DO AVATAR (conteúdo da narração)
- NOTA DE DIREÇÃO (define posição do avatar e intensidade)
- Indicação de terço emocional (agressivo / duvidoso / esperançoso)

### 3. Thumbnail (imagem)
Arquivo de imagem da capa do vídeo.

**Ação:** Extraia a paleta de cores dominante. Use essas cores como
parâmetro de estilo em TODOS os prompts de geração IA para manter
coerência visual entre a capa e o vídeo.

## Ritmo de corte — regra central

**O ritmo padrão de troca visual é de 4 a 6 segundos por clip.**

Cada terço emocional usa um ponto diferente dentro dessa faixa:

| Terço | Duração por clip | Motivo |
|---|---|---|
| Agressivo | 4s | Corte rápido cria tensão |
| Duvidoso | 5s | Ritmo médio, reflexivo |
| Esperançoso | 6s | Corte lento transmite serenidade |

### Fórmula de cálculo de clips por segmento
num_clips = arredondar(duracao_segmento_ms ÷ ritmo_do_terco_ms)

Exemplos práticos:
- Segmento de 30s no terço agressivo (4s): 30 ÷ 4 = **7 clips**
- Segmento de 30s no terço duvidoso (5s): 30 ÷ 5 = **6 clips**
- Segmento de 30s no terço esperançoso (6s): 30 ÷ 6 = **5 clips**
- Segmento de 10s no terço agressivo (4s): 10 ÷ 4 = **2 clips**
- Segmento de 5s em qualquer terço: **1 clip**

**Regras de limite:**
- Mínimo: 1 clip por segmento (nunca zero)
- Nunca criar clip com menos de 3 segundos de duração
- Se o último clip de um segmento ficar com menos de 3s,
  incorpore esse tempo ao clip anterior

## Fluxo de trabalho

### Etapa 1 — Leitura e extração dos inputs

1. Leia o Pacote de Dados completo. Extraia e registre:
   - Nome do canal, nicho, avatar
   - Gap de edição (copie textualmente)
   - Paleta visual e estilo
   - Tom proibido
   - Palavras e gatilhos que engajam o público

2. Leia o SRT completo. Monte um array de segmentos:
[
{ id: "001", inicio_ms: 0, fim_ms: 4500, texto: "..." },
{ id: "002", inicio_ms: 4500, fim_ms: 12000, texto: "..." },
...
]

3. Analise a thumbnail. Identifique e registre:
   - Cor primária (hex)
   - Cor secundária (hex)
   - Cor de acento (hex)
   - Mood visual (ex: "quente e reflexivo", "sombrio e tenso")

### Etapa 2 — Cruzamento SRT × Roteiro

Para cada segmento do SRT, identifique:
- A qual BLOCO do roteiro ele pertence
- A qual terço emocional pertence (agressivo / duvidoso / esperançoso)
- Se há ORIENTAÇÃO DE CENA ativa nesse momento
- A intensidade emocional (1 a 10)
- Se o avatar deve estar visível e em qual posição

### Etapa 3 — Cálculo e decisão de clips por segmento

Para cada segmento:

**Passo 3.1 — Calcule quantos clips são necessários**
ritmo = 4000ms (agressivo) | 5000ms (duvidoso) | 6000ms (esperançoso)
num_clips = max(1, arredondar(duracao_ms ÷ ritmo))
duracao_por_clip = duracao_ms ÷ num_clips

**Passo 3.2 — Decida o tipo de cada clip**

Use esta lógica para CADA clip dentro do segmento, variando os tipos
para evitar monotonia:
CLIP TIPO — ordem de prioridade:

A ORIENTAÇÃO DE CENA descreve algo filmável e genérico?
→ SIM → PEXELS (busca em inglês com 3 queries diferentes)
→ NÃO ↓
É momento abstrato, emocional ou específico do universo do canal?
→ SIM → REPLICATE/FLUX (imagem IA) + Remotion (zoom lento Ken Burns)
→ NÃO ↓
É uma frase-chave, virada emocional ou clímax do segmento?
→ SIM → REMOTION (texto animado na tela)
→ NÃO → PEXELS com query mais genérica relacionada ao tema


**Passo 3.3 — Regra de variação obrigatória**

Dentro do mesmo segmento, NUNCA coloque mais de 2 clips do mesmo tipo
em sequência. A variação mínima obrigatória é:
PERMITIDO:   stock → stock → imagem_ia → stock → remotion → stock
PROIBIDO:    stock → stock → stock → stock → stock → stock
PROIBIDO:    imagem_ia → imagem_ia → imagem_ia → imagem_ia

### Etapa 4 — Geração do plano de edição

Para cada segmento, gere uma ficha completa com TODOS os clips:
[SEGMENTO 003]
Bloco: BLOCO 2 — A VISITA
Timestamp: 00:00:08,500 --> 00:00:38,500
Duração total: 30.000ms
Terço: agressivo
Ritmo de corte: 4s por clip
Total de clips: 7
[CLIP 003-01] 00:00:00 → 00:00:04 (4s)
Tipo: video_stock
Query 1: "elderly brazilian man sitting porch coffee"
Query 2: "senior man wooden chair farm sunset"
Query 3: "countryside porch evening relaxing"
Arquivo: cenas/003-01.mp4
[CLIP 003-02] 00:00:04 → 00:00:08 (4s)
Tipo: video_stock
Query 1: "coffee cup steam wooden table rustic"
Query 2: "hot coffee mug farmhouse morning"
Query 3: "ceramic mug table countryside"
Arquivo: cenas/003-02.mp4
[CLIP 003-03] 00:00:08 → 00:00:12 (4s)
Tipo: imagem_ia
Prompt: "elderly Brazilian man looking at the horizon from a wooden
porch, late afternoon golden light, rural farm Goias Brazil, cinematic,
warm orange tones matching [cor_primaria], nostalgic mood, film grain"
Animação Remotion: zoom_lento_ken_burns (zoom in 1.08x durante 4s)
Arquivo: cenas/003-03.mp4
[CLIP 003-04] 00:00:12 → 00:00:16 (4s)
Tipo: video_stock
Query 1: "man walking rural road farm brazil"
Query 2: "dirt road countryside sunset walking"
Query 3: "rural path farm afternoon"
Arquivo: cenas/003-04.mp4
[CLIP 003-05] 00:00:16 → 00:00:20 (4s)
Tipo: video_stock
Query 1: "cattle grazing pasture sunset"
Query 2: "cows farm grass golden hour"
Query 3: "livestock field rural sunset"
Arquivo: cenas/003-05.mp4
[CLIP 003-06] 00:00:20 → 00:00:24 (4s)
Tipo: imagem_ia
Prompt: "two old Brazilian men sitting together on a farm porch,
serious conversation, sunset light, cinematic, warm tones [cor_primaria],
nostalgic, realistic"
Animação Remotion: zoom_lento_ken_burns (zoom out 1.08x durante 4s)
Arquivo: cenas/003-06.mp4
[CLIP 003-07] 00:00:24 → 00:00:30 (6s — absorveu 2s do resto)
Tipo: remotion
Conteúdo: texto animado
Texto: "Sessenta e dois anos. E não tem escolha."
Estilo: fade_in letra por letra, fonte serifada, cor [cor_acento]
Arquivo: cenas/003-07.mp4


### Etapa 5 — Geração do timeline.json

```json
{
  "video_info": {
    "canal": "",
    "nicho": "",
    "titulo": "",
    "duracao_total_ms": 0,
    "avatar_arquivo": "assets/avatar/avatar.mp4",
    "fps": 30,
    "resolucao": "1920x1080",
    "gap_de_edicao": "",
    "estilo_visual": ""
  },
  "paleta_thumbnail": {
    "cor_primaria": "#hex",
    "cor_secundaria": "#hex",
    "cor_acento": "#hex",
    "mood": ""
  },
  "resumo": {
    "total_segmentos": 0,
    "total_clips": 0,
    "clips_por_tipo": {
      "video_stock": 0,
      "imagem_ia": 0,
      "video_ia": 0,
      "remotion": 0
    },
    "custo_estimado_reais": 0
  },
  "segmentos": [
    {
      "id": "003",
      "bloco": "BLOCO 2 — A VISITA",
      "inicio_ms": 8500,
      "fim_ms": 38500,
      "duracao_ms": 30000,
      "texto": "Semana passada eu tava aqui mesmo...",
      "terco": "agressivo",
      "intensidade": 6,
      "tipo_momento": "causo",
      "ritmo_corte_ms": 4000,
      "total_clips": 7,
      "clips": [
        {
          "clip_id": "003-01",
          "inicio_relativo_ms": 0,
          "fim_relativo_ms": 4000,
          "duracao_ms": 4000,
          "tipo": "video_stock",
          "fonte": "pexels",
          "queries": [
            "elderly brazilian man sitting porch coffee",
            "senior man wooden chair farm sunset",
            "countryside porch evening relaxing"
          ],
          "arquivo_fonte": "assets/downloaded/003-01_source.mp4",
          "arquivo_final": "cenas/003-01.mp4",
          "fallback_tipo": "imagem_ia",
          "fallback_prompt": ""
        },
        {
          "clip_id": "003-03",
          "inicio_relativo_ms": 8000,
          "fim_relativo_ms": 12000,
          "duracao_ms": 4000,
          "tipo": "imagem_ia",
          "fonte": "replicate/flux-schnell",
          "prompt": "elderly Brazilian man looking at horizon, wooden porch, golden hour, cinematic, warm orange tones, nostalgic, film grain",
          "animacao_remotion": "ken_burns_zoom_in",
          "zoom_fator": 1.08,
          "arquivo_final": "cenas/003-03.mp4"
        },
        {
          "clip_id": "003-07",
          "inicio_relativo_ms": 24000,
          "fim_relativo_ms": 30000,
          "duracao_ms": 6000,
          "tipo": "remotion",
          "texto": "Sessenta e dois anos. E não tem escolha.",
          "animacao": "fade_in_por_letra",
          "cor_texto": "#hex_cor_acento",
          "arquivo_final": "cenas/003-07.mp4"
        }
      ]
    }
  ]
}
```

### Etapa 6 — Comandos ffmpeg por clip

Para cada clip, gere o comando ffmpeg correspondente:

**Para video_stock (cortar na duração exata):**
```bash
ffmpeg -i assets/downloaded/003-01_source.mp4 \
  -t 4.0 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,\
       pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" \
  -r 30 -c:v libx264 -preset fast -crf 18 \
  -an cenas/003-01.mp4
```

**Para imagem_ia com Ken Burns (Remotion renderiza e ffmpeg padroniza):**
```bash
# Remotion renderiza a imagem com zoom animado → salva como MP4
# ffmpeg padroniza o resultado
ffmpeg -i assets/downloaded/003-03_rendered.mp4 \
  -t 4.0 \
  -vf "scale=1920:1080" \
  -r 30 -c:v libx264 -preset fast -crf 18 \
  -an cenas/003-03.mp4
```

**Para Remotion (texto animado — Remotion renderiza direto):**
```bash
npx remotion render src/index.ts TextoAnimado \
  --props='{"texto":"Sessenta e dois anos. E não tem escolha.",
            "duracao":6,"cor":"#hex"}' \
  --output cenas/003-07.mp4
```

## Regras absolutas (nunca violar)

1. Clip nunca tem menos de 3 segundos de duração
2. Toda query de busca no Pexels em INGLÊS
3. Todo prompt de geração IA inclui as cores da thumbnail
4. Cada clip em `/cenas` tem EXATAMENTE a duração calculada
5. Nomenclatura: segmento 3 dígitos, clip 2 dígitos (003-01, 003-02...)
6. Nunca mais de 2 clips do mesmo tipo em sequência no mesmo segmento
7. O terço agressivo usa 4s por clip, duvidoso 5s, esperançoso 6s
8. Sempre gerar 3 queries alternativas para buscas no Pexels

## Regras visuais por nicho

### Erros financeiros / Finanças pessoais (ex: Aroldo do Pix)
- Paleta: tons terrosos, quentes, alaranjados, sépia
- Assets: fazenda, campo, pôr do sol, mãos calejadas, cadeira de
  madeira, café, gado, interior do Brasil, homens mais velhos
- Evitar: gráficos modernos, escritório, cidade grande, jovens
- Remotion: fonte serifada, tom nostálgico, sem animações modernas

### Terror / Suspense
- Paleta: escura, alto contraste, dessaturada
- Assets: noite, floresta, casas abandonadas, névoa, sombras
- Remotion: fonte bold, aparição rápida do texto, cor vermelha escura

### Romance / Drama
- Paleta: quente, suave, dourada
- Assets: pores do sol, mãos dadas, flores, cartas, cidades à noite
- Remotion: fonte serifada elegante, fade lento

### True Crime / Crimes reais
- Paleta: dessaturada, cinza e vermelho escuro
- Assets: arquivos, mapas, jornais, cenas de investigação, manchetes
- Remotion: fonte monospace, efeito máquina de escrever

### Histórias bíblicas / Espirituais
- Paleta: dourada, azul profundo, luz dramática
- Assets: desertos, templos, multidões em épocas antigas, céu dramático
- Remotion: fonte serifada, dourado, aparição suave

## Output final esperado
skill-edicao/
├── output/
│   └── timeline.json       ← mapa completo de todos os segmentos e clips
├── cenas/
│   ├── 001-01.mp4          ← cada clip individual, pronto para montagem
│   ├── 001-02.mp4
│   ├── 002-01.mp4
│   ├── 003-01.mp4
│   ├── 003-02.mp4
│   ├── 003-03.mp4
│   └── ...
└── assets/
└── downloaded/         ← arquivos brutos antes do processamento ffmpeg

O usuário pega a pasta `/cenas`, o `timeline.json`, abre o editor
de vídeo e monta o vídeo adicionando o vídeo do avatar (HeyGen) por
cima de cada clip conforme as instruções de posição, a narração e os
efeitos sonoros.
