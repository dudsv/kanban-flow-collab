import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  type: 'dm' | 'group' | 'project' | 'card';
  title: string | null;
  project_id: string | null;
  card_id: string | null;
  created_at: string;
  created_by: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
}

export function useConversations(projectId?: string, cardId?: string) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadConversations = useCallback(async () => {
    let query = supabase
      .from('conversations')
      .select('*');

    if (projectId) query = query.eq('project_id', projectId);
    if (cardId) query = query.eq('card_id', cardId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading conversations', description: error.message, variant: 'destructive' });
      return [];
    }
    return data as Conversation[];
  }, [toast, projectId, cardId]);

  const createConversation = useCallback(async (
    type: 'dm' | 'group' | 'project' | 'card',
    options: { title?: string; projectId?: string; cardId?: string; memberIds?: string[] }
  ) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert([{
          type,
          title: options.title,
          project_id: options.projectId,
          card_id: options.cardId,
          created_by: user.id
        }])
        .select()
        .single();

      if (convError) throw convError;

      // Add members for DM/Group conversations
      if ((type === 'dm' || type === 'group') && options.memberIds) {
        const { error: membersError } = await supabase
          .from('conversation_members')
          .insert(
            options.memberIds.map(userId => ({
              conversation_id: conversation.id,
              user_id: userId
            }))
          );

        if (membersError) throw membersError;
      }

      toast({ title: 'Conversation created', description: 'New conversation started' });
      return conversation as Conversation;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadMembers = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('conversation_members')
      .select('*, profiles(*)')
      .eq('conversation_id', conversationId);

    if (error) {
      toast({ title: 'Error loading members', description: error.message, variant: 'destructive' });
      return [];
    }
    return data;
  }, [toast]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel('conversations-list')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations' 
      }, () => {
        // Trigger reload in parent component
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return {
    loading,
    loadConversations,
    createConversation,
    loadMembers
  };
}
