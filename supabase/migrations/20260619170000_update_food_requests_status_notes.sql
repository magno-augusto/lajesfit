ALTER TABLE public.food_requests
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.food_requests
  DROP CONSTRAINT IF EXISTS food_requests_status_check;

ALTER TABLE public.food_requests
  ADD CONSTRAINT food_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'merged'));

NOTIFY pgrst, 'reload schema';
