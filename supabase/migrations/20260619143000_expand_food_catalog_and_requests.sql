ALTER TABLE public.foods
  DROP CONSTRAINT IF EXISTS foods_source_check;

ALTER TABLE public.foods
  ADD CONSTRAINT foods_source_check
  CHECK (source IN ('tbca', 'taco', 'open_food_facts', 'manual', 'estimated'));

ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

CREATE INDEX IF NOT EXISTS foods_aliases_idx ON public.foods USING gin (aliases);

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
  ('estimated', 'lajesfit:arroz-branco-cozido', 'Arroz branco cozido', 'Cereais e derivados', 128, 2.5, 28.1, 0.2, 1.6, ARRAY['arroz cozido', 'arroz branco']),
  ('estimated', 'lajesfit:arroz-integral-cozido', 'Arroz integral cozido', 'Cereais e derivados', 124, 2.6, 25.8, 1.0, 2.7, ARRAY['arroz integral']),
  ('estimated', 'lajesfit:feijao-carioca-cozido', 'Feijao carioca cozido', 'Leguminosas e derivados', 76, 4.8, 13.6, 0.5, 8.5, ARRAY['feijao carioquinha', 'feijao cozido']),
  ('estimated', 'lajesfit:feijao-preto-cozido', 'Feijao preto cozido', 'Leguminosas e derivados', 77, 4.5, 14.0, 0.5, 8.4, ARRAY['feijao preto']),
  ('estimated', 'lajesfit:feijao-fradinho-cozido', 'Feijao fradinho cozido', 'Leguminosas e derivados', 78, 5.1, 13.5, 0.6, 7.5, ARRAY['feijao de corda', 'feijao macassar']),
  ('estimated', 'lajesfit:ovo-cozido', 'Ovo cozido', 'Ovos e derivados', 146, 13.3, 0.6, 9.5, 0, ARRAY['ovo de galinha cozido']),
  ('estimated', 'lajesfit:ovo-frito', 'Ovo frito', 'Ovos e derivados', 240, 15.6, 1.2, 18.6, 0, ARRAY['ovo de galinha frito']),
  ('estimated', 'lajesfit:frango-grelhado', 'Frango grelhado', 'Carnes e derivados', 165, 31.0, 0, 3.6, 0, ARRAY['peito de frango grelhado', 'frango assado sem pele']),
  ('estimated', 'lajesfit:carne-moida-refogada', 'Carne moida refogada', 'Carnes e derivados', 212, 26.0, 1.0, 11.0, 0, ARRAY['patinho moido', 'carne moida', 'carne moida cozida']),
  ('estimated', 'lajesfit:carne-bovina-cozida', 'Carne bovina cozida', 'Carnes e derivados', 219, 32.0, 0, 9.0, 0, ARRAY['carne cozida', 'bife cozido']),
  ('estimated', 'lajesfit:peixe-grelhado', 'Peixe grelhado', 'Pescados e frutos do mar', 128, 26.0, 0, 2.6, 0, ARRAY['file de peixe grelhado', 'tilapia grelhada']),
  ('estimated', 'lajesfit:banana-prata', 'Banana prata', 'Frutas', 98, 1.3, 26.0, 0.1, 2.0, ARRAY['banana']),
  ('estimated', 'lajesfit:banana-nanica', 'Banana nanica', 'Frutas', 92, 1.4, 23.8, 0.1, 1.9, ARRAY['banana caturra', 'banana d agua']),
  ('estimated', 'lajesfit:maca', 'Maca', 'Frutas', 56, 0.3, 15.2, 0.2, 1.3, ARRAY['maca com casca']),
  ('estimated', 'lajesfit:mamao-formosa', 'Mamao formosa', 'Frutas', 45, 0.8, 11.6, 0.1, 1.8, ARRAY['mamao', 'mamao papaia']),
  ('estimated', 'lajesfit:cuscuz-milho-cozido', 'Cuscuz de milho cozido', 'Cereais e derivados', 113, 2.2, 25.3, 0.7, 2.1, ARRAY['cuscuz', 'cuscuz nordestino']),
  ('estimated', 'lajesfit:tapioca', 'Tapioca', 'Cereais e derivados', 240, 0.2, 60.0, 0.1, 0.2, ARRAY['goma de tapioca', 'beiju']),
  ('estimated', 'lajesfit:mandioca-cozida', 'Mandioca cozida', 'Raizes e tuberculos', 125, 0.6, 30.1, 0.3, 1.6, ARRAY['aipim cozido', 'macaxeira cozida']),
  ('estimated', 'lajesfit:batata-doce-cozida', 'Batata doce cozida', 'Raizes e tuberculos', 77, 0.6, 18.4, 0.1, 2.2, ARRAY['batata doce']),
  ('estimated', 'lajesfit:batata-inglesa-cozida', 'Batata inglesa cozida', 'Raizes e tuberculos', 52, 1.2, 11.9, 0.0, 1.3, ARRAY['batata cozida', 'batata']),
  ('estimated', 'lajesfit:macarrao-cozido', 'Macarrao cozido', 'Massas', 158, 5.8, 30.9, 0.9, 1.8, ARRAY['massa cozida', 'macarrao']),
  ('estimated', 'lajesfit:pao-frances', 'Pao frances', 'Paes e massas', 300, 8.0, 58.6, 3.1, 2.3, ARRAY['pao de sal', 'paozinho frances']),
  ('estimated', 'lajesfit:leite-integral', 'Leite integral', 'Leites e derivados', 61, 3.2, 4.7, 3.3, 0, ARRAY['leite']),
  ('estimated', 'lajesfit:leite-desnatado', 'Leite desnatado', 'Leites e derivados', 35, 3.4, 5.0, 0.1, 0, ARRAY['leite magro']),
  ('estimated', 'lajesfit:queijo-minas-frescal', 'Queijo minas frescal', 'Leites e derivados', 264, 17.4, 3.2, 20.2, 0, ARRAY['queijo minas', 'minas frescal']),
  ('estimated', 'lajesfit:queijo-mussarela', 'Queijo mussarela', 'Leites e derivados', 300, 22.0, 3.0, 22.0, 0, ARRAY['mucarela', 'mozarela']),
  ('estimated', 'lajesfit:cafe-sem-acucar', 'Cafe sem acucar', 'Bebidas', 2, 0.1, 0, 0, 0, ARRAY['cafe preto', 'cafe puro']),
  ('estimated', 'lajesfit:acucar', 'Acucar', 'Acucares e doces', 387, 0, 99.9, 0, 0, ARRAY['acucar cristal', 'acucar refinado']),
  ('estimated', 'lajesfit:azeite-de-oliva', 'Azeite de oliva', 'Oleos e gorduras', 884, 0, 0, 100, 0, ARRAY['azeite']),
  ('estimated', 'lajesfit:manteiga', 'Manteiga', 'Oleos e gorduras', 717, 0.9, 0.1, 81.1, 0, ARRAY['manteiga com sal']),
  ('estimated', 'lajesfit:farinha-de-mandioca', 'Farinha de mandioca', 'Farinhas e derivados', 361, 1.6, 87.9, 0.3, 6.4, ARRAY['farinha seca', 'farinha']),
  ('estimated', 'lajesfit:farinha-de-milho', 'Farinha de milho', 'Farinhas e derivados', 351, 7.2, 79.1, 1.5, 5.5, ARRAY['fuba', 'flocao de milho']),
  ('estimated', 'lajesfit:tangerina', 'Tangerina', 'Frutas', 53, 0.8, 13.3, 0.3, 1.8, ARRAY['mexerica', 'bergamota']),
  ('estimated', 'lajesfit:abobora-cozida', 'Abobora cozida', 'Verduras e legumes', 48, 1.4, 10.8, 0.7, 2.5, ARRAY['jerimum cozido', 'moranga cozida']),
  ('estimated', 'lajesfit:arroz-com-feijao', 'Arroz com feijao', 'Preparacoes simples', 106, 3.6, 21.0, 0.5, 4.2, ARRAY['arroz e feijao']),
  ('estimated', 'lajesfit:farofa-simples', 'Farofa simples', 'Preparacoes simples', 405, 3.2, 67.0, 13.5, 6.0, ARRAY['farofa']),
  ('estimated', 'lajesfit:farofa-de-feijao', 'Farofa de feijao', 'Preparacoes simples', 245, 7.5, 37.0, 7.0, 8.2, ARRAY['farofa com feijao']),
  ('estimated', 'lajesfit:feijao-tropeiro', 'Feijao tropeiro', 'Preparacoes simples', 205, 10.0, 23.0, 8.0, 7.5, ARRAY['tropeiro']),
  ('estimated', 'lajesfit:cuscuz-com-ovo', 'Cuscuz com ovo', 'Preparacoes simples', 150, 6.0, 22.0, 4.2, 1.8, ARRAY['cuscuz ovo']),
  ('estimated', 'lajesfit:tapioca-com-queijo', 'Tapioca com queijo', 'Preparacoes simples', 260, 7.0, 43.0, 7.0, 0.5, ARRAY['beiju com queijo']),
  ('estimated', 'lajesfit:macarrao-alho-e-oleo', 'Macarrao ao alho e oleo', 'Preparacoes simples', 210, 5.2, 31.0, 7.2, 1.5, ARRAY['macarrao alho oleo']),
  ('estimated', 'lajesfit:frango-com-arroz', 'Frango com arroz', 'Preparacoes simples', 155, 13.0, 18.0, 3.2, 1.0, ARRAY['arroz com frango']),
  ('estimated', 'lajesfit:carne-moida-com-arroz', 'Carne moida com arroz', 'Preparacoes simples', 178, 12.0, 18.0, 6.0, 1.2, ARRAY['arroz com carne moida']),
  ('estimated', 'lajesfit:salada-simples', 'Salada simples', 'Saladas', 35, 1.2, 6.0, 0.8, 2.2, ARRAY['salada verde', 'salada de alface e tomate']),
  ('estimated', 'lajesfit:omelete-simples', 'Omelete simples', 'Preparacoes simples', 180, 12.0, 1.5, 13.0, 0, ARRAY['omelete', 'omeleta']),
  ('estimated', 'lajesfit:sopa-de-legumes', 'Sopa de legumes', 'Sopas e caldos', 55, 2.0, 9.5, 1.2, 2.0, ARRAY['sopa legumes']),
  ('estimated', 'lajesfit:pure-de-batata', 'Pure de batata', 'Preparacoes simples', 105, 1.8, 16.5, 3.8, 1.2, ARRAY['pure batata']),
  ('estimated', 'lajesfit:vitamina-de-banana', 'Vitamina de banana', 'Bebidas', 95, 3.0, 18.0, 1.7, 1.2, ARRAY['vitamina banana', 'banana com leite']),
  ('estimated', 'lajesfit:mingau-de-aveia', 'Mingau de aveia', 'Preparacoes simples', 110, 4.0, 18.0, 2.8, 2.0, ARRAY['mingau aveia']),
  ('estimated', 'lajesfit:lentilha-cozida', 'Lentilha cozida', 'Leguminosas e derivados', 93, 6.3, 16.3, 0.5, 7.9, ARRAY['lentilha'])
ON CONFLICT (source, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  kcal = EXCLUDED.kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  fiber_g = EXCLUDED.fiber_g,
  aliases = EXCLUDED.aliases;

CREATE TABLE IF NOT EXISTS public.food_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_query)
);

CREATE INDEX IF NOT EXISTS food_requests_user_id_idx ON public.food_requests (user_id);
CREATE INDEX IF NOT EXISTS food_requests_status_idx ON public.food_requests (status);

ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_requests_select_own" ON public.food_requests;
CREATE POLICY "food_requests_select_own"
  ON public.food_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_requests_insert_own" ON public.food_requests;
CREATE POLICY "food_requests_insert_own"
  ON public.food_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_requests_update_own_pending" ON public.food_requests;
CREATE POLICY "food_requests_update_own_pending"
  ON public.food_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP TRIGGER IF EXISTS food_requests_set_updated_at ON public.food_requests;
CREATE TRIGGER food_requests_set_updated_at
  BEFORE UPDATE ON public.food_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.food_requests TO authenticated;
GRANT ALL ON public.food_requests TO service_role;

NOTIFY pgrst, 'reload schema';
