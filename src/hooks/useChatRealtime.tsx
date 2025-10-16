import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useChatRealtime(conversationId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!conversationId) return;

    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => onUpdate()
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        () => onUpdate()
      )
      .subscribe();

    const readsChannel = supabase
      .channel(`reads-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reads'
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(readsChannel);
    };
  }, [conversationId, onUpdate]);
}
