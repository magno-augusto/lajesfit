#!/usr/bin/env node
// Importa produtos brasileiros do Open Food Facts para o Supabase.
// Pré-requisito: SUPABASE_SERVICE_ROLE_KEY no .env
// Uso: node scripts/import-off-brazil.js

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// Lê variáveis do .env
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
  console.error("❌ Variáveis necessárias no .env:");
  console.error("   SUPABASE_URL=https://xxxx.supabase.co");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=eyJ...");
  console.error("\nEncontre a chave em: Supabase Dashboard → Settings → API → service_role");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const OFF_FIELDS = "code,product_name,brands,categories,serving_size,nutriments";
const PAGE_SIZE = 500;
const BATCH_SIZE = 100;

function parseNumber(value) {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseProduct(product) {
  const nutriments = product.nutriments ?? {};
  const calories =
    parseNumber(nutriments["energy-kcal_100g"]) ||
    parseNumber(nutriments["energy-kcal_value"]);
  const name = String(product.product_name ?? "").trim();
  const code = String(product.code ?? "").trim();

  if (!name || !code || calories <= 0) return null;

  const categoryRaw = typeof product.categories === "string" ? product.categories.trim() : "";
  const category = categoryRaw ? (categoryRaw.split(",")[0]?.trim() || null) : null;
  const brand = typeof product.brands === "string" && product.brands.trim()
    ? product.brands.trim()
    : null;

  return {
    source: "open_food_facts",
    source_id: code,
    name,
    category,
    brand,
    kcal: calories,
    protein_g: parseNumber(nutriments.proteins_100g),
    carbs_g: parseNumber(nutriments.carbohydrates_100g),
    fat_g: parseNumber(nutriments.fat_100g),
    fiber_g: parseNumber(nutriments.fiber_100g),
  };
}

async function fetchPage(page) {
  const params = new URLSearchParams({
    action: "process",
    json: "1",
    tagtype_0: "countries",
    tag_contains_0: "contains",
    tag_0: "brazil",
    page_size: String(PAGE_SIZE),
    page: String(page),
    fields: OFF_FIELDS,
  });
  const url = `https://world.openfoodfacts.org/cgi/search.pl?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LajesFit/1.0 (https://lajesfit.vercel.app; magnoaugustoss@gmail.com)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} na página ${page}`);
  const data = await res.json();
  return {
    products: Array.isArray(data.products) ? data.products : [],
    count: data.count ?? 0,
  };
}

async function insertBatch(rows) {
  const { error } = await supabase
    .from("foods")
    .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: false });
  if (error) throw new Error(`Erro ao inserir batch: ${error.message}`);
}

async function main() {
  console.log("🚀 Iniciando importação do Open Food Facts (Brasil)...\n");

  const { count: totalCount } = await fetchPage(1);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  console.log(`📦 Total estimado: ${totalCount} produtos | ${totalPages} páginas\n`);

  let imported = 0;
  let skipped = 0;

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`Página ${page}/${totalPages}...`);

    let products;
    try {
      ({ products } = await fetchPage(page));
    } catch (err) {
      console.log(` ⚠️  ${err.message} — pulando`);
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    const rows = products.map(parseProduct).filter(Boolean);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        await insertBatch(batch);
        imported += batch.length;
      } catch (err) {
        console.log(` ⚠️  ${err.message}`);
        skipped += batch.length;
      }
    }

    console.log(` ✓ ${rows.length} válidos (${products.length - rows.length} sem dados)`);

    // Respeita rate limit: 10 req/min para search
    if (page < totalPages) await new Promise((r) => setTimeout(r, 6500));
  }

  console.log(`\n✅ Concluído! ${imported} produtos importados, ${skipped} com erro.`);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err.message);
  process.exit(1);
});
