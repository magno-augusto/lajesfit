-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================
-- POSTS
-- =========================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_select_all_auth" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX posts_user_created_idx ON public.posts(user_id, created_at DESC);
CREATE INDEX posts_created_idx ON public.posts(created_at DESC);

-- =========================
-- POST LIKES
-- =========================
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_all_auth" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes_insert_own" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- POST COMMENTS
-- =========================
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_all_auth" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX comments_post_idx ON public.post_comments(post_id, created_at);

-- =========================
-- FOLLOWS
-- =========================
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_all_auth" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- =========================
-- WORKOUTS
-- =========================
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT,
  notes TEXT,
  duration_seconds INT,
  distance_meters NUMERIC,
  calories INT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts_select_all_auth" ON public.workouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "workouts_insert_own" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_update_own" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_delete_own" ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX workouts_user_performed_idx ON public.workouts(user_id, performed_at DESC);

-- =========================
-- TACO FOODS (public food database)
-- =========================
CREATE TABLE public.taco_foods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  kcal NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0
);
GRANT SELECT ON public.taco_foods TO authenticated;
GRANT ALL ON public.taco_foods TO service_role;
ALTER TABLE public.taco_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taco_select_all_auth" ON public.taco_foods FOR SELECT TO authenticated USING (true);
CREATE INDEX taco_name_idx ON public.taco_foods USING gin (to_tsvector('portuguese', name));

-- Seed common foods (per 100g)
INSERT INTO public.taco_foods (name, category, kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES
('Arroz branco cozido', 'Cereais', 128, 2.5, 28.1, 0.2, 1.6),
('Arroz integral cozido', 'Cereais', 124, 2.6, 25.8, 1.0, 2.7),
('Feijão preto cozido', 'Leguminosas', 77, 4.5, 14.0, 0.5, 8.4),
('Feijão carioca cozido', 'Leguminosas', 76, 4.8, 13.6, 0.5, 8.5),
('Macarrão cozido', 'Cereais', 158, 5.8, 30.9, 1.3, 1.6),
('Pão francês', 'Pães', 300, 8.0, 58.6, 3.1, 2.3),
('Pão integral', 'Pães', 253, 9.4, 49.9, 3.7, 6.9),
('Tapioca', 'Cereais', 240, 0.0, 59.6, 0.0, 0.5),
('Aveia em flocos', 'Cereais', 394, 13.9, 66.6, 8.5, 9.1),
('Cuscuz de milho', 'Cereais', 113, 2.2, 25.1, 0.3, 1.7),
('Frango grelhado peito', 'Carnes', 159, 32.0, 0.0, 3.0, 0.0),
('Frango grelhado coxa', 'Carnes', 215, 27.5, 0.0, 11.0, 0.0),
('Carne bovina patinho grelhado', 'Carnes', 219, 35.9, 0.0, 7.3, 0.0),
('Carne bovina coxão mole cozido', 'Carnes', 197, 31.9, 0.0, 6.8, 0.0),
('Carne moída refogada', 'Carnes', 212, 27.4, 0.0, 11.0, 0.0),
('Peixe tilápia grelhada', 'Pescados', 128, 26.3, 0.0, 1.7, 0.0),
('Atum em conserva', 'Pescados', 116, 25.7, 0.0, 1.2, 0.0),
('Camarão cozido', 'Pescados', 90, 19.4, 0.0, 0.9, 0.0),
('Ovo de galinha cozido', 'Ovos', 146, 13.3, 0.6, 9.5, 0.0),
('Ovo de galinha frito', 'Ovos', 240, 13.6, 0.7, 19.8, 0.0),
('Leite integral', 'Laticínios', 61, 2.9, 4.3, 3.2, 0.0),
('Leite desnatado', 'Laticínios', 34, 3.4, 4.9, 0.1, 0.0),
('Iogurte natural', 'Laticínios', 51, 4.1, 1.9, 3.0, 0.0),
('Queijo minas frescal', 'Laticínios', 264, 17.4, 3.2, 20.2, 0.0),
('Queijo mussarela', 'Laticínios', 330, 22.6, 3.0, 25.0, 0.0),
('Requeijão cremoso', 'Laticínios', 264, 9.6, 3.0, 23.3, 0.0),
('Banana prata', 'Frutas', 98, 1.3, 26.0, 0.1, 2.0),
('Banana nanica', 'Frutas', 92, 1.4, 23.8, 0.1, 1.9),
('Maçã com casca', 'Frutas', 56, 0.3, 15.2, 0.0, 1.3),
('Laranja pera', 'Frutas', 37, 1.0, 8.9, 0.1, 0.8),
('Mamão papaia', 'Frutas', 40, 0.5, 10.4, 0.1, 1.0),
('Manga palmer', 'Frutas', 64, 0.4, 16.7, 0.2, 2.1),
('Abacate', 'Frutas', 96, 1.2, 6.0, 8.4, 6.3),
('Morango', 'Frutas', 30, 0.9, 6.8, 0.3, 1.7),
('Melancia', 'Frutas', 33, 0.9, 8.1, 0.1, 0.1),
('Alface', 'Verduras', 11, 1.4, 1.7, 0.2, 1.8),
('Tomate', 'Legumes', 15, 1.1, 3.1, 0.2, 1.2),
('Cenoura crua', 'Legumes', 34, 1.3, 7.7, 0.2, 3.2),
('Brócolis cozido', 'Verduras', 25, 2.1, 4.0, 0.4, 3.4),
('Couve refogada', 'Verduras', 90, 1.8, 4.5, 7.3, 4.2),
('Batata inglesa cozida', 'Tubérculos', 52, 1.2, 11.9, 0.0, 1.3),
('Batata doce cozida', 'Tubérculos', 77, 0.6, 18.4, 0.1, 2.2),
('Mandioca cozida', 'Tubérculos', 125, 0.6, 30.1, 0.3, 1.6),
('Castanha do Pará', 'Oleaginosas', 643, 14.5, 15.1, 63.5, 7.9),
('Amendoim torrado', 'Oleaginosas', 544, 22.5, 20.3, 43.9, 8.0),
('Azeite de oliva', 'Óleos', 884, 0.0, 0.0, 100.0, 0.0),
('Manteiga', 'Gorduras', 726, 0.4, 0.1, 81.8, 0.0),
('Açúcar refinado', 'Açúcares', 387, 0.0, 99.5, 0.0, 0.0),
('Mel', 'Açúcares', 309, 0.4, 84.0, 0.0, 0.0),
('Chocolate ao leite', 'Doces', 540, 6.7, 60.0, 30.0, 1.4);

-- =========================
-- DIET ENTRIES (private)
-- =========================
CREATE TABLE public.diet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id INT REFERENCES public.taco_foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  grams NUMERIC NOT NULL,
  kcal NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  meal TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_entries TO authenticated;
GRANT ALL ON public.diet_entries TO service_role;
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diet_own_all" ON public.diet_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX diet_user_consumed_idx ON public.diet_entries(user_id, consumed_at DESC);

-- =========================
-- Updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Auto-create profile on signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  n INT := 0;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user');
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    n := n + 1;
    final_username := base_username || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();