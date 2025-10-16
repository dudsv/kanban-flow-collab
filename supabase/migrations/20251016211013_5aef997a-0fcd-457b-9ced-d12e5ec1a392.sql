-- FASE 4: Adicionar coluna email em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text UNIQUE;

-- Criar índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Popular emails existentes do auth.users (one-time migration)
UPDATE public.profiles p
SET email = (
  SELECT email FROM auth.users u WHERE u.id = p.id
)
WHERE p.email IS NULL;

-- Atualizar trigger handle_new_user para incluir email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$;