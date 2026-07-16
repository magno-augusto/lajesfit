# lajesfit -- contexto do projeto

> Perfil pessoal e preferencias completas do Magno ficam no **CLAUDE.md global**
> (`~/.claude/CLAUDE.md`) da maquina dele. Este arquivo cobre o **negocio, a
> estrategia e as decisoes** do lajesfit e viaja junto no git (para continuar em
> qualquer computador).
## O que e o lajesfit

Rede social fitness de Lajedao-BA. Une o que o **Yazio** faz pela dieta + o que o
**Strava** faz pelo registro de treino + uma **rede social de apoio mutuo**, para
as pessoas se motivarem a ser mais saudaveis, esteticas e fortes.

Origem: nasceu para ajudar a comunidade da cidade do Magno (dai o nome, que ecoa o
grupo de corrida **Lajes Running**). O app e, na essencia, a **versao digital do
que ele ja fazia na vida real**: organizar e motivar uma comunidade a treinar
(forte founder-market fit).

## Objetivo

Ser a **nova fonte de renda** do Magno.

## Estrategia

- **Mercado:** comecar local (Lajedao) como beachhead e escalar depois. Local nao
  e teto, e ponto de partida.
- **Monetizacao -- B2B2C:** quem paga sao os **profissionais de fitness**
  (personais, nutricionistas, academias) que usam o app com os alunos. Faturam
  mesmo em cidade pequena e o modelo replica para outras cidades.
- **Fluxo de dinheiro (modelo simples):** o profissional paga assinatura ao
  lajesfit; o aluno paga o profissional pelo servico, fora do app (o lajesfit NAO
  intermedeia o dinheiro do aluno). Marketplace com comissao = depois. Cobrar o
  profissional pela web (nao por compra dentro do app) evita a taxa de 15-30% das
  lojas.
- **Nome:** trocavel no futuro (rebrand = custo de marketing, nao tecnico). O nome
  visivel muda numa atualizacao; o ID do pacote `com.lajesfit.app` e permanente,
  mas invisivel ao usuario.

## Produto e veiculo

- **Mobile-first** -- os usuarios (especialmente na cidade) estao no celular.
- **App nativo Android = produto principal.** Motivos funcionais: (1) install
  nativo tipo "clicar-instalar-usar" (WebAPK) e (2) **Health Connect** para
  importar atividades, que substitui o Strava.
- **PWA por link = ferramenta de demonstracao** instantanea, sem instalacao, para
  vender a um personal.

## Restricoes e decisoes tecnicas

- **Strava (risco):** a API limita as contas que podem vincular (bateu em ~10) e
  endureceu os termos para apps sociais que exibem dados de outros atletas.
  Depender do Strava e arriscado -> por isso a pivotada para Health Connect
  (API nativa do Android; nao existe para web/PWA -- este e o motivo FUNCIONAL do
  app nativo).
- **WebAPK:** PWA instalado no Android moderno vira app real (icone, tela cheia).
  Exige Chrome atual + Google Play Services. O aparelho de teste do Magno (Samsung
  J7 Prime antigo) cai para um "atalho" inferior e nao roda Health Connect -- nao
  usar como referencia de experiencia.
- **Stack:** web = React + TypeScript, Vite, TanStack Start, Supabase, Tailwind,
  deploy na Vercel (`lajesfit.vercel.app`). Android = Kotlin + Jetpack Compose,
  supabase-kt. Ja em teste interno na Play Store (`com.lajesfit.app`).

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

## >>> Onde paramos / proximo passo

Desenhar o recurso **"profissional/treinador"** -- o personal enxergar e
acompanhar os alunos dele. E a peca que transforma o lajesfit de "app de fitness"
em "ferramenta que um profissional paga para usar". Em seguida, planejar a
**abordagem do primeiro personal** de Lajedao (validacao da renda e o primeiro
treino de vendas do Magno na pratica).
