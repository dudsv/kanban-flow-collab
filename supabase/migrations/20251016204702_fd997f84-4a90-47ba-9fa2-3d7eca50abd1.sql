-- Criar tabela de convites de projeto
CREATE TABLE IF NOT EXISTS public.project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_project_invites_token ON public.project_invites(token);
CREATE INDEX idx_project_invites_email ON public.project_invites(email);
CREATE INDEX idx_project_invites_project ON public.project_invites(project_id);

-- RLS
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas admins do projeto podem ver convites
CREATE POLICY "Admins can view project invites"
ON public.project_invites
FOR SELECT
USING (is_admin_project(project_id));

CREATE POLICY "Admins can create project invites"
ON public.project_invites
FOR INSERT
WITH CHECK (is_admin_project(project_id));

-- Políticas públicas para validar token de convite
CREATE POLICY "Anyone can view invite by valid token"
ON public.project_invites
FOR SELECT
USING (token IS NOT NULL AND expires_at > now() AND accepted_at IS NULL);