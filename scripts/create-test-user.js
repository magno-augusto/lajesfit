#!/usr/bin/env node
// Cria um usuario de teste ja confirmado para login local.
// Pre-requisito: SUPABASE_SERVICE_ROLE_KEY no .env
// Uso: node scripts/create-test-user.js

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
      if (match) env[match[1].trim()] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

// Credenciais do usuario de teste
const TEST_USERNAME = "teste";
const TEST_EMAIL = "teste@lajesfit.app";
const TEST_PASSWORD = "teste123";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: TEST_USERNAME,
      display_name: "Usuario Teste",
    },
  });

  if (error) {
    if (/already.*registered|already.*exists/i.test(error.message)) {
      console.log("Usuario de teste ja existe. Use as credenciais abaixo.");
    } else {
      console.error("Erro ao criar usuario:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Usuario de teste criado com sucesso!");
    console.log("   id:", data.user?.id);
  }

  console.log("\nCredenciais de login:");
  console.log(`   Usuario ou e-mail: ${TEST_USERNAME}  (ou ${TEST_EMAIL})`);
  console.log(`   Senha:             ${TEST_PASSWORD}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err.message);
  process.exit(1);
});
