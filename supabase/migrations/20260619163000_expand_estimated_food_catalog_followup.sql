ALTER TABLE public.foods
  DROP CONSTRAINT IF EXISTS foods_source_check;

ALTER TABLE public.foods
  ADD CONSTRAINT foods_source_check
  CHECK (source IN ('tbca', 'taco', 'open_food_facts', 'manual', 'estimated'));

ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

INSERT INTO public.foods (
  source,
  source_id,
  name,
  category,
  kcal,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g,
  aliases
)
VALUES
  ('estimated', 'lajes-fit:ovo-mexido', 'Ovo mexido', 'Ovos e derivados', 199, 13.6, 1.6, 15.2, 0, ARRAY['ovos mexidos', 'ovo mexido simples']),
  ('estimated', 'lajes-fit:frango-cozido', 'Frango cozido', 'Carnes e derivados', 163, 30.4, 0, 3.7, 0, ARRAY['peito de frango cozido', 'frango desfiado', 'frango sem pele cozido']),
  ('estimated', 'lajes-fit:cafe-com-leite', 'Cafe com leite', 'Bebidas', 38, 2.0, 3.2, 2.0, 0, ARRAY['cafe leite', 'cafe pingado', 'media']),
  ('estimated', 'lajes-fit:aveia-em-flocos', 'Aveia em flocos', 'Cereais e derivados', 394, 13.9, 66.6, 8.5, 9.1, ARRAY['aveia', 'flocos de aveia', 'aveia integral']),
  ('estimated', 'lajes-fit:pao-de-sal', 'Pao de sal', 'Paes e massas', 300, 8.0, 58.6, 3.1, 2.3, ARRAY['pao frances', 'paozinho', 'paozinho frances']),
  ('estimated', 'lajes-fit:aipim-cozido', 'Aipim cozido', 'Raizes e tuberculos', 125, 0.6, 30.1, 0.3, 1.6, ARRAY['mandioca cozida', 'macaxeira cozida']),
  ('estimated', 'lajes-fit:macaxeira-cozida', 'Macaxeira cozida', 'Raizes e tuberculos', 125, 0.6, 30.1, 0.3, 1.6, ARRAY['mandioca cozida', 'aipim cozido']),
  ('estimated', 'lajes-fit:banana-branca', 'Banana branca', 'Frutas', 98, 1.3, 26.0, 0.1, 2.0, ARRAY['banana prata', 'banana']),
  ('estimated', 'lajes-fit:feijao-carioquinha-cozido', 'Feijao carioquinha cozido', 'Leguminosas e derivados', 76, 4.8, 13.6, 0.5, 8.5, ARRAY['feijao carioca cozido', 'feijao cozido']),
  ('estimated', 'lajes-fit:jerimum-cozido', 'Jerimum cozido', 'Verduras e legumes', 48, 1.4, 10.8, 0.7, 2.5, ARRAY['abobora cozida', 'moranga cozida'])
ON CONFLICT (source, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  kcal = EXCLUDED.kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  fiber_g = EXCLUDED.fiber_g,
  aliases = EXCLUDED.aliases;

UPDATE public.foods
SET aliases = ARRAY(
  SELECT DISTINCT alias
  FROM unnest(aliases || ARRAY['pao de sal', 'paozinho', 'paozinho frances']) AS alias
)
WHERE source = 'estimated'
  AND source_id = 'lajes-fit:pao-frances';

UPDATE public.foods
SET aliases = ARRAY(
  SELECT DISTINCT alias
  FROM unnest(aliases || ARRAY['aipim', 'macaxeira', 'aipim cozido', 'macaxeira cozida']) AS alias
)
WHERE source = 'estimated'
  AND source_id = 'lajes-fit:mandioca-cozida';

UPDATE public.foods
SET aliases = ARRAY(
  SELECT DISTINCT alias
  FROM unnest(aliases || ARRAY['cafe leite', 'cafe com leite']) AS alias
)
WHERE source = 'estimated'
  AND source_id = 'lajes-fit:cafe-sem-acucar';

NOTIFY pgrst, 'reload schema';
