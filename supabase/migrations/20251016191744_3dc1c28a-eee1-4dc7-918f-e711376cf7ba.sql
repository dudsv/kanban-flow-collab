-- Add card_id to files table for card attachments
ALTER TABLE public.files 
ADD COLUMN card_id uuid REFERENCES public.cards(id) ON DELETE CASCADE;

-- Update RLS policies for files to support card_id
DROP POLICY IF EXISTS "files select" ON public.files;
CREATE POLICY "files select" ON public.files
FOR SELECT USING (
  can_read_project(project_id) 
  OR (card_id IS NOT NULL AND can_read_project((
    SELECT project_id FROM cards WHERE id = card_id
  )))
);

DROP POLICY IF EXISTS "files write" ON public.files;
CREATE POLICY "files write" ON public.files
FOR ALL USING (
  is_admin_project(project_id)
  OR (card_id IS NOT NULL AND can_read_project((
    SELECT project_id FROM cards WHERE id = card_id
  )))
)
WITH CHECK (
  is_admin_project(project_id)
  OR (card_id IS NOT NULL AND can_read_project((
    SELECT project_id FROM cards WHERE id = card_id
  )))
);