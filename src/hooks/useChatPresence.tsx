import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TypingUser {
  userId: string;
  typing: boolean;
}

export function useChatPresence(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId) return;

    // Typing indicator per conversation
    const typingChannel = supabase.channel(`typing-${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const typing = Object.values(state)
          .flat()
          .map((presence: any) => ({
            userId: presence.userId,
            typing: presence.typing
          }));
        setTypingUsers(typing.filter(u => u.typing));
      })
      .subscribe();

    // Global online/offline presence
    const peopleChannel = supabase.channel('people')
      .on('presence', { event: 'sync' }, () => {
        const state = peopleChannel.presenceState();
        const online = Object.keys(state);
        setOnlineUsers(online);
      })
      .subscribe();

    // Track own presence
    peopleChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await peopleChannel.track({ userId: user.id, online: true });
        }
      }
    });

    return () => {
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(peopleChannel);
    };
  }, [conversationId]);

  const setTyping = async (typing: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    await channel.track({ userId: user.id, typing });
  };

  return {
    typingUsers,
    onlineUsers,
    setTyping
  };
}
