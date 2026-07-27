# Design "Liquid Glass"

**Status:** planejado (nao iniciado) -- so registro de intencao, ainda sem
implementacao.

## Motivacao

Deixar o app com um visual mais bonito/moderno, adotando a linguagem visual
"Liquid Glass" (vidro liquido) que a Apple introduziu em 2025 -- superficies
translucidas com blur, brilho especular e refracao do que esta atras.

## Abordagem recomendada: usar bibliotecas prontas, nao construir do zero

Recriar esse efeito a mao (shaders customizados) e caro e arriscado. Existem
bibliotecas open-source maduras (ou quase) pras duas plataformas do app -- o
caminho eficiente e avaliar/adotar uma delas.

### Android (Jetpack Compose)

- **[chrisbanes/haze](https://github.com/chrisbanes/haze)** -- biblioteca mais
  estabelecida da comunidade Compose pra efeitos visuais (blur, tint, etc.),
  mantida por Chris Banes. Na v2.0 ganhou um modulo `haze-liquidglass` com o
  efeito de vidro liquido "de verdade" (refracao, blur de profundidade, brilho
  especular, aberracao cromatica) via shader AGSL, com fallback em Canvas pra
  plataformas sem runtime shader.
  - **Ressalva:** esse modulo especifico ainda esta marcado como
    `@ExperimentalHazeApi` e **nao publicado no Maven Central** -- da pra usar
    via source, mas nao e "plugue e use" em producao ainda. Reavaliar quando
    estabilizar.
- **[Mortd3kay/liquid-glass-android](https://github.com/Mortd3kay/liquid-glass-android)**
  -- alternativa dedicada, mas **exige Android 13+ (API 33)**. Problema real
  pro projeto: `minSdk` e 26, e nem o celular de teste do Magno (Samsung J7
  Prime, Android 8.1/API 27) rodaria esse efeito -- precisaria de fallback
  visual pra aparelhos mais antigos de qualquer forma.

### Web (React + Tailwind -- ja e a stack do projeto)

- **[glincker/glinui](https://github.com/glincker/glinui)** -- o mais completo:
  50+ componentes prontos com estetica de vidro fosco, construido sobre Radix
  UI + Tailwind (Radix seria dependencia nova pro projeto).
- **[creativoma/liquid-glass](https://github.com/creativoma/liquid-glass)** --
  mais simples e leve, componente unico via
  `npm install @creativoma/liquid-glass`, bom pra testar rapido sem comprometer
  com uma lib inteira.
- **[samasante/liquid-glass](https://github.com/samasante/liquid-glass)** -- o
  mais "de verdade" tecnicamente (refrata o DOM real por tras, zero
  dependencias), mas mais experimental.

## Plano de rollout (quando for implementar)

1. Criar um pequeno conjunto de componentes reutilizaveis (ex.: "GlassCard"/
   "GlassSurface") em cada plataforma primeiro -- nao reskinnar tela por tela
   de uma vez.
2. Aplicar numa ou duas telas, validar visual e performance.
3. So depois espalhar pro resto do app.

## Risco principal a testar antes de comprometer

Blur em tempo real pesa bastante na GPU. O celular de teste do Magno (J7 Prime,
Android 8.1) e modesto e provavelmente representa bem boa parte do publico de
Lajedao/Brasil que o app quer atingir agora (ver `CLAUDE.md` > Estrategia >
Mercado) -- confirmar que roda liso nele antes de assumir que vai funcionar pra
todo mundo. No Android, como o modulo oficial "liquid glass" do Haze ainda nao
esta publicado, o caminho mais seguro pra comecar e usar blur simples (sem o
efeito liquido completo) e reavaliar depois.
