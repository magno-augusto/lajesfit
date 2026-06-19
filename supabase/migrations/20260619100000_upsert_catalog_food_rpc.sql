CREATE OR REPLACE FUNCTION public.upsert_catalog_food(
  p_source TEXT,
  p_source_id TEXT,
  p_name TEXT,
  p_category TEXT,
  p_brand TEXT,
  p_kcal NUMERIC,
  p_protein_g NUMERIC DEFAULT 0,
  p_carbs_g NUMERIC DEFAULT 0,
  p_fat_g NUMERIC DEFAULT 0,
  p_fiber_g NUMERIC DEFAULT 0,
  p_measures JSONB DEFAULT '[]'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_food_id BIGINT;
  v_measure JSONB;
  v_has_default BOOLEAN := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF p_source NOT IN ('open_food_facts', 'manual') THEN
    RAISE EXCEPTION 'Fonte nao permitida para cadastro pelo app';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' OR p_kcal IS NULL OR p_kcal <= 0 THEN
    RAISE EXCEPTION 'Dados de alimento invalidos';
  END IF;

  INSERT INTO public.foods (
    source,
    source_id,
    name,
    category,
    brand,
    kcal,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g
  )
  VALUES (
    p_source,
    NULLIF(p_source_id, ''),
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_category, '')), ''),
    NULLIF(btrim(COALESCE(p_brand, '')), ''),
    p_kcal,
    COALESCE(p_protein_g, 0),
    COALESCE(p_carbs_g, 0),
    COALESCE(p_fat_g, 0),
    COALESCE(p_fiber_g, 0)
  )
  ON CONFLICT (source, source_id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    brand = EXCLUDED.brand,
    kcal = EXCLUDED.kcal,
    protein_g = EXCLUDED.protein_g,
    carbs_g = EXCLUDED.carbs_g,
    fat_g = EXCLUDED.fat_g,
    fiber_g = EXCLUDED.fiber_g
  RETURNING id INTO v_food_id;

  IF jsonb_typeof(p_measures) = 'array' THEN
    DELETE FROM public.food_measures
    WHERE food_id = v_food_id
      AND source = p_source;

    FOR v_measure IN SELECT * FROM jsonb_array_elements(p_measures)
    LOOP
      IF (v_measure->>'unit') IN ('g', 'ml', 'unit', 'tsp', 'tbsp', 'cup', 'serving')
        AND COALESCE((v_measure->>'grams')::NUMERIC, 0) > 0 THEN
        INSERT INTO public.food_measures (
          food_id,
          label,
          unit,
          grams,
          is_default,
          source,
          source_id
        )
        VALUES (
          v_food_id,
          COALESCE(NULLIF(btrim(v_measure->>'label'), ''), v_measure->>'unit'),
          v_measure->>'unit',
          (v_measure->>'grams')::NUMERIC,
          COALESCE((v_measure->>'isDefault')::BOOLEAN, false) AND NOT v_has_default,
          p_source,
          v_measure->>'id'
        );

        IF COALESCE((v_measure->>'isDefault')::BOOLEAN, false) THEN
          v_has_default := true;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_food_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_catalog_food(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_catalog_food(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  JSONB
) TO authenticated;
