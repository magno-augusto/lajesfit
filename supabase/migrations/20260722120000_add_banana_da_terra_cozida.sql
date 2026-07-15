-- Fecha a lacuna reportada por uma testadora: busca por "banana cozida" nao
-- devolvia nenhum item, so variedades cruas (TACO) e pratos com banana. Segue
-- o padrao dos demais itens "cozido(a)" ja adicionados como estimated em
-- 20260619143000_expand_food_catalog_and_requests.sql.
--
-- Macros estimados a partir da linha TACO 'Banana, da terra, crua'
-- (20260618203000_seed_complete_taco_foods.sql), ajustados pela perda tipica
-- de cozimento em agua. Revisar/ajustar os valores antes de aplicar.
INSERT INTO public.foods
  (source, source_id, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g, aliases)
VALUES
  ('estimated', 'lajesfit:banana-da-terra-cozida', 'Banana da terra, cozida', 'Frutas e derivados',
   122, 1.0, 32.0, 0.1, 1.5, ARRAY['banana da terra', 'banana cozida', 'banana comprida cozida'])
ON CONFLICT (source, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  kcal = EXCLUDED.kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  fiber_g = EXCLUDED.fiber_g,
  aliases = EXCLUDED.aliases;
