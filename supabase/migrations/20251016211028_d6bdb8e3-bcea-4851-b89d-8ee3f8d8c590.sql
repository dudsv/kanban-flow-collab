-- FASE 5: Hardening de RLS - Files
-- Remover políticas antigas
DROP POLICY IF EXISTS "files select" ON public.files;
DROP POLICY IF EXISTS "files write" ON public.files;

-- Novas políticas simplificadas (project_id já está na linha)
CREATE POLICY "files select" ON public.files
FOR SELECT TO authenticated
USING (can_read_project(project_id));

CREATE POLICY "files write" ON public.files
FOR ALL TO authenticated
USING (is_admin_project(project_id))
WITH CHECK (is_admin_project(project_id));