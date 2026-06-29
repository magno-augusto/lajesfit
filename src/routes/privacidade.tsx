import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de Privacidade - Lajes Fit" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fff8ec] px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6 text-neutral-800">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-[#e76f2e]">Política de Privacidade do Lajes Fit</h1>
          <p className="text-sm text-neutral-500">Última atualização: 28 de junho de 2026</p>
        </header>

        <p>
          O Lajes Fit é uma rede social de fitness, dieta e eventos de Lajedão-BA. Esta página explica
          quais dados o app coleta, para que eles servem e como você pode solicitar a remoção da sua conta.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Conta:</strong> nome de usuário, e-mail (quando você entra com Google) e senha
              criptografada, usados para autenticação.
            </li>
            <li>
              <strong>Perfil:</strong> foto de perfil e informações que você preencher (nome, dados
              físicos usados para calcular metas de dieta e treino).
            </li>
            <li>
              <strong>Conteúdo do app:</strong> refeições e dietas registradas, treinos, posts, comentários
              e fotos que você publica na rede social do app.
            </li>
            <li>
              <strong>Strava (opcional):</strong> se você conectar sua conta Strava, importamos suas
              atividades (tipo, duração, distância) com permissão de leitura apenas. Você pode desconectar
              a qualquer momento nas configurações do app.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Como usamos seus dados</h2>
          <p>
            Usamos esses dados exclusivamente para fazer o app funcionar: autenticar você, calcular suas
            metas de dieta e treino, exibir seu perfil e conteúdo para outros usuários da rede e sincronizar
            atividades do Strava quando conectado. Não vendemos nem compartilhamos seus dados com terceiros
            para fins de publicidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Onde seus dados ficam armazenados</h2>
          <p>
            Os dados são armazenados de forma segura na infraestrutura do Supabase (banco de dados,
            autenticação e arquivos). O login com Google usa a autenticação oficial do Google; o Lajes Fit
            não recebe sua senha do Google.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Seus direitos</h2>
          <p>
            Você pode pedir a exclusão da sua conta e de todos os seus dados a qualquer momento entrando em
            contato pelo e-mail abaixo. Atendemos o pedido em até 15 dias.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Crianças</h2>
          <p>O Lajes Fit não é direcionado a menores de 13 anos e não coleta dados intencionalmente desse público.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Contato</h2>
          <p>
            Dúvidas ou solicitações sobre seus dados:{" "}
            <a className="text-[#e76f2e] underline" href="mailto:magnoaugustoss@gmail.com">
              magnoaugustoss@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
