import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [key: string]: Array<{
    user_id: string;
    online_at: string;
    name?: string;
    avatar_url?: string;
  }>;
}

export function usePresence(channelName: string, userId?: string, metadata?: any) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const presenceChannel = supabase.channel(channelName);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const users = new Map<string, any>();
        
        Object.values(state).forEach(presences => {
          presences.forEach(presence => {
            users.set(presence.user_id, presence);
          });
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          newPresences.forEach((presence: any) => {
            updated.set(presence.user_id, presence);
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          leftPresences.forEach((presence: any) => {
            updated.delete(presence.user_id);
          });
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...metadata,
          });
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [channelName, userId, metadata]);

  return { onlineUsers, channel };
}
