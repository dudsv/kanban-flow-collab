-- Drop existing problematic policies
DROP POLICY IF EXISTS "members select scoped" ON public.project_members;
DROP POLICY IF EXISTS "members upsert by owner/admin/super" ON public.project_members;

-- Create security definer function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(pid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = pid AND user_id = uid
  )
$$;

-- Create security definer function to check if user is project admin/owner
CREATE OR REPLACE FUNCTION public.is_project_admin_member(pid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = pid 
      AND user_id = uid 
      AND role IN ('owner', 'admin')
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "members select scoped" ON public.project_members
FOR SELECT USING (
  is_superadmin(auth_uid()) 
  OR is_project_member(project_id, auth_uid())
);

CREATE POLICY "members upsert by owner/admin/super" ON public.project_members
FOR ALL USING (
  is_superadmin(auth_uid()) 
  OR is_project_admin_member(project_id, auth_uid())
)
WITH CHECK (
  is_superadmin(auth_uid()) 
  OR is_project_admin_member(project_id, auth_uid())
);