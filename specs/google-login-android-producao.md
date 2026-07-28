# Login com Google quebrado no app de produção (Android)

**Status:** resolvido em 2026-07-28.

## Problema

Login com Google funcionava no build debug (testado no celular, ver
`ambientes-supabase.md`) mas falhava no app instalado pela Play Store (teste
fechado) com o erro nativo "Não foi possível entrar com o Google"
(`GoogleAuthClient.kt:41`, `GetCredentialException`).

## Causa raiz (duas, acumuladas)

1. **Nome do pacote errado no OAuth Client Android** do Google Cloud: estava
   registrado como `com.lajesfit.android` — esse é só o *namespace* do código
   Kotlin (`android/app/build.gradle.kts`, campo `namespace`), não o pacote que a
   Play Store publica. O pacote real é `com.lajesfit.app` (`applicationId`),
   provavelmente sobrou de antes do commit `c86a10c` (10/07), que trocou o
   `applicationId` para assumir a ficha da TWA.
2. **SHA-1 da chave certa nunca tinha sido cadastrado.** O único fix de Google
   Sign-In registrado antes disso (`0ca73e4`, 15/07) cobriu só o SHA-1 da
   keystore de **debug**. A Play Store re-assina o app com a **chave de
   assinatura do Play App Signing**, diferente da upload key/keystore local — é
   o certificado que precisa estar cadastrado para o app publicado funcionar.

Esse mesmo tipo de bug (certificado do Play App Signing faltando) já tinha
acontecido uma vez neste projeto: commit `649e999`, nos asset links da TWA
(`public/.well-known/assetlinks.json`). Foi esse arquivo que confirmou qual
certificado é o correto — o SHA-256 de lá (`3D:D5:3D:D9:...`) bate exatamente
com o SHA-256 do "Certificado da chave de assinatura do app" no Play Console.

## Onde encontrar o certificado de produção (Play Console)

Não fica mais em "Integridade do app" (a página foi movida). Caminho atual:

**Protegido com o Google Play → Proteção da Google Play Store → "Proteger a
chave de assinatura do app" → Gerencie a Assinatura de Apps do Google Play**
(URL: `.../app/<id>/keymanagement`)

Lá aparecem os fingerprints (MD5/SHA-1/SHA-256) da **chave de assinatura do
app** (a que importa para produção) separados da **chave de upload** (a local,
`local.properties`/keystore).

## Fix aplicado (2026-07-28)

No Google Cloud Console (`console.cloud.google.com/apis/credentials`), OAuth
Client "LajesFit Android"
(`1065658146635-omq283o6b7v8ienl2s22su1fo168n5vo.apps.googleusercontent.com`):
- Nome do pacote: `com.lajesfit.android` → `com.lajesfit.app`
- SHA-1: atualizado para o da chave de assinatura do app —
  `BD:AD:64:D6:A3:0F:89:FC:F4:89:36:E1:FD:46:87:FD:74:3B:B3:47`

Estado final dos dois OAuth Clients Android (mesmo projeto Google Cloud,
`GOOGLE_WEB_CLIENT_ID` do app não muda):
- **LajesFit Android** → pacote `com.lajesfit.app`, SHA-1 da chave de
  assinatura do app. Cobre o app publicado (produção e teste fechado/interno,
  já que a Play Store sempre re-assina com essa chave).
- **Lajesfit Android Debug** → pacote `com.lajesfit.app.debug`, SHA-1 da
  keystore de debug. Cobre builds locais via Android Studio/`assembleDebug`.

## Keystore de debug compartilhada (2026-07-28)

O fix acima cobriu produção, mas sobrou um problema estrutural no **debug**: por
padrão o AGP gera uma `~/.android/debug.keystore` **por máquina**, com SHA-1
diferente em cada uma. Como o OAuth Client de debug cadastra um SHA-1 fixo, o
login com Google quebrava toda vez que o app fosse buildado numa máquina nova
(outro PC do Magno, CI, etc.) — e o fix seria cadastrar mais um SHA-1 a cada
ambiente.

Solução: uma keystore de debug **única**, a mesma em todas as máquinas e no CI.

- `android/app/build.gradle.kts` lê `LAJESFIT_DEBUG_KEYSTORE_PATH` de
  `local.properties` e, se existir, assina o buildType `debug` com ela
  (`signingConfigs.debugShared`; alias `androiddebugkey`, senha `android` — as
  mesmas do padrão Android). Sem a propriedade, cai no comportamento antigo
  (debug.keystore default do AGP), então quem não configurar nada continua
  buildando normalmente.
- **SHA-1 da keystore compartilhada:**
  `9A:98:3A:E8:24:B7:81:1A:0D:6D:52:50:C3:D2:93:4E:A2:72:15:14`
  (SHA-256 `2A:ED:BD:D0:...`, DN `CN=LajesFit Debug, OU=Dev, O=LajesFit,
  L=Lajedao, ST=BA, C=BR`).
- **O arquivo nunca entra no repo.** A senha de debug é pública, então o valor
  do segredo é o arquivo em si. Fica guardado como GitHub Actions Secret + uma
  cópia local em cada máquina de dev (aqui: `~/.android-lajesfit/`).
- O OAuth Client **"Lajesfit Android Debug"** (pacote `com.lajesfit.app.debug`)
  passa a cadastrar esse SHA-1 no lugar do SHA-1 da debug.keystore antiga da
  máquina do Magno.

Verificação: `apksigner verify --print-certs app-debug.apk` deve mostrar
`CN=LajesFit Debug` e o SHA-1 acima — não o da `~/.android/debug.keystore`.

## Lição para o futuro

Qualquer integração que valide o app pelo certificado de assinatura (Google
Sign-In, Digital Asset Links/TWA, Firebase, etc.) precisa do **certificado de
assinatura do app do Play Console** (`keymanagement`), não da upload key nem da
keystore de debug — são certificados diferentes assim que o app é publicado
via Play App Signing (obrigatório para `.aab`). Testar só com build
debug/sideload não pega esse tipo de bug; só aparece no app baixado de fato da
Play Store.
