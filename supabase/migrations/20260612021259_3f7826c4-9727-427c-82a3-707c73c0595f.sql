
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  n INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user'
  );
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
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', final_username),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FOLLOWS
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows visible to authenticated" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own follows" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users delete own follows" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- POSTS
CREATE TYPE public.post_type AS ENUM ('general', 'workout', 'diet');
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.post_type NOT NULL DEFAULT 'general',
  content TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  workout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_user ON public.posts(user_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POST LIKES
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by authenticated" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own like" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own like" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- POST COMMENTS
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON public.post_comments(post_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by authenticated" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- WORKOUTS
CREATE TYPE public.workout_source AS ENUM ('manual', 'strava');
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.workout_source NOT NULL DEFAULT 'manual',
  strava_activity_id BIGINT UNIQUE,
  activity_type TEXT NOT NULL DEFAULT 'Run',
  name TEXT,
  distance_meters NUMERIC,
  duration_seconds INTEGER,
  elevation_gain_meters NUMERIC,
  calories NUMERIC,
  avg_heart_rate NUMERIC,
  started_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workouts_user ON public.workouts(user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workouts viewable by authenticated" ON public.workouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own workouts" ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workouts" ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own workouts" ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- STRAVA TOKENS
CREATE TABLE public.strava_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id BIGINT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strava_tokens TO authenticated;
GRANT ALL ON public.strava_tokens TO service_role;
ALTER TABLE public.strava_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own strava tokens" ON public.strava_tokens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TACO FOODS
CREATE TABLE public.taco_foods (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  energy_kcal NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  sodium_mg NUMERIC NOT NULL DEFAULT 0
);
CREATE INDEX idx_taco_name ON public.taco_foods USING gin (to_tsvector('portuguese', name));
GRANT SELECT ON public.taco_foods TO authenticated;
GRANT ALL ON public.taco_foods TO service_role;
ALTER TABLE public.taco_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Taco foods viewable by authenticated" ON public.taco_foods FOR SELECT TO authenticated USING (true);

-- DIET ENTRIES
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'snack', 'dinner');
CREATE TABLE public.diet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id INTEGER NOT NULL REFERENCES public.taco_foods(id),
  grams NUMERIC NOT NULL,
  meal public.meal_type NOT NULL DEFAULT 'breakfast',
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_diet_user_date ON public.diet_entries(user_id, consumed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_entries TO authenticated;
GRANT ALL ON public.diet_entries TO service_role;
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own diet" ON public.diet_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  distance_km NUMERIC,
  max_participants INTEGER,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_date ON public.events(event_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator updates events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = creator_id);
CREATE POLICY "Creator deletes events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- EVENT PARTICIPANTS
CREATE TABLE public.event_participants (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_participants TO authenticated;
GRANT ALL ON public.event_participants TO service_role;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable by authenticated" ON public.event_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join events" ON public.event_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave events" ON public.event_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);
