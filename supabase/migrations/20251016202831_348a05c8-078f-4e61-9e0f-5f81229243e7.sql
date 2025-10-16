-- Corrigir função log_audit para lidar com todas as tabelas
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id uuid;
BEGIN
  -- Determinar project_id de forma condicional baseado na tabela
  v_project_id := CASE
    -- Tabelas com project_id direto
    WHEN TG_TABLE_NAME IN ('cards', 'projects', 'tags', 'columns', 'files', 'folders') THEN
      COALESCE(NEW.project_id, OLD.project_id)
    
    -- Tabelas relacionadas a cards (comments, checklists)
    WHEN TG_TABLE_NAME IN ('comments', 'checklists') THEN
      (SELECT project_id FROM cards WHERE id = COALESCE(NEW.card_id, OLD.card_id))
    
    -- Tabelas relacionadas a checklists (checklist_items)
    WHEN TG_TABLE_NAME = 'checklist_items' THEN
      (SELECT c.project_id FROM cards c
       JOIN checklists cl ON cl.card_id = c.id
       WHERE cl.id = COALESCE(NEW.checklist_id, OLD.checklist_id))
    
    -- Tabelas de junção card_* (card_assignees, card_tags)
    WHEN TG_TABLE_NAME LIKE 'card_%' THEN
      (SELECT project_id FROM cards WHERE id = COALESCE(NEW.card_id, OLD.card_id))
    
    -- Mensagens e conversas
    WHEN TG_TABLE_NAME = 'messages' THEN
      (SELECT COALESCE(c.project_id, (SELECT project_id FROM cards WHERE id = c.card_id))
       FROM conversations c WHERE c.id = COALESCE(NEW.conversation_id, OLD.conversation_id))
    
    ELSE NULL
  END;

  INSERT INTO audit_log(actor_id, entity, entity_id, action, diff, project_id)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME::text,
    COALESCE(NEW.id, OLD.id, NEW.card_id, OLD.card_id),
    TG_OP::text,
    CASE
      WHEN TG_OP='UPDATE' THEN to_jsonb(NEW) - 'updated_at' - 'created_at'
      WHEN TG_OP='INSERT' THEN to_jsonb(NEW) - 'updated_at' - 'created_at'
      WHEN TG_OP='DELETE' THEN to_jsonb(OLD) - 'updated_at' - 'created_at'
    END,
    v_project_id
  );
  
  RETURN COALESCE(NEW, OLD);
END $$;