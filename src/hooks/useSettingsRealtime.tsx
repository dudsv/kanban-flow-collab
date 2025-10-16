import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSettingsRealtime(projectId: string, onUpdate: () => void) {
  useEffect(() => {
    const membersChannel = supabase
      .channel('project-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    const tagsChannel = supabase
      .channel('tags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tags',
          filter: `project_id=eq.${projectId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    const columnsChannel = supabase
      .channel('columns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `project_id=eq.${projectId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(tagsChannel);
      supabase.removeChannel(columnsChannel);
    };
  }, [projectId, onUpdate]);
}
