-- Popula public.food_measures para o catalogo TACO/estimado (657 alimentos que ainda
-- nao tinham nenhuma medida cadastrada e dependiam de heuristica generica no cliente).
--
-- Regra geral: toda comida ganha "gramas" (peso) como medida base. Para liquidos
-- inequivocos a medida padrao passa a ser "ml". Para itens comumente contados em
-- unidades (ovos, paes, frutas com peso medio bem estabelecido) adiciona-se
-- "unidade"/"fatia" como padrao. Itens de despensa (oleos, acucar, farinha) e graos
-- ganham colher/xicara como alternativa, mantendo gramas como padrao por precisao.
--
-- NOTA (reprodutibilidade): os blocos que listam alimentos especificos referenciam a chave
-- natural (source, source_id) -- nao foods.id. foods.id e BIGSERIAL e depende da ordem/volume
-- de insercao, entao itens "estimated" recebem ids diferentes em producao e num banco recriado
-- so pelas migrations, o que quebrava a FK food_measures_food_id_fkey. Ver
-- specs/ambientes-supabase.md.

-- 1) Medida base em gramas para todo alimento taco/estimado que ainda nao tem nenhuma medida.
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'gramas', 'g', 1, true, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm WHERE fm.food_id = f.id
  );

-- 2) Liquidos: bebidas e leites em estado liquido passam a ter "ml" como padrao.
WITH liquid_foods AS (
  SELECT f.id
  FROM public.foods f
  WHERE f.source IN ('taco', 'estimated')
    AND (
      f.category ILIKE '%Bebida%'
      OR f.name IN ('Cafe com leite', 'Cafe sem acucar', 'Leite desnatado', 'Leite integral')
      OR (f.name ILIKE 'Leite,%' AND f.name NOT ILIKE '%pó%' AND f.name NOT ILIKE '%condensado%')
    )
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.food_id IN (SELECT id FROM liquid_foods)
  AND fm.unit = 'g';

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'ml', 'ml', 1, true, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND (
    f.category ILIKE '%Bebida%'
    OR f.name IN ('Cafe com leite', 'Cafe sem acucar', 'Leite desnatado', 'Leite integral')
    OR (f.name ILIKE 'Leite,%' AND f.name NOT ILIKE '%pó%' AND f.name NOT ILIKE '%condensado%')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'ml'
  );

-- 3) Lacteos espessos/ambiguos: mantem gramas como padrao, mas oferece ml como alternativa.
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'ml', 'ml', 1, false, 'system'
FROM public.foods f
WHERE f.source = 'taco'
  AND f.name IN (
    'Bebida láctea, pêssego', 'Creme de Leite', 'Iogurte, natural',
    'Iogurte, natural, desnatado', 'Iogurte, sabor abacaxi',
    'Iogurte, sabor morango', 'Iogurte, sabor pêssego'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'ml'
  );

-- 4) Ovos: medida padrao passa a ser "unidade" com peso medio reconhecido.
WITH egg_units (source, source_id, grams_per_unit) AS (
  VALUES
    ('taco', '489', 50), -- Ovo, de galinha, inteiro, cru
    ('taco', '488', 50), -- Ovo, de galinha, inteiro, cozido/10minutos
    ('taco', '490', 48), -- Ovo, de galinha, inteiro, frito
    ('taco', '486', 33), -- Ovo, de galinha, clara, cozida/10minutos
    ('taco', '487', 17), -- Ovo, de galinha, gema, cozida/10minutos
    ('taco', '485', 9),  -- Ovo, de codorna, inteiro, cru
    ('estimated', 'lajesfit:ovo-cozido', 50), -- Ovo cozido (estimado)
    ('estimated', 'lajesfit:ovo-frito', 48)   -- Ovo frito (estimado)
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (
    SELECT f.id FROM public.foods f
    JOIN egg_units eu ON f.source = eu.source AND f.source_id = eu.source_id
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'unidade', 'unit', eu.grams_per_unit, true, 'system'
FROM (
  VALUES
    ('taco', '489', 50), ('taco', '488', 50), ('taco', '490', 48), ('taco', '486', 33),
    ('taco', '487', 17), ('taco', '485', 9),
    ('estimated', 'lajesfit:ovo-cozido', 50), ('estimated', 'lajesfit:ovo-frito', 48)
) AS eu (source, source_id, grams_per_unit)
JOIN public.foods f ON f.source = eu.source AND f.source_id = eu.source_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = f.id AND fm2.unit = 'unit'
);

-- 5) Paes vendidos por unidade (pao frances, pao de queijo) com peso medio padrao.
WITH bread_units (source, source_id, grams_per_unit) AS (
  VALUES
    ('taco', '53', 50),  -- Pão, trigo, francês
    ('taco', '63', 25),  -- Torrada, pão francês
    ('taco', '140', 30), -- Pão, de queijo, assado
    ('taco', '141', 32), -- Pão, de queijo, cru
    ('estimated', 'lajesfit:pao-frances', 50), -- Pao frances (estimado)
    ('estimated', 'lajesfit:pao-de-sal', 50)   -- Pao de sal (estimado)
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (
    SELECT f.id FROM public.foods f
    JOIN bread_units bu ON f.source = bu.source AND f.source_id = bu.source_id
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'unidade', 'unit', bu.grams_per_unit, true, 'system'
FROM (
  VALUES
    ('taco', '53', 50), ('taco', '63', 25), ('taco', '140', 30), ('taco', '141', 32),
    ('estimated', 'lajesfit:pao-frances', 50), ('estimated', 'lajesfit:pao-de-sal', 50)
) AS bu (source, source_id, grams_per_unit)
JOIN public.foods f ON f.source = bu.source AND f.source_id = bu.source_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = f.id AND fm2.unit = 'unit'
);

-- 6) Paes de forma fatiados: medida padrao passa a ser "fatia".
WITH sliced_bread (source, source_id, grams_per_slice) AS (
  VALUES
    ('taco', '48', 25), -- Pão, aveia, forma
    ('taco', '49', 25), -- Pão, de soja
    ('taco', '50', 25), -- Pão, glúten, forma
    ('taco', '51', 25), -- Pão, milho, forma
    ('taco', '52', 25)  -- Pão, trigo, forma, integral
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (
    SELECT f.id FROM public.foods f
    JOIN sliced_bread sb ON f.source = sb.source AND f.source_id = sb.source_id
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'fatia', 'unit', sb.grams_per_slice, true, 'system'
FROM (
  VALUES ('taco', '48', 25), ('taco', '49', 25), ('taco', '50', 25), ('taco', '51', 25), ('taco', '52', 25)
) AS sb (source, source_id, grams_per_slice)
JOIN public.foods f ON f.source = sb.source AND f.source_id = sb.source_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = f.id AND fm2.unit = 'unit'
);

-- 7) Frutas com peso medio de unidade bem estabelecido (apenas variantes "crua"/inteiras;
--    polpa, suco e calda continuam apenas em gramas, pois nao se consomem por unidade).
WITH fruit_units (source, source_id, grams_per_unit) AS (
  VALUES
    ('taco', '172', 60),  -- Ameixa, crua
    ('taco', '175', 180), -- Banana, da terra, crua
    ('taco', '177', 70),  -- Banana, figo, crua
    ('taco', '178', 80),  -- Banana, maçã, crua
    ('taco', '179', 120), -- Banana, nanica, crua
    ('taco', '180', 35),  -- Banana, ouro, crua
    ('taco', '181', 150), -- Banana, pacova, crua
    ('taco', '182', 70),  -- Banana, prata, crua
    ('taco', '207', 70),  -- Kiwi, cru
    ('taco', '208', 180), -- Laranja, baía, crua
    ('taco', '210', 180), -- Laranja, da terra, crua
    ('taco', '212', 150), -- Laranja, lima, crua
    ('taco', '214', 180), -- Laranja, pêra, crua
    ('taco', '216', 180), -- Laranja, valência, crua
    ('taco', '221', 130), -- Maçã, Argentina, com casca, crua
    ('taco', '222', 130), -- Maçã, Fuji, com casca, crua
    ('taco', '228', 200), -- Manga, Haden, crua
    ('taco', '229', 300), -- Manga, Palmer, crua
    ('taco', '231', 300), -- Manga, Tommy Atkins, crua
    ('taco', '237', 100), -- Mexerica, Murcote, crua
    ('taco', '238', 100), -- Mexerica, Rio, crua
    ('taco', '240', 20),  -- Nêspera, crua
    ('taco', '244', 130), -- Pêssego, Aurora, cru
    ('taco', '251', 150), -- Tangerina, Poncã, crua
    ('estimated', 'lajesfit:banana-prata', 70),  -- Banana prata (estimado)
    ('estimated', 'lajesfit:banana-nanica', 120), -- Banana nanica (estimado)
    ('estimated', 'lajesfit:maca', 130),          -- Maca (estimado)
    ('estimated', 'lajesfit:tangerina', 100),     -- Tangerina (estimado)
    ('estimated', 'lajesfit:banana-branca', 90)   -- Banana branca (estimado)
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (
    SELECT f.id FROM public.foods f
    JOIN fruit_units fu ON f.source = fu.source AND f.source_id = fu.source_id
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'unidade', 'unit', fu.grams_per_unit, true, 'system'
FROM (
  VALUES
    ('taco', '172', 60), ('taco', '175', 180), ('taco', '177', 70), ('taco', '178', 80),
    ('taco', '179', 120), ('taco', '180', 35), ('taco', '181', 150), ('taco', '182', 70),
    ('taco', '207', 70), ('taco', '208', 180), ('taco', '210', 180), ('taco', '212', 150),
    ('taco', '214', 180), ('taco', '216', 180), ('taco', '221', 130), ('taco', '222', 130),
    ('taco', '228', 200), ('taco', '229', 300), ('taco', '231', 300), ('taco', '237', 100),
    ('taco', '238', 100), ('taco', '240', 20), ('taco', '244', 130), ('taco', '251', 150),
    ('estimated', 'lajesfit:banana-prata', 70), ('estimated', 'lajesfit:banana-nanica', 120),
    ('estimated', 'lajesfit:maca', 130), ('estimated', 'lajesfit:tangerina', 100),
    ('estimated', 'lajesfit:banana-branca', 90)
) AS fu (source, source_id, grams_per_unit)
JOIN public.foods f ON f.source = fu.source AND f.source_id = fu.source_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = f.id AND fm2.unit = 'unit'
);

-- 8) Oleos e gorduras: colher de sopa/cha como alternativa pratica (peso continua padrao).
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'colher de sopa', 'tbsp', 15, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND (f.name ILIKE 'Azeite%' OR f.name ILIKE 'Manteiga%' OR f.name ILIKE 'Margarina%'
       OR f.name ILIKE 'Óleo%' OR f.name ILIKE 'Oleo%' OR f.name ILIKE 'Maionese%'
       OR f.name ILIKE '%Requeijão%' OR f.name ILIKE '%Requeijao%')
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'tbsp'
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'colher de cha', 'tsp', 5, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND (f.name ILIKE 'Azeite%' OR f.name ILIKE 'Manteiga%' OR f.name ILIKE 'Margarina%'
       OR f.name ILIKE 'Óleo%' OR f.name ILIKE 'Oleo%')
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'tsp'
  );

-- 9) Acucares e doces pastosos: colher como alternativa (peso continua padrao).
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'colher de sopa', 'tbsp', 15, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND (f.name ILIKE 'Açúcar%' OR f.name ILIKE 'Acucar%' OR f.name ILIKE 'Mel,%'
       OR f.name ILIKE 'Achocolatado%' OR f.name ILIKE 'Leite, condensado'
       OR f.name ILIKE 'Leite, de vaca,%pó')
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'tbsp'
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'colher de cha', 'tsp', 5, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND (f.name ILIKE 'Açúcar%' OR f.name ILIKE 'Acucar%' OR f.name ILIKE 'Mel,%'
       OR f.name ILIKE 'Achocolatado%')
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'tsp'
  );

-- 10) Farinhas: colher de sopa + xicara como alternativa (peso continua padrao).
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'colher de sopa', 'tbsp', 15, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND f.name ILIKE 'Farinha%'
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'tbsp'
  );

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'xicara', 'cup', 120, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND f.name ILIKE 'Farinha%'
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'cup'
  );

-- 11) Graos e leguminosas crus/cozidos: xicara como alternativa (peso continua padrao).
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'xicara', 'cup', 180, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND (f.name ILIKE 'Arroz%' OR f.name ILIKE 'Feijão,%' OR f.name ILIKE 'Feijao %'
       OR f.name ILIKE 'Lentilha%' OR f.name ILIKE 'Grão-de-bico%' OR f.name ILIKE 'Grao-de-bico%'
       OR f.name ILIKE 'Milho,%' OR f.name ILIKE 'Macarrão,%' OR f.name ILIKE 'Macarrao %')
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'cup'
  );

-- 12) Aveia/granola: xicara mais leve como alternativa (peso continua padrao).
INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT f.id, 'xicara', 'cup', 90, false, 'system'
FROM public.foods f
WHERE f.source IN ('taco', 'estimated')
  AND f.name ILIKE 'Aveia%'
  AND NOT EXISTS (
    SELECT 1 FROM public.food_measures fm2 WHERE fm2.food_id = f.id AND fm2.unit = 'cup'
  );

NOTIFY pgrst, 'reload schema';
