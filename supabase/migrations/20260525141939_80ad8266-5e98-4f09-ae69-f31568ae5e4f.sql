
CREATE TABLE IF NOT EXISTS public.registros_rfid (
  id BIGSERIAL PRIMARY KEY,
  tag_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registros_rfid_created_at ON public.registros_rfid (created_at DESC);

ALTER TABLE public.registros_rfid ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert registros_rfid" ON public.registros_rfid;
DROP POLICY IF EXISTS "public select registros_rfid" ON public.registros_rfid;

CREATE POLICY "public insert registros_rfid"
ON public.registros_rfid FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "public select registros_rfid"
ON public.registros_rfid FOR SELECT
TO anon, authenticated
USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.registros_rfid;
