
ALTER TABLE public.registros_rfid
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_registros_rfid_user_id ON public.registros_rfid(user_id);
CREATE INDEX IF NOT EXISTS idx_registros_rfid_tag_uid ON public.registros_rfid(tag_uid);

-- Tighten SELECT: only admins can list all; authenticated users can view their own linked tag
DROP POLICY IF EXISTS "public select registros_rfid" ON public.registros_rfid;

CREATE POLICY "admin select registros_rfid"
  ON public.registros_rfid FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = user_id);

-- Keep INSERT open for hardware (anon + authenticated)
-- (existing "public insert registros_rfid" policy stays)

-- Allow admins to delete and update
CREATE POLICY "admin delete registros_rfid"
  ON public.registros_rfid FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin update registros_rfid"
  ON public.registros_rfid FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
