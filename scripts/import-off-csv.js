#!/usr/bin/env node
/**
 * Importa o dataset completo do Open Food Facts filtrado para produtos do Brasil.
 *
 * Uso:
 *   node scripts/import-off-csv.js                        # baixa automaticamente (~3GB)
 *   node scripts/import-off-csv.js produtos.csv.gz        # usa arquivo local já baixado
 *
 * Pré-requisito: SUPABASE_SERVICE_ROLE_KEY no .env
 * Download manual: https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
 */

import { createGunzip } from "zlib";
import { createInterface } from "readline";
import { createReadStream, existsSync, readFileSync } from "fs";
import https from "https";
import { createClient } from "@supabase/supabase-js";

// ─── Configuração ─────────────────────────────────────────────────────────────

const OFF_CSV_URL =
  "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz";
const BATCH_SIZE = 500;

// ─── Utilitários ──────────────────────────────────────────────────────────────

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

function num(val) {
  const n = parseFloat(String(val ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function col(fields, headers, ...names) {
  for (const name of names) {
    const idx = headers.indexOf(name);
    if (idx !== -1 && fields[idx]?.trim()) return fields[idx].trim();
  }
  return "";
}

function isBrazil(countriesField) {
  if (!countriesField) return false;
  const lower = countriesField.toLowerCase();
  return lower.includes("brazil") || lower.includes("brasil");
}

// ─── Download com suporte a redirect ──────────────────────────────────────────

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error("Muitos redirecionamentos"));

    https
      .get(url, { headers: { "User-Agent": "LajesFit/1.0 (magnoaugustoss@gmail.com)" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          return resolve(download(res.headers.location, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const mb = Math.round(parseInt(res.headers["content-length"] ?? "0") / 1024 / 1024);
        console.log(`📥 Baixando dataset OFF (${mb > 0 ? mb + "MB" : "tamanho desconhecido"})...`);
        console.log("   Isso pode levar alguns minutos dependendo da conexão.\n");
        resolve(res);
      })
      .on("error", reject);
  });
}

// ─── Inserção em batch ────────────────────────────────────────────────────────

async function insertBatch(supabase, rows) {
  const { error } = await supabase
    .from("foods")
    .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: false });
  if (error) throw new Error(error.message);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY =
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("❌ Variáveis necessárias no .env:");
    console.error("   SUPABASE_URL=https://xxxx.supabase.co");
    console.error("   SUPABASE_SERVICE_ROLE_KEY=eyJ...");
    console.error("\nEncontre a chave em: Supabase Dashboard → Settings → API → service_role");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ── Fonte de dados ───────────────────────────────────────────────────────────
  const localFile = process.argv[2];
  let rawStream;

  if (localFile) {
    if (!existsSync(localFile)) {
      console.error(`❌ Arquivo não encontrado: ${localFile}`);
      process.exit(1);
    }
    console.log(`📂 Usando arquivo local: ${localFile}\n`);
    rawStream = createReadStream(localFile);
  } else {
    rawStream = await download(OFF_CSV_URL);
  }

  const isGzipped = !localFile || localFile.endsWith(".gz") || localFile.endsWith(".gz.partial");
  const dataStream = isGzipped ? rawStream.pipe(createGunzip()) : rawStream;

  // ── Parsing TSV linha a linha ────────────────────────────────────────────────
  const rl = createInterface({ input: dataStream, crlfDelay: Infinity });

  let headers = null;
  let batch = [];
  let linesRead = 0;
  let imported = 0;
  let skipped = 0;
  const startedAt = Date.now();

  for await (const line of rl) {
    if (!headers) {
      headers = line.split("\t");
      console.log(`📋 Colunas detectadas: ${headers.length}`);
      console.log("🔍 Filtrando produtos do Brasil...\n");
      continue;
    }

    linesRead++;
    const fields = line.split("\t");

    const countries = col(fields, headers, "countries_en", "countries");
    if (!isBrazil(countries)) continue;

    const code = col(fields, headers, "code");
    const name =
      col(fields, headers, "product_name_pt", "product_name_pt_BR", "product_name") ||
      col(fields, headers, "generic_name_pt", "generic_name");

    if (!code || !name) { skipped++; continue; }

    const kcal =
      num(col(fields, headers, "energy-kcal_100g", "energy_kcal_100g")) ||
      num(col(fields, headers, "energy_100g")) / 4.184; // kJ → kcal

    if (kcal <= 0) { skipped++; continue; }

    const categoryRaw = col(fields, headers, "categories_en", "categories");
    const category = categoryRaw ? (categoryRaw.split(",")[0]?.trim() || null) : null;
    const brand = col(fields, headers, "brands") || null;

    batch.push({
      source: "open_food_facts",
      source_id: code,
      name,
      brand,
      category,
      kcal,
      protein_g: num(col(fields, headers, "proteins_100g")),
      carbs_g: num(col(fields, headers, "carbohydrates_100g")),
      fat_g: num(col(fields, headers, "fat_100g")),
      fiber_g: num(col(fields, headers, "fiber_100g")),
    });

    if (batch.length >= BATCH_SIZE) {
      try {
        await insertBatch(supabase, batch);
        imported += batch.length;
      } catch (err) {
        skipped += batch.length;
        process.stderr.write(`\n⚠️  Batch com erro: ${err.message}\n`);
      }
      batch = [];

      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      process.stdout.write(
        `\r✓ ${imported.toLocaleString()} importados | ${skipped.toLocaleString()} ignorados | ${elapsed}s`,
      );
    }
  }

  // Batch final
  if (batch.length > 0) {
    try {
      await insertBatch(supabase, batch);
      imported += batch.length;
    } catch (err) {
      skipped += batch.length;
      process.stderr.write(`\n⚠️  Batch final com erro: ${err.message}\n`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000 / 60).toFixed(1);
  console.log(`\n\n✅ Concluído em ${elapsed} minutos!`);
  console.log(`   ${imported.toLocaleString()} produtos importados`);
  console.log(`   ${skipped.toLocaleString()} ignorados (sem nome ou calorias)`);
  console.log(`   ${linesRead.toLocaleString()} linhas lidas no total`);
}

main().catch((err) => {
  console.error("\n❌ Erro fatal:", err.message);
  process.exit(1);
});
