
-- 1. Restrict professor access to profiles (CPF/email exposure)
DROP POLICY IF EXISTS "users view own profile" ON public.profiles;
CREATE POLICY "users view own profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Safe directory function for professors to look up students in their scope
CREATE OR REPLACE FUNCTION public.get_students_in_scope()
RETURNS TABLE(id uuid, full_name text, matricula text, turma text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.matricula, p.turma
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
     OR (public.has_role(auth.uid(), 'professor'::app_role)
         AND public.professor_has_scope(auth.uid(), p.turma, NULL::uuid))
$$;
REVOKE EXECUTE ON FUNCTION public.get_students_in_scope() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_students_in_scope() TO authenticated;

-- 2. Lock down trigger/utility SECURITY DEFINER functions from direct call
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Realtime: restrict subscriptions to sensitive topics
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restrict sensitive realtime topics" ON realtime.messages;
CREATE POLICY "restrict sensitive realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE realtime.topic()
    WHEN 'tag_scans' THEN public.has_role(auth.uid(), 'admin'::app_role)
    WHEN 'justifications' THEN public.has_role(auth.uid(), 'admin'::app_role)
    ELSE true
  END
);
