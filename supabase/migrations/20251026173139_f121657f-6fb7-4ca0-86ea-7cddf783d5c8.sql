-- Fix log_audit function to handle tables without id column (like card_assignees, card_tags)
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id uuid;
  v_entity_id uuid;
  v_diff jsonb;
BEGIN
  -- Determinar entity_id baseado na estrutura da tabela
  -- Para tabelas de junção sem id, usar card_id como referência
  v_entity_id := CASE
    WHEN TG_TABLE_NAME IN ('card_assignees', 'card_tags') THEN
      COALESCE(NEW.card_id, OLD.card_id)
    WHEN TG_TABLE_NAME = 'comment_mentions' THEN
      COALESCE(NEW.comment_id, OLD.comment_id)
    WHEN TG_TABLE_NAME = 'conversation_members' THEN
      COALESCE(NEW.conversation_id, OLD.conversation_id)
    ELSE
      COALESCE(NEW.id, OLD.id)
  END;

  -- Determinar diff baseado na operação
  v_diff := CASE
    WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) - 'created_at' - 'updated_at'
    WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) - 'created_at' - 'updated_at'
    WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) - 'created_at' - 'updated_at'
    ELSE NULL
  END;

  -- Determinar project_id baseado na tabela
  IF TG_TABLE_NAME = 'cards' THEN
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  ELSIF TG_TABLE_NAME IN ('comments','card_assignees','card_tags','checklists') THEN
    v_project_id := (
      SELECT c.project_id
      FROM public.cards c
      WHERE c.id = COALESCE(NEW.card_id, OLD.card_id)
      LIMIT 1
    );

  ELSIF TG_TABLE_NAME = 'checklist_items' THEN
    v_project_id := (
      SELECT c.project_id
      FROM public.cards c
      JOIN public.checklists cl ON cl.card_id = c.id
      WHERE cl.id = COALESCE(NEW.checklist_id, OLD.checklist_id)
      LIMIT 1
    );

  ELSIF TG_TABLE_NAME = 'comment_mentions' THEN
    v_project_id := (
      SELECT c.project_id
      FROM public.cards c
      JOIN public.comments cm ON cm.card_id = c.id
      WHERE cm.id = COALESCE(NEW.comment_id, OLD.comment_id)
      LIMIT 1
    );

  ELSIF TG_TABLE_NAME = 'files' THEN
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);

  ELSIF TG_TABLE_NAME = 'messages' THEN
    v_project_id := (
      SELECT COALESCE(
        c.project_id,
        (SELECT ca.project_id FROM public.cards ca WHERE ca.id = c.card_id)
      )
      FROM public.conversations c
      WHERE c.id = COALESCE(NEW.conversation_id, OLD.conversation_id)
      LIMIT 1
    );

  ELSE
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  END IF;

  INSERT INTO public.audit_log (actor_id, entity, entity_id, action, diff, project_id)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME::text,
    v_entity_id,
    TG_OP::text,
    v_diff,
    v_project_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;