-- Corrigir funções sem search_path definido (security warnings)

-- 1. can_read_project
CREATE OR REPLACE FUNCTION public.can_read_project(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_superadmin(auth_uid())
    OR EXISTS(SELECT 1 FROM projects p WHERE p.id = pid AND (p.visibility = 'public' OR p.owner_id = auth_uid()))
    OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id = pid AND pm.user_id = auth_uid());
$$;

-- 2. is_admin_project
CREATE OR REPLACE FUNCTION public.is_admin_project(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_superadmin(auth_uid())
    OR EXISTS(SELECT 1 FROM projects p WHERE p.id = pid AND p.owner_id = auth_uid())
    OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id = pid AND pm.user_id = auth_uid() AND pm.role IN ('owner','admin'));
$$;

-- 3. path_project_id
CREATE OR REPLACE FUNCTION public.path_project_id(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(split_part(path, '/', 1), '')::uuid
$$;

-- 4. auth_uid (já deve existir, mas vou garantir que tenha search_path)
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    auth.uid(),
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  )
$$;