// One-off script to generate the TWA Android project + signing key without
// the interactive Bubblewrap wizard (Inquirer prompts don't work well in this shell).
// Safe to delete after the project has been generated successfully.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { TwaManifest, TwaGenerator, ConsoleLog } = require("@bubblewrap/core");

const execFileAsync = promisify(execFile);

const MANIFEST_URL = "https://lajesfit.vercel.app/manifest.webmanifest";
const TARGET_DIR = __dirname;
const PACKAGE_ID = "com.lajesfit.app";
const LAUNCHER_NAME = "Lajes Fit";
const KEY_ALIAS = "lajesfit";
const KEYTOOL_BIN = "C:/Program Files/Android/Android Studio/jbr/bin/keytool.exe";

function randomPassword() {
  return crypto.randomBytes(18).toString("base64").replace(/[/+=]/g, "");
}

async function main() {
  console.log(`Fetching web manifest from ${MANIFEST_URL} ...`);
  const twaManifest = await TwaManifest.fromWebManifest(MANIFEST_URL);

  twaManifest.packageId = PACKAGE_ID;
  twaManifest.launcherName = LAUNCHER_NAME;
  twaManifest.appVersionCode = 1;
  twaManifest.appVersionName = "1";
  twaManifest.signingKey.path = path.join(TARGET_DIR, "android.keystore");
  twaManifest.signingKey.alias = KEY_ALIAS;

  const manifestFile = path.join(TARGET_DIR, "twa-manifest.json");
  await twaManifest.saveToFile(manifestFile);
  console.log("Saved twa-manifest.json");

  const twaGenerator = new TwaGenerator();
  const log = new ConsoleLog("twa-setup");
  await twaGenerator.createTwaProject(TARGET_DIR, twaManifest, log);
  console.log("Generated Android project files");

  const manifestContents = fs.readFileSync(manifestFile);
  const sum = crypto.createHash("sha1").update(manifestContents).digest("hex");
  fs.writeFileSync(path.join(TARGET_DIR, "manifest-checksum.txt"), sum);

  const storePassword = randomPassword();
  const keyPassword = randomPassword();

  console.log("Generating signing key (android.keystore)...");
  const dname = "cn=Magno Augusto, ou=Personal, o=LajesFit, c=BR";
  await execFileAsync(KEYTOOL_BIN, [
    "-genkeypair",
    "-dname", dname,
    "-alias", KEY_ALIAS,
    "-keypass", keyPassword,
    "-keystore", twaManifest.signingKey.path,
    "-storepass", storePassword,
    "-validity", "20000",
    "-keyalg", "RSA",
  ]);

  const credsFile = path.join(TARGET_DIR, "keystore-credentials.txt");
  fs.writeFileSync(
    credsFile,
    [
      "ATENCAO: guarde isto em um gerenciador de senhas e NAO o compartilhe nem versione no git.",
      "Sem estas credenciais nao sera possivel gerar atualizacoes assinadas com a mesma chave.",
      "",
      `Keystore file: android.keystore`,
      `Key alias: ${KEY_ALIAS}`,
      `Store password: ${storePassword}`,
      `Key password: ${keyPassword}`,
      "",
    ].join("\n"),
  );

  console.log("\nDone.");
  console.log("Package ID:", PACKAGE_ID);
  console.log("Credentials written to:", credsFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
