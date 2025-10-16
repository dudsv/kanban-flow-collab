-- FASE 5: Triggers de Auditoria Automática

-- Função genérica de log de auditoria
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_log(actor_id, entity, entity_id, action, diff, project_id)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME::text,
    COALESCE(NEW.id, OLD.id),
    TG_OP::text,
    CASE
      WHEN TG_OP='UPDATE' THEN to_jsonb(NEW) - 'updated_at' - 'created_at'
      WHEN TG_OP='INSERT' THEN to_jsonb(NEW) - 'updated_at' - 'created_at'
      WHEN TG_OP='DELETE' THEN to_jsonb(OLD) - 'updated_at' - 'created_at'
    END,
    COALESCE(
      NEW.project_id,
      (SELECT project_id FROM cards WHERE id = COALESCE(NEW.card_id, OLD.card_id)),
      OLD.project_id
    )
  );
  RETURN COALESCE(NEW, OLD);
END $$;

-- Aplicar trigger em cards
DROP TRIGGER IF EXISTS tg_audit_cards ON cards;
CREATE TRIGGER tg_audit_cards 
  AFTER INSERT OR UPDATE OR DELETE ON cards
  FOR EACH ROW EXECUTE PROCEDURE log_audit();

-- Aplicar trigger em comments
DROP TRIGGER IF EXISTS tg_audit_comments ON comments;
CREATE TRIGGER tg_audit_comments 
  AFTER INSERT OR UPDATE OR DELETE ON comments
  FOR EACH ROW EXECUTE PROCEDURE log_audit();

-- Aplicar trigger em card_assignees
DROP TRIGGER IF EXISTS tg_audit_card_assignees ON card_assignees;
CREATE TRIGGER tg_audit_card_assignees 
  AFTER INSERT OR UPDATE OR DELETE ON card_assignees
  FOR EACH ROW EXECUTE PROCEDURE log_audit();

-- Aplicar trigger em card_tags
DROP TRIGGER IF EXISTS tg_audit_card_tags ON card_tags;
CREATE TRIGGER tg_audit_card_tags 
  AFTER INSERT OR UPDATE OR DELETE ON card_tags
  FOR EACH ROW EXECUTE PROCEDURE log_audit();

-- Aplicar trigger em files
DROP TRIGGER IF EXISTS tg_audit_files ON files;
CREATE TRIGGER tg_audit_files 
  AFTER INSERT OR UPDATE OR DELETE ON files
  FOR EACH ROW EXECUTE PROCEDURE log_audit();