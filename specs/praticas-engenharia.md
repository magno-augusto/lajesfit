# Práticas de engenharia a incorporar

**Status:** planejado (backlog de infra/qualidade).

## Agora (prioridade)
1. ✅ Separar o ambiente de teste do de produção no Supabase — hoje se testa em
   produção, arriscando dados reais (mais urgente). **Concluído** (Android, dev
   local web e Vercel Preview, todos apontando pro staging) — ver
   `ambientes-supabase.md` (abordagem: 2º projeto na nuvem/staging).
2. Rastreamento de erros (ex.: Sentry).
3. Mentalidade lean — validar um recurso com um usuário real antes de construí-lo
   inteiro.

## Depois
- Testes dos fluxos críticos (login/privacidade).
- Deploy automatizado (CI/CD).
- Backups do banco.
