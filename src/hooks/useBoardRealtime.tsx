import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useBoardRealtime = (projectId: string, onUpdate: () => void) => {
  useEffect(() => {
    const channels = [
      // Cards channel
      supabase
        .channel(`cards:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cards',
            filter: `project_id=eq.${projectId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Card change:', payload);
            onUpdate();
          }
        )
        .subscribe(),

      // Columns channel
      supabase
        .channel(`columns:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'columns',
            filter: `project_id=eq.${projectId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Column change:', payload);
            onUpdate();
          }
        )
        .subscribe(),

      // Tags channel
      supabase
        .channel(`tags:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tags',
            filter: `project_id=eq.${projectId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Tag change:', payload);
            onUpdate();
          }
        )
        .subscribe(),

      // Comments channel
      supabase
        .channel(`comments:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Comment change:', payload);
            onUpdate();
          }
        )
        .subscribe(),

      // Card assignees channel
      supabase
        .channel(`card_assignees:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'card_assignees'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Assignee change:', payload);
            onUpdate();
          }
        )
        .subscribe(),

      // Checklists channel
      supabase
        .channel(`checklists:${projectId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'checklists'
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Checklist change:', payload);
            onUpdate();
          }
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [projectId, onUpdate]);
};