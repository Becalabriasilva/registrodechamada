
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS cutoff_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS days_of_week int[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];
