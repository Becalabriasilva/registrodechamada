
-- 1) Professor assignments
CREATE TABLE IF NOT EXISTS public.professor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  turma text,
  room_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.professor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage professor_assignments"
ON public.professor_assignments FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "professor view own assignments"
ON public.professor_assignments FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) Tag scans
CREATE TABLE IF NOT EXISTS public.tag_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_uid text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  consumed boolean NOT NULL DEFAULT false
);
ALTER TABLE public.tag_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read tag_scans"
ON public.tag_scans FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update tag_scans"
ON public.tag_scans FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Justifications reviewed_at
ALTER TABLE public.justifications
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 4) Helper: is_professor_of (returns true if the professor user has access to a turma or room)
CREATE OR REPLACE FUNCTION public.professor_has_scope(_user_id uuid, _turma text, _room_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.professor_assignments pa
    WHERE pa.user_id = _user_id
      AND (
        (pa.turma IS NOT NULL AND _turma IS NOT NULL AND pa.turma = _turma)
        OR (pa.room_id IS NOT NULL AND _room_id IS NOT NULL AND pa.room_id = _room_id)
      )
  )
$$;

-- 5) Update RLS to include professor scope

-- profiles: professor sees students in their turma
DROP POLICY IF EXISTS "users view own profile" ON public.profiles;
CREATE POLICY "users view own profile"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'professor') AND public.professor_has_scope(auth.uid(), turma, NULL))
);

-- attendance_logs: professor sees logs from their turma OR room
DROP POLICY IF EXISTS "view own logs" ON public.attendance_logs;
CREATE POLICY "view own logs"
ON public.attendance_logs FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'professor')
    AND public.professor_has_scope(
      auth.uid(),
      (SELECT p.turma FROM public.profiles p WHERE p.id = attendance_logs.user_id),
      attendance_logs.room_id
    )
  )
);

-- justifications: professor sees from their turma
DROP POLICY IF EXISTS "view own justifications" ON public.justifications;
CREATE POLICY "view own justifications"
ON public.justifications FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'professor')
    AND public.professor_has_scope(
      auth.uid(),
      (SELECT p.turma FROM public.profiles p WHERE p.id = justifications.user_id),
      NULL
    )
  )
);

-- 6) Realtime
ALTER TABLE public.tag_scans REPLICA IDENTITY FULL;
ALTER TABLE public.justifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='tag_scans';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tag_scans';
  END IF;
END $$;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='justifications';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.justifications';
  END IF;
END $$;
