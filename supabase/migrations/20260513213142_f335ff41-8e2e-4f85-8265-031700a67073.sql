
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'aluno');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  matricula TEXT UNIQUE,
  cpf TEXT UNIQUE,
  turma TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_uid TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.event_type AS ENUM ('entrada', 'saida');

CREATE TABLE public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  event_type event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.justification_status AS ENUM ('pendente', 'aprovado', 'rejeitado');

CREATE TABLE public.justifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  file_path TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status justification_status NOT NULL DEFAULT 'pendente',
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  quantity INT NOT NULL DEFAULT 0,
  min_quantity INT NOT NULL DEFAULT 0,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = id);
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- user_roles policies
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- rooms
CREATE POLICY "anyone auth view rooms" ON public.rooms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage rooms" ON public.rooms FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- tags
CREATE POLICY "view own tag" ON public.tags FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage tags" ON public.tags FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- attendance_logs
CREATE POLICY "view own logs" ON public.attendance_logs FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert logs" ON public.attendance_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- justifications
CREATE POLICY "view own justifications" ON public.justifications FOR SELECT USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own justification" ON public.justifications FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "admin update justifications" ON public.justifications FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete justifications" ON public.justifications FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- inventory
CREATE POLICY "auth view inventory" ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage inventory" ON public.inventory FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, matricula, cpf, turma)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.email,
    NEW.raw_user_meta_data->>'matricula',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'turma'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluno');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER inventory_touch BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for justification files
INSERT INTO storage.buckets (id, name, public) VALUES ('justifications','justifications', false);

CREATE POLICY "users upload own justifications" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id='justifications' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "users read own justifications" ON storage.objects FOR SELECT USING (
  bucket_id='justifications' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "admin manage justifications storage" ON storage.objects FOR ALL USING (
  bucket_id='justifications' AND public.has_role(auth.uid(),'admin')
) WITH CHECK (bucket_id='justifications' AND public.has_role(auth.uid(),'admin'));
