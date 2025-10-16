import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  author_id: string;
  body: string | null;
  file_id: string | null;
  reply_to: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export function useMessages(conversationId: string) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadMessages = useCallback(async (limit = 50, before?: string) => {
    let query = supabase
      .from('messages')
      .select('*, profiles(*)')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error loading messages', description: error.message, variant: 'destructive' });
      return [];
    }
    return data as Message[];
  }, [conversationId, toast]);

  const sendMessage = useCallback(async (body: string, replyTo?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          author_id: user.id,
          body,
          reply_to: replyTo
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    } catch (error: any) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversationId, toast]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('message_reactions')
      .insert([{ message_id: messageId, user_id: user.id, emoji }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, [toast]);

  const removeReaction = useCallback(async (reactionId: string) => {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', reactionId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  }, [toast]);

  const markAsRead = useCallback(async (messageId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('message_reads')
      .upsert([{ message_id: messageId, user_id: user.id }], { onConflict: 'user_id,message_id' });

    if (error) {
      console.error('Mark as read error:', error);
    }
  }, []);

  const loadReactions = useCallback(async (messageId: string) => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);

    if (error) {
      console.error('Load reactions error:', error);
      return [];
    }
    return data as MessageReaction[];
  }, []);

  return {
    loading,
    loadMessages,
    sendMessage,
    addReaction,
    removeReaction,
    markAsRead,
    loadReactions
  };
}
