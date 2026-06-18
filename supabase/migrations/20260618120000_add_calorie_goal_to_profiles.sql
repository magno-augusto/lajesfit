ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calorie_goal INT,
  ADD COLUMN IF NOT EXISTS goal_sex TEXT CHECK (goal_sex IN ('female', 'male')),
  ADD COLUMN IF NOT EXISTS goal_age INT,
  ADD COLUMN IF NOT EXISTS goal_weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS goal_height_cm INT,
  ADD COLUMN IF NOT EXISTS goal_activity_level TEXT CHECK (
    goal_activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')
  );
