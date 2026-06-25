-- Popula public.food_measures para o catalogo TACO/estimado (657 alimentos que ainda
-- nao tinham nenhuma medida cadastrada e dependiam de heuristica generica no cliente).
--
-- Regra geral: toda comida ganha "gramas" (peso) como medida base. Para liquidos
-- inequivocos a medida padrao passa a ser "ml". Para itens comumente contados em
-- unidades (ovos, paes, frutas com peso medio bem estabelecido) adiciona-se
-- "unidade"/"fatia" como padrao. Itens de despensa (oleos, acucar, farinha) e graos
-- ganham colher/xicara como alternativa, mantendo gramas como padrao por precisao.

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
WITH egg_units (food_id, grams_per_unit) AS (
  VALUES
    (489, 50), -- Ovo, de galinha, inteiro, cru
    (488, 50), -- Ovo, de galinha, inteiro, cozido/10minutos
    (490, 48), -- Ovo, de galinha, inteiro, frito
    (486, 33), -- Ovo, de galinha, clara, cozida/10minutos
    (487, 17), -- Ovo, de galinha, gema, cozida/10minutos
    (485, 9),  -- Ovo, de codorna, inteiro, cru
    (607, 50), -- Ovo cozido (estimado)
    (608, 48)  -- Ovo frito (estimado)
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (SELECT food_id FROM egg_units);

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT food_id, 'unidade', 'unit', grams_per_unit, true, 'system'
FROM (
  VALUES
    (489, 50), (488, 50), (490, 48), (486, 33), (487, 17), (485, 9), (607, 50), (608, 48)
) AS egg_units (food_id, grams_per_unit)
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = egg_units.food_id AND fm2.unit = 'unit'
);

-- 5) Paes vendidos por unidade (pao frances, pao de queijo) com peso medio padrao.
WITH bread_units (food_id, grams_per_unit) AS (
  VALUES
    (53, 50),  -- Pão, trigo, francês
    (63, 25),  -- Torrada, pão francês
    (140, 30), -- Pão, de queijo, assado
    (141, 32), -- Pão, de queijo, cru
    (623, 50), -- Pao frances (estimado)
    (656, 50)  -- Pao de sal (estimado)
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (SELECT food_id FROM bread_units);

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT food_id, 'unidade', 'unit', grams_per_unit, true, 'system'
FROM (
  VALUES (53, 50), (63, 25), (140, 30), (141, 32), (623, 50), (656, 50)
) AS bread_units (food_id, grams_per_unit)
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = bread_units.food_id AND fm2.unit = 'unit'
);

-- 6) Paes de forma fatiados: medida padrao passa a ser "fatia".
WITH sliced_bread (food_id, grams_per_slice) AS (
  VALUES
    (48, 25), -- Pão, aveia, forma
    (49, 25), -- Pão, de soja
    (50, 25), -- Pão, glúten, forma
    (51, 25), -- Pão, milho, forma
    (52, 25)  -- Pão, trigo, forma, integral
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (SELECT food_id FROM sliced_bread);

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT food_id, 'fatia', 'unit', grams_per_slice, true, 'system'
FROM (
  VALUES (48, 25), (49, 25), (50, 25), (51, 25), (52, 25)
) AS sliced_bread (food_id, grams_per_slice)
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = sliced_bread.food_id AND fm2.unit = 'unit'
);

-- 7) Frutas com peso medio de unidade bem estabelecido (apenas variantes "crua"/inteiras;
--    polpa, suco e calda continuam apenas em gramas, pois nao se consomem por unidade).
WITH fruit_units (food_id, grams_per_unit) AS (
  VALUES
    (172, 60),  -- Ameixa, crua
    (175, 180), -- Banana, da terra, crua
    (177, 70),  -- Banana, figo, crua
    (178, 80),  -- Banana, maçã, crua
    (179, 120), -- Banana, nanica, crua
    (180, 35),  -- Banana, ouro, crua
    (181, 150), -- Banana, pacova, crua
    (182, 70),  -- Banana, prata, crua
    (207, 70),  -- Kiwi, cru
    (208, 180), -- Laranja, baía, crua
    (210, 180), -- Laranja, da terra, crua
    (212, 150), -- Laranja, lima, crua
    (214, 180), -- Laranja, pêra, crua
    (216, 180), -- Laranja, valência, crua
    (221, 130), -- Maçã, Argentina, com casca, crua
    (222, 130), -- Maçã, Fuji, com casca, crua
    (228, 200), -- Manga, Haden, crua
    (229, 300), -- Manga, Palmer, crua
    (231, 300), -- Manga, Tommy Atkins, crua
    (237, 100), -- Mexerica, Murcote, crua
    (238, 100), -- Mexerica, Rio, crua
    (240, 20),  -- Nêspera, crua
    (244, 130), -- Pêssego, Aurora, cru
    (251, 150), -- Tangerina, Poncã, crua
    (613, 70),  -- Banana prata (estimado)
    (614, 120), -- Banana nanica (estimado)
    (615, 130), -- Maca (estimado)
    (634, 100), -- Tangerina (estimado)
    (659, 90)   -- Banana branca (estimado)
)
UPDATE public.food_measures fm
SET is_default = false
WHERE fm.unit = 'g'
  AND fm.food_id IN (SELECT food_id FROM fruit_units);

INSERT INTO public.food_measures (food_id, label, unit, grams, is_default, source)
SELECT food_id, 'unidade', 'unit', grams_per_unit, true, 'system'
FROM (
  VALUES
    (172, 60), (175, 180), (177, 70), (178, 80), (179, 120), (180, 35), (181, 150), (182, 70),
    (207, 70), (208, 180), (210, 180), (212, 150), (214, 180), (216, 180), (221, 130), (222, 130),
    (228, 200), (229, 300), (231, 300), (237, 100), (238, 100), (240, 20), (244, 130), (251, 150),
    (613, 70), (614, 120), (615, 130), (634, 100), (659, 90)
) AS fruit_units (food_id, grams_per_unit)
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_measures fm2
  WHERE fm2.food_id = fruit_units.food_id AND fm2.unit = 'unit'
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
