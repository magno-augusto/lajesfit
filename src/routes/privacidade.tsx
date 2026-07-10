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
          <h1 className="text-2xl font-semibold text-[#e76f2e]">
            Política de Privacidade do Lajes Fit
          </h1>
          <p className="text-sm text-neutral-500">Última atualização: 10 de julho de 2026</p>
        </header>

        <p>
          O Lajes Fit é uma rede social de fitness, dieta e desafios de Lajedão-BA. Esta página
          explica quais dados coletamos no app Android nativo e na versão web/PWA, para que eles
          servem e como você pode pedir a remoção da sua conta.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Conta:</strong> nome de usuário, e-mail, senha protegida pelo provedor de
              autenticação, login com Google quando usado, e dados necessários para recuperação de
              acesso.
            </li>
            <li>
              <strong>Perfil e rede social:</strong> nome exibido, foto de perfil, bio, preferências
              de privacidade, relações de seguir, curtidas, comentários e publicações que você cria.
            </li>
            <li>
              <strong>Dieta:</strong> refeições, alimentos, quantidades, calorias, macronutrientes,
              horários e fotos de refeições que você decidir anexar.
            </li>
            <li>
              <strong>Treinos:</strong> modalidade, título, data/hora, duração, distância, calorias
              e fotos de treinos registrados manualmente.
            </li>
            <li>
              <strong>Health Connect no Android (opcional):</strong> se você conceder permissão, o
              app lê apenas sessões de exercício, distância e calorias totais queimadas para
              importar treinos do mês atual. O app não lê rotas/localização, frequência cardíaca,
              sono, prontuários ou outros dados médicos.
            </li>
            <li>
              <strong>Strava na versão web/PWA (opcional):</strong> se você conectar sua conta
              Strava na versão web, importamos atividades autorizadas, como tipo, duração,
              distância, calorias e horário. Você pode desconectar essa integração.
            </li>
            <li>
              <strong>Câmera, fotos e código de barras:</strong> a câmera é usada para escanear
              código de barras de alimentos; fotos escolhidas por você podem ser enviadas como
              avatar, refeição ou treino. Ao buscar um produto por código de barras, o código pode
              ser consultado na base pública Open Food Facts.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Como usamos seus dados</h2>
          <p>
            Usamos esses dados para autenticar sua conta, exibir seu perfil, registrar refeições e
            treinos, calcular resumos de dieta e atividade, montar rankings de desafios, mostrar
            posts e comentários na rede social, enviar notificações quando habilitadas e manter a
            segurança do serviço. Não vendemos dados pessoais, não usamos dados do Health Connect
            para anúncios e não usamos esses dados para crédito, seguro ou decisões médicas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Compartilhamento e provedores</h2>
          <p>
            Os dados ficam armazenados na infraestrutura do Supabase, que fornece banco de dados,
            autenticação e armazenamento de arquivos para o Lajes Fit. O login com Google usa a
            autenticação oficial do Google; o Lajes Fit não recebe sua senha do Google. Integrações
            opcionais, como Health Connect, Strava e Open Food Facts, são usadas somente para a
            função que você iniciou ou autorizou. Podemos divulgar dados se exigido por lei ou para
            proteger a segurança do serviço.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Visibilidade do conteúdo</h2>
          <p>
            Posts, comentários, foto de perfil, treinos publicados e refeições compartilhadas podem
            ser vistos por outros usuários conforme as configurações de privacidade do seu perfil e
            as regras de cada tela. Fotos privadas escolhidas para avatar, refeições ou treinos
            podem gerar URLs assinadas usadas pelo app para exibição.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Controles do usuário</h2>
          <p>
            Você pode editar ou remover conteúdos próprios nas telas do app quando essa ação estiver
            disponível, desativar preferências de notificação, tornar o perfil privado, revogar
            acesso do Health Connect nas configurações do Android e desconectar o Strava na versão
            web. Para excluir sua conta e dados associados, entre em contato pelo e-mail abaixo.
            Atendemos o pedido em até 15 dias.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium text-neutral-900">Crianças</h2>
          <p>
            O Lajes Fit não é direcionado a menores de 13 anos e não coleta dados intencionalmente
            desse público.
          </p>
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
