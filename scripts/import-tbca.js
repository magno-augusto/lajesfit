#!/usr/bin/env node
// Importa a TBCA (Tabela Brasileira de Composição de Alimentos, USP/FoRC)
// para a tabela foods do Supabase, com dedup contra itens TACO existentes.
// Fonte do dump: https://github.com/resen-dev/web-scraping-tbca (alimentos.txt, JSONL)
// Pré-requisito: SUPABASE_SERVICE_ROLE_KEY no .env
// Uso: node scripts/import-tbca.js [caminho/para/alimentos.txt]

import { createReadStream, readFileSync } from "fs";
import { createInterface } from "readline";
import { createClient } from "@supabase/supabase-js";

const DUMP_URL =
  "https://raw.githubusercontent.com/resen-dev/web-scraping-tbca/master/alimentos.txt";

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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// mesma normalizacao do food_norm do banco (minusculas, sem acento)
function norm(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseValue(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text || text.toUpperCase() === "NA" || text === "-" || text === "tr") return null;
  const value = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function nutrient(nutrientes, componente, unidade) {
  const row = nutrientes.find(
    (item) => item.Componente === componente && (!unidade || item.Unidades === unidade),
  );
  return parseValue(row?.["Valor por 100g"]);
}

// Remove listas de ingredientes entre parenteses e o nome cientifico do
// final da descricao TBCA
// ("Pizza, massa, assada, (farinha de trigo, ...)" -> "Pizza, massa, assada")
function cleanName(descricao) {
  const withoutParenthetical = descricao.replace(/\s*\(.*$/s, "");
  const parts = withoutParenthetical
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    const looksScientific =
      /^[A-Z][a-zçãõéáíóú]+ [a-z]/.test(last) ||
      /\b(L\.|Mill\.|Lam\.|Sweet|spp?\.|var\.|cv\.)\s*$/.test(last) ||
      /^´.*´$/.test(last);
    if (!looksScientific) break;
    parts.pop();
  }
  return parts.join(", ");
}

async function readDump(path) {
  let stream;
  if (path) {
    stream = createReadStream(path, { encoding: "utf8" });
  } else {
    console.log("Baixando dump da TBCA...");
    const response = await fetch(DUMP_URL);
    if (!response.ok) throw new Error(`Falha ao baixar dump (${response.status})`);
    const text = await response.text();
    return text.split("\n");
  }
  const lines = [];
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) lines.push(line);
  return lines;
}

async function fetchExistingNames() {
  const names = new Set();
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("foods")
      .select("name, source")
      .in("source", ["taco", "estimated", "manual"])
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) names.add(norm(row.name));
    if (!data || data.length < page) break;
    from += page;
  }
  return names;
}

async function main() {
  const dumpPath = process.argv[2] || null;
  const lines = await readDump(dumpPath);

  const existingNames = await fetchExistingNames();
  console.log(`Nomes ja existentes (taco/estimated/manual): ${existingNames.size}`);

  const rows = [];
  let skippedDup = 0;
  let skippedInvalid = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/,\s*$/, "");
    if (!line || line === "[" || line === "]") continue;

    let item;
    try {
      item = JSON.parse(line);
    } catch {
      skippedInvalid += 1;
      continue;
    }

    const codigo = String(item.codigo ?? "").trim();
    const nutrientes = Array.isArray(item.nutrientes) ? item.nutrientes : [];
    const name = cleanName(String(item.descricao ?? ""));
    const kcal = nutrient(nutrientes, "Energia", "kcal");

    if (!codigo || !name || kcal === null) {
      skippedInvalid += 1;
      continue;
    }

    if (existingNames.has(norm(name))) {
      skippedDup += 1;
      continue;
    }

    rows.push({
      source: "tbca",
      source_id: codigo,
      name,
      category: String(item.classe ?? "").trim() || null,
      brand: null,
      kcal,
      protein_g: nutrient(nutrientes, "Proteína") ?? 0,
      carbs_g: nutrient(nutrientes, "Carboidrato total") ?? 0,
      fat_g: nutrient(nutrientes, "Lipídios") ?? 0,
      fiber_g: nutrient(nutrientes, "Fibra alimentar") ?? 0,
    });
  }

  console.log(
    `Para importar: ${rows.length} | duplicados da TACO pulados: ${skippedDup} | invalidos: ${skippedInvalid}`,
  );

  const batchSize = 500;
  let imported = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await supabase
      .from("foods")
      .upsert(batch, { onConflict: "source,source_id", ignoreDuplicates: false });
    if (error) {
      console.error(`Erro no lote ${index / batchSize + 1}:`, error.message);
      process.exit(1);
    }
    imported += batch.length;
    console.log(`  ${imported}/${rows.length}`);
  }

  console.log(`Concluido: ${imported} alimentos TBCA importados.`);
}

main().catch((error) => {
  console.error("Erro fatal:", error.message);
  process.exit(1);
});
