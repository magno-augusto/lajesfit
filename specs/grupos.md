# Grupos

**Status:** planejado (nao iniciado). Primeiro item de uma lista de melhorias
futuras que o Magno esta ditando ao longo de varias mensagens -- mais itens
podem ser adicionados a este arquivo ou a novos specs depois.

## Motivacao

A partir de 2026-07-27 o lajesfit deixa de mirar so Lajedao-BA e passa a
divulgar para o Brasil inteiro, buscando monetizacao em escala (ver `CLAUDE.md`
> Estrategia > Mercado). Para crescer nacionalmente sem perder a identidade de
comunidade local que deu certo em Lajedao, cidades/comunidades viram **grupos**
dentro do mesmo app -- Lajedao vira o primeiro grupo, chamado "Lajesfit" (nome
que, apos o rebrand do app -- ver `CLAUDE.md` > Estrategia > Nome --, passa a
identificar so esse grupo, nao o produto inteiro).

## Requisitos capturados (ditados pelo Magno em 2026-07-27)

- Criar a funcionalidade de **grupos**.
- **Todos os usuarios ja cadastrados** (hoje, da cidade de Lajedao) devem ser
  migrados para o primeiro grupo.
- **Desafios (`desafios`) tambem devem ser movidos para dentro do grupo** -- ou
  seja, passam a ser escopados por grupo, nao globais.
- O primeiro grupo se chama **"Lajesfit"**.
- Criado pelo **usuario admin** (o proprio Magno).
- **Por enquanto, so o admin pode criar grupos** -- usuarios comuns nao tem essa
  permissao ainda (decisao explicita, pode mudar no futuro).

## Perguntas em aberto (resolver quando for desenhar de verdade)

- Um usuario pertence a **um grupo so** ou pode participar de varios? O jeito
  como foi descrito ("mover os usuarios de Lajedao para um grupo") sugere um
  grupo por usuario para comecar, mas vale confirmar antes de desenhar o schema.
- O que mais, alem de desafios, fica escopado por grupo -- feed? posts? ranking?
  Nao foi mencionado explicitamente; confirmar com o Magno feature por feature.
- Como fica a descoberta de grupos para usuario novo (Brasil inteiro): escolhe um
  grupo no cadastro? Existe um estado "sem grupo"? Existe grupo publico/global
  padrao para quem nao e de nenhuma cidade especifica?
- Fluxo de usuarios comuns virarem capazes de criar/administrar grupo no futuro
  -- fora de escopo agora, so registrar que vai acontecer.
