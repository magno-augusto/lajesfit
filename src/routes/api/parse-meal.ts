import { createFileRoute } from "@tanstack/react-router";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const SYSTEM_PROMPT = `Voce e um nutricionista brasileiro especializado em composicao de refeicoes. Analise a descricao de refeicao fornecida e retorne um array JSON com os alimentos identificados.

REGRAS:
1. Separe alimentos que vem misturados (ex: "prato de arroz com feijao" = 2 itens)
2. Use porcoes REALISTAS em gramas para o contexto brasileiro
3. Use valores nutricionais da TACO (UNICAMP) como referencia
4. Seja preciso nas estimativas de porcao
5. Para bebidas, use ml como unidade (1 copo = 250ml, 1 xicara = 150ml)
6. Para frutas em unidade, estime o peso medio

FORMATO DE SAIDA (APENAS JSON, sem texto explicativo):
[
  {
    "food_name": "Arroz branco cozido",
    "grams": 200,
    "kcal": 260,
    "protein_g": 5.4,
    "carbs_g": 56.0,
    "fat_g": 0.6
  }
]

Exemplos de porcoes padrao brasileiras:
- Arroz: 1 concha = ~150g, 1 prato = ~200g
- Feijao: 1 concha = ~150g, 1 prato = ~200g
- Frango grelhado: 1 peito = ~150g, 1 coxa = ~100g
- Ovo: 1 unidade = ~50g
- Banana: 1 unidade = ~120g
- Cafe: 1 xicara = ~150ml
- Leite: 1 copo = ~250ml
- Pao frances: 1 unidade = ~50g
- Manteiga: 1 colher = ~10g`;

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export const Route = createFileRoute("/api/parse-meal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
          return json({ error: "GOOGLE_GEMINI_API_KEY nao configurada" }, { status: 500 });
        }

        let body: { text?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "JSON invalido" }, { status: 400 });
        }

        if (!body.text?.trim()) {
          return json({ error: "Campo 'text' obrigatorio" }, { status: 400 });
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: body.text }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("[parse-meal] Gemini error:", response.status, errorBody);
          return json(
            { error: "Falha ao interpretar refeicao", details: response.status },
            { status: 502 },
          );
        }

        const result = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };

        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

        let items: Array<{
          food_name: string;
          grams: number;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        }>;

        try {
          items = JSON.parse(rawText);
          if (!Array.isArray(items)) items = [];
        } catch {
          console.error("[parse-meal] JSON parse error:", rawText);
          return json({ error: "Resposta invalida da IA", items: [] }, { status: 502 });
        }

        const validated = items
          .filter(
            (item) =>
              item.food_name &&
              typeof item.grams === "number" &&
              item.grams > 0 &&
              typeof item.kcal === "number",
          )
          .map((item) => ({
            food_name: String(item.food_name),
            grams: Math.round(item.grams),
            kcal: Math.round(item.kcal),
            protein_g: Math.round((item.protein_g ?? 0) * 10) / 10,
            carbs_g: Math.round((item.carbs_g ?? 0) * 10) / 10,
            fat_g: Math.round((item.fat_g ?? 0) * 10) / 10,
          }));

        return json({ items: validated });
      },
    },
  },
});
