-- Corrigir última função sem search_path (seed_project_defaults)

CREATE OR REPLACE FUNCTION public.seed_project_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- criador vira owner
  INSERT INTO project_members(project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');

  -- colunas padrão
  WITH base(ord, name) AS (
    VALUES
      (1,'To-Do'),
      (2,'In progress'),
      (3,'Development'),
      (4,'Validation'),
      (5,'Prod'),
      (6,'Done')
  )
  INSERT INTO columns(id, project_id, name, "order")
  SELECT gen_random_uuid(), NEW.id, name, ord
  FROM base;

  -- tags sugeridas
  INSERT INTO tags(project_id, name, color) VALUES
    (NEW.id,'bug','#ef4444'),
    (NEW.id,'feature','#10b981'),
    (NEW.id,'research','#3b82f6')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;