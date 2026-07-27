# Cache local (evitar loading a cada abertura do app)

**Status:** planejado (nao iniciado).

## Problema

Feed, Dieta e Treinos mostram loading e buscam tudo da rede toda vez que o
usuario abre a tela/app, mesmo quando ele acabou de ver o mesmo conteudo minutos
antes.

## Abordagem: stale-while-revalidate, mecanismo compartilhado

Mostrar o que ja esta no cache local imediatamente, e atualizar em segundo plano
com um indicador sutil no topo (nao spinner central bloqueando o conteudo).
Loading em tela cheia **so na primeira vez**, quando ainda nao ha cache nenhum.

O **mecanismo** (como ler/escrever o cache, como decidir revalidar, o indicador
de topo) e compartilhado entre as tres telas -- mesmo padrao, mesma
infraestrutura no Android (uma unica base local, ex.: Room). Os **dados**
cacheados sao proprios de cada tela -- nao da pra misturar posts do feed com
itens de dieta num cache so. Ou seja: **um mecanismo, uma entrada/tabela de
cache por tela**, nao tres implementacoes separadas do zero.

## Escopo por tela

- **Feed:** cacheia a ultima versao vista do feed (sem recorte por data).
- **Dieta:** cacheia so os registros do **dia atual** (refeicoes + itens). Por
  enquanto, so hoje -- navegar para outro dia (setas de navegacao de data) ainda
  busca da rede normalmente.
- **Treinos:** mesma logica da Dieta -- cacheia so os treinos do **dia atual**.

## Por que o volume de dados nao e um problema

E cache de texto estruturado (JSON simples: nome do alimento/treino, gramas,
kcal, macros, duracao, etc. por item) -- mesmo guardando bastante tempo, fica na
casa de poucos MB. Nao e como cache de fotos/video, que e o que costuma pesar em
armazenamento de app.

## Plataformas

- **Web:** quase de graca via TanStack Query, que o projeto ja usa -- ajustar
  `staleTime`/`placeholderData` e trocar `isLoading` por `isFetching` pro
  indicador de topo.
- **Android:** precisa persistir localmente (Room ou similar) -- hoje nenhuma das
  tres telas guarda nada em disco, so busca da rede a cada abertura de tela.

## Fora de escopo por enquanto

- Cachear dias anteriores/futuros em Dieta e Treinos (so o dia atual por ora,
  decisao explicita do Magno).
- Estender essa abordagem para outras telas alem de Feed/Dieta/Treinos.
