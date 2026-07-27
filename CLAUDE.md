# lajesfit -- contexto do projeto

> Perfil pessoal e preferencias completas do Magno ficam no **CLAUDE.md global**
> (`~/.claude/CLAUDE.md`) da maquina dele. Este arquivo cobre o **negocio, a
> estrategia e as decisoes** do lajesfit e viaja junto no git (para continuar em
> qualquer computador).
## O que e o lajesfit

Rede social fitness de Lajedao-BA. Une o que o **Yazio** faz pela dieta + o que o
**Strava** faz pelo registro de treino + uma **rede social de apoio mutuo**: o
usuario registra a propria dieta e os proprios treinos, e conta com a comunidade
para apoiar e ser apoiado rumo a um objetivo concreto -- **ser mais saudavel**, o
que aqui significa **baixar percentual de gordura e desenvolver musculatura**.
Esse objetivo (composicao corporal, nao so "numero na balanca") deve orientar que
metricas e recursos fazem sentido no produto.

Origem: nasceu para ajudar a comunidade da cidade do Magno (dai o nome, que ecoa o
grupo de corrida **Lajes Running**). O app e, na essencia, a **versao digital do
que ele ja fazia na vida real**: organizar e motivar uma comunidade a treinar
(forte founder-market fit).

## Objetivo

Ser a **nova fonte de renda** do Magno.

## Estrategia

- **Mercado:** a partir de 2026-07-27, o foco de aquisicao deixa de ser so
  Lajedao -- divulgacao passa a mirar o Brasil inteiro, com foco em monetizacao
  em escala. Lajedao vira o primeiro **grupo** dentro do app (cidades/comunidades
  passam a ser "grupos", nao mais sinonimo do produto inteiro -- ver
  `specs/grupos.md`).
- **Monetizacao -- B2B2C:** quem paga sao os **profissionais de fitness**
  (personais, nutricionistas, academias) que usam o app com os alunos. Faturam
  mesmo em cidade pequena e o modelo replica para outras cidades.
- **Fluxo de dinheiro (modelo simples):** o profissional paga assinatura ao
  lajesfit; o aluno paga o profissional pelo servico, fora do app (o lajesfit NAO
  intermedeia o dinheiro do aluno). Marketplace com comissao = depois. Cobrar o
  profissional pela web (nao por compra dentro do app) evita a taxa de 15-30% das
  lojas.
- **Nome:** trocavel no futuro (rebrand = custo de marketing, nao tecnico) --
  quando acontecer, "Lajesfit" deixa de ser o nome do app e passa a ser so o nome
  do grupo de Lajedao (ver `specs/grupos.md`). O nome visivel muda numa
  atualizacao; o ID do pacote `com.lajesfit.app` e permanente, mas invisivel ao
  usuario.

## Produto e veiculo

- **Mobile-first** -- os usuarios (especialmente na cidade) estao no celular.
- **App nativo Android = produto principal**, PWA por link = ferramenta de
  demonstracao instantanea (vender a um personal sem exigir instalacao). Por que
  nativo em vez de so PWA, stack completa e decisoes tecnicas: ver
  `specs/stack-e-arquitetura.md`.

## Praticas de engenharia a incorporar

- **Agora (validacao), prioridade:** (1) separar o ambiente de teste do de
  producao no Supabase -- hoje testa em producao, arriscando dados reais (mais
  urgente); (2) rastreamento de erros (ex.: Sentry); (3) mentalidade lean --
  validar o recurso "profissional" com um personal real antes de construi-lo
  inteiro.
- **Depois (com pagantes):** testes dos fluxos criticos (login/pagamento/
  privacidade), deploy automatizado (CI/CD) e backups do banco.

## Contabil (Brasil)

- Modelo simples: o profissional paga voce; voce nao toca no dinheiro do aluno.
- Formalizar SO quando for cobrar: provavel **ME no Simples Nacional** (software
  geralmente nao cabe no MEI -- confirmar com contador) + gateway de cobranca
  recorrente (Asaas / Pagar.me / Mercado Pago / Stripe) + **contador**. Validar
  de graca antes.

## Preferencias de trabalho (resumo -- completo no global)

- Respostas equilibradas (concisas por padrao, detalhar quando o assunto pede).
- Planejar primeiro antes de tarefas maiores; explicar o "porque" so quando nao
  for obvio; mostrar so o trecho de codigo alterado.
- Magno **dirige o desenvolvimento apoiado em IA** e raramente escreve codigo a
  mao -- assumir que a IA implementa e ele revisa/aprova.
- **Glosar jargao tecnico** ao surgir; quando um tema for essencial ao objetivo de
  renda, **ensinar a forma correta** (nao so apontar a lacuna).
- **Claude Code faz todo o ciclo** (planejar, implementar, revisar, commitar) --
  a assinatura do Codex terminou em 2026-07-15.
- Ser explicito sobre custo em dinheiro e em tokens.

## Especificacoes de funcionalidades

Detalhes de implementacao (arquitetura, decisoes tecnicas, planos e status de
cada funcionalidade) ficam em `specs/`, um arquivo por assunto -- este arquivo
(CLAUDE.md) so guarda objetivo, foco e direcao do negocio.

- `specs/stack-e-arquitetura.md` -- stack, decisao Strava -> Health Connect,
  WebAPK, deploy.
- `specs/registrar-refeicao-por-voz.md` -- feito (falar o que comeu -> IA registra
  a refeicao).
- `specs/editar-excluir-refeicao.md` -- em andamento.
- `specs/grupos.md` -- planejado (comunidades/cidades como grupos dentro do app).
- `specs/cache-local.md` -- planejado (Feed/Dieta/Treinos nao recarregam do zero
  a cada abertura do app).
- `specs/design-liquid-glass.md` -- planejado (visual "vidro liquido" no
  app, web + Android).

## >>> Onde paramos / proximo passo

Terminando `specs/editar-excluir-refeicao.md` (outra sessao/agente). Depois disso,
retomar o proximo passo estrategico ainda nao iniciado: desenhar o recurso
**"profissional/treinador"** -- o personal enxergar e acompanhar os alunos dele. E
a peca que transforma o lajesfit de "app de fitness" em "ferramenta que um
profissional paga para usar" (ver Estrategia acima). Em seguida, planejar a
**abordagem do primeiro personal** de Lajedao (validacao da renda e o primeiro
treino de vendas do Magno na pratica). Quando esse recurso for desenhado, criar
`specs/profissional-treinador.md`.
