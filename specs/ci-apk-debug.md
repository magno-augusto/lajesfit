# CI: APK de debug baixável pelo GitHub

**Status:** workflow no ar, **falta criar os secrets** (só isso destrava).

Objetivo: dar `git push` de qualquer máquina e baixar o APK atualizado no
celular, sem precisar de cabo, Android Studio ou do PC que buildou.

## Como funciona

`.github/workflows/android-debug-apk.yml` roda a cada push que toca `android/`
(ou pelo botão **Run workflow** na aba Actions), builda o `assembleDebug` e
anexa o APK a um Release de **tag fixa** — por isso o link nunca muda:

```
https://github.com/magno-augusto/lajesfit/releases/download/debug-latest/lajesfit-debug.apk
```

Abrir esse link no navegador do celular baixa sempre a versão mais recente.

Duas travas propositais, porque um APK silenciosamente errado é pior que um
build quebrado:

- **Falha se faltarem os secrets de staging** — sem eles o build cairia para
  **produção** com apenas um aviso (`android/app/build.gradle.kts`, bloco
  `debug`), e um APK de teste jamais deve escrever no banco real.
- **Confere o SHA-1 do APK gerado** e falha se sair outra chave — senão o build
  passaria e só o login com Google quebraria, muito mais difícil de rastrear.

O APK é assinado com a **keystore de debug compartilhada**, então tem o mesmo
SHA-1 do build local: o login com Google funciona nele e ele instala por cima
do build local sem conflito de assinatura. Ver
`google-login-android-producao.md`.

---

## ⚠️ Antes de tudo: a keystore precisa viajar

A keystore de debug compartilhada **não está no Git** (de propósito) e **não
tem como ser recriada** — é uma chave única. Se ela se perder, o SHA-1 muda e o
login com Google para de funcionar em todo build de debug até recadastrar o
novo SHA-1 no Google Cloud.

Na máquina do trabalho ela está em:

```
C:\Users\Terminal\.android-lajesfit\
├── lajesfit-shared-debug.keystore      <- o arquivo que assina o APK
└── lajesfit-debug-keystore.base64.txt  <- o mesmo em base64, pro secret do GitHub
```

**Copie a pasta inteira** para pendrive/Google Drive antes de precisar dela.
Não conte com o OneDrive se ele ainda não estiver logado na máquina de casa.

Se chegar em casa sem a keystore, dá para seguir mesmo assim — só não mexa no
Google Cloud por conta própria: peça ajuda para gerar uma nova e recadastrar o
SHA-1 nos dois lugares, senão o login quebra.

O base64 se regenera a partir da keystore a qualquer momento:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\.android-lajesfit\lajesfit-shared-debug.keystore")) `
  | Out-File "$HOME\.android-lajesfit\lajesfit-debug-keystore.base64.txt" -Encoding ascii -NoNewline
```

---

## Passo a passo para concluir

### 1. Criar os 4 secrets no GitHub

Repositório → **Settings → Secrets and variables → Actions → New repository
secret**. Dá para fazer pelo navegador, de qualquer máquina — não precisa da
keystore local, só do texto base64.

| Secret | Onde pegar o valor |
|---|---|
| `DEBUG_KEYSTORE_BASE64` | conteúdo de `lajesfit-debug-keystore.base64.txt` (colar **tudo**, uma linha só) |
| `SUPABASE_URL_STAGING` | `https://fdkzivghgeanujwavsbn.supabase.co` (ver `ambientes-supabase.md`) |
| `SUPABASE_ANON_KEY_STAGING` | Supabase → projeto de staging → Project Settings → API → anon/publishable key |
| `GOOGLE_WEB_CLIENT_ID` | Google Cloud → Credenciais → OAuth Client do tipo **Web** (o mesmo de produção) |

Os valores também estão no `android/local.properties` da máquina do trabalho —
esse arquivo é gitignored e nunca vem pelo `git pull`.

> Já existe um secret criado em 28/07 cujo nome não confirmei. Se ele tiver
> outro nome, **renomeie para `DEBUG_KEYSTORE_BASE64`** ou ajuste o `env:` do
> workflow — o nome tem que bater exatamente.

Keystore é binário: se o valor não for base64, o build falha no decode.

### 2. Decidir a visibilidade do APK

**Se o repositório for público, o Release deixa o APK baixável por qualquer
um.** O que fica exposto é a anon key do staging — publicável por design
(`sb_publishable_...`) e protegida por RLS —, mas quem baixar consegue apontar
o app para o banco de staging.

- Tudo bem? Não mexer, está pronto.
- Não? Trocar o passo `Publica no Release` por upload de Artifact (só
  colaboradores baixam, mas vem em `.zip`), ou criar o Release com `--draft`.

### 3. Configurar o build local na máquina de casa

Só se for buildar pelo Android Studio lá. Em `android/local.properties`
(gitignored, precisa ser criado do zero num clone novo):

```properties
sdk.dir=<caminho do Android SDK na máquina de casa>
SUPABASE_URL_STAGING=...
SUPABASE_ANON_KEY_STAGING=...
GOOGLE_WEB_CLIENT_ID=...
LAJESFIT_DEBUG_KEYSTORE_PATH=C:/Users/<user>/.android-lajesfit/lajesfit-shared-debug.keystore
```

Barras normais (`/`) mesmo no Windows. **Não precisa mexer no Google Cloud** —
o SHA-1 da keystore compartilhada já está cadastrado e não muda mais.

Sem `LAJESFIT_DEBUG_KEYSTORE_PATH` o build funciona, mas usa a debug.keystore
que o AGP gera por máquina — e aí o login com Google falha com erro 28444.

### 4. Rodar e conferir

O push de 28/07 já disparou o workflow, e ele **deve ter falhado** por falta
dos secrets — é o comportamento esperado, não um bug. Depois de criar os
secrets: aba **Actions → APK de debug → Run workflow**, ou qualquer push que
toque `android/`.

Verde? Abrir o link do Release no celular e instalar (o Android vai pedir
permissão para instalar de fonte desconhecida). Depois entrar com Google: se
funcionar, a cadeia toda está fechada.

---

## Se der errado

| Sintoma | Causa provável |
|---|---|
| Falha em "Restaura a keystore" | secret ausente, com outro nome, ou não é base64 |
| Falha em "Gera o local.properties" | faltam os secrets `_STAGING` |
| Falha em "Confere a assinatura" | o base64 no secret é de outra keystore |
| Build verde, mas login falha no APK | erro 28444 — diagnóstico em `google-login-android-producao.md` |
| Push não disparou nada | commit não tocou `android/`; use **Run workflow** |
