import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useBoardRealtime = (projectId: string, onUpdate: () => void) => {
  const lastUpdateByUser = useRef<string | null>(null);

  // Function to track the last update by current user
  const trackUserUpdate = (cardId: string) => {
    lastUpdateByUser.current = cardId;
    // Clear after a short delay to allow for the realtime event
    setTimeout(() => {
      lastUpdateByUser.current = null;
    }, 1000);
  };

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
          async (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('Card change:', payload);
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            
            // Skip update if this change was made by the current user
            if (payload.new && payload.new.updated_by === currentUserId) {
              console.log('Skipping realtime update - change made by current user');
              return;
            }
            
            // Skip update if this is the same change we just made
            if (lastUpdateByUser.current === payload.new?.id) {
              console.log('Skipping realtime update - same change as last update');
              return;
            }
            
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
            // Não recarregar board - CommentsTab já tem optimistic UI
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
            // Não recarregar board - ChecklistTab já tem optimistic UI
          }
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [projectId, onUpdate]);

  return { trackUserUpdate };
};