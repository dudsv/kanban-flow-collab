-- FASE 3: Índices de performance para notificações e chat

-- Acelerar busca de notificações não lidas por usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, read_at) 
WHERE read_at IS NULL;

-- Acelerar busca de arquivos anexados a mensagens
CREATE INDEX IF NOT EXISTS idx_files_message_id 
ON public.files(message_id) 
WHERE message_id IS NOT NULL;

-- Acelerar busca de mensagens por conversa (já existe order by created_at)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC) 
WHERE deleted_at IS NULL;