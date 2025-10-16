import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFilesRealtime(projectId: string, onUpdate: () => void) {
  useEffect(() => {
    const filesChannel = supabase
      .channel('files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `project_id=eq.${projectId}`
        },
        () => onUpdate()
      )
      .subscribe();

    const foldersChannel = supabase
      .channel('folders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `project_id=eq.${projectId}`
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(filesChannel);
      supabase.removeChannel(foldersChannel);
    };
  }, [projectId, onUpdate]);
}
