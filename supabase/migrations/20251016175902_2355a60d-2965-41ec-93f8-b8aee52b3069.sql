-- Storage RLS policies for project-files bucket
CREATE POLICY "Project files select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' 
  AND can_read_project(path_project_id(name))
);

CREATE POLICY "Project files insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files'
  AND is_admin_project(path_project_id(name))
);

CREATE POLICY "Project files update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND is_admin_project(path_project_id(name))
);

CREATE POLICY "Project files delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files'
  AND is_admin_project(path_project_id(name))
);

-- Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS for message_reactions: can view if can view the message
CREATE POLICY "Reactions select"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
    AND (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = m.conversation_id
        AND (
          (c.type IN ('dm', 'group') AND EXISTS (
            SELECT 1 FROM public.conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.user_id = auth_uid()
          ))
          OR
          (c.type IN ('project', 'card') AND can_read_project(
            COALESCE(c.project_id, (SELECT project_id FROM public.cards WHERE id = c.card_id))
          ))
        )
      )
      OR is_superadmin(auth_uid())
    )
  )
);

-- Users can add/remove their own reactions
CREATE POLICY "Reactions insert own"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth_uid());

CREATE POLICY "Reactions delete own"
ON public.message_reactions FOR DELETE
TO authenticated
USING (user_id = auth_uid());

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_reply_to 
ON public.messages(reply_to) WHERE reply_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_reads_user_message 
ON public.message_reads(user_id, message_id);

CREATE INDEX IF NOT EXISTS idx_files_project_folder 
ON public.files(project_id, folder_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by 
ON public.files(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message 
ON public.message_reactions(message_id);