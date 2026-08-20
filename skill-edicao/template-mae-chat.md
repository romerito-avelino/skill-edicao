# Template-mãe — briefing de cena-herói (Claude chat + Remotion MCP)

> Este é o esqueleto FIXO. O `--exportar-herois` preenche os campos `{{...}}` a partir do
> `plano-edicao.json` e ativa apenas o bloco condicional do `tipoFrase` da cena.
> O que você cola no chat é o `.md` já preenchido (um por cena, em `output/herois/{clipId}.md`).

---

Você é um especialista em **Remotion** (motion graphics por código para vídeo). Vamos criar **UMA** cena de animação para um vídeo do YouTube.

## Regras invioláveis
- **Duração EXATA:** {{DURACAO_SEG}}s ({{DURACAO_FRAMES}} frames a 30fps). Nem mais, nem menos.
- **Resolução:** 1920×1080 (16:9).
- **Render final com FUNDO TRANSPARENTE** (canal alpha), para eu sobrepor no editor. As camadas de conteúdo continuam opacas — só o fundo é transparente.
- **Paleta do canal** (use somente estas cores):
  - Primária: {{PALETA_PRIMARIA}}
  - Destaque: {{PALETA_DESTAQUE}}
  - Texto: {{PALETA_TEXTO}}
  - Fundo (se precisar): {{PALETA_FUNDO}}
- **Estética:** {{TOM_NICHO}}. Nada genérico — a cena precisa comunicar o conteúdo específico abaixo.
- **Referências visuais:** anexadas a partir de `{{PASTA_REFERENCIAS}}` (se eu tiver colado imagens, use-as como referência de estilo, não copie).

## Conteúdo desta cena
- Momento narrativo: **{{TIPO_FRASE}}**
- Frase de impacto (texto na tela): **"{{FRASE_IMPACTO}}"**
- Trecho do roteiro (contexto): "{{TEXTO}}"

<!-- IF:dado_estatistico -->
## Dado (NÃO invente números)
- Número/estatística exata a exibir: **{{DADO_EXTRAIDO}}**
- Formato sugerido: contador animado e/ou gráfico; destaque o número com a cor de destaque.
- Se houver série ou comparação de valores, **me pergunte os números antes** de assumir qualquer coisa.
<!-- ENDIF -->

<!-- IF:localizacao_geografica -->
## Mapa
- Rota origem → destino: **{{ROTA_EXTRAIDA}}**
- Estilo: mapa limpo, linha de rota animada; efeito globo opcional.
- Fronteiras de país/estado visíveis; água colorida dentro da paleta.
<!-- ENDIF -->

<!-- IF:sequencia_temporal -->
## Linha do tempo
- Eventos, em ordem: **{{EVENTOS_EXTRAIDOS}}**
- Revelar sequencialmente (staggered), com *hold* + *fade* no fim.
<!-- ENDIF -->

<!-- IF:conceito_explicacao -->
## Explicação estruturada
- Conceito: **{{FRASE_IMPACTO}}**
- Quebrar em 2–5 blocos/etapas que aparecem em ordem, texto conciso por bloco.
<!-- ENDIF -->

## Antes de gerar
Me faça as **perguntas de clarificação** necessárias para acertarmos de primeira — estilo de animação, timing das entradas, tipografia, se quero gráfico/globo específico, etc. Só gere depois que eu responder.

Ao terminar, faça um **autocheck**: a duração bateu exatamente ({{DURACAO_SEG}}s / {{DURACAO_FRAMES}} frames)? O fundo está transparente? As cores respeitam a paleta?

## Entrega
Renderize com fundo transparente e me diga o caminho do arquivo. Vou salvá-lo como **`{{CLIP_ID}}.mp4`** e soltar em `output/cenas/`, substituindo o placeholder.
