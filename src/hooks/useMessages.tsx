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
      .select(`
        *,
        author:profiles!messages_author_id_fkey(name, avatar_url, email),
        files(*),
        message_reactions(*),
        message_reads(*)
      `)
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
    return data as any[];
  }, [conversationId, toast]);

  const sendMessage = useCallback(async (body: string, file?: File, replyTo?: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1) Insert message
      const { data: msg, error: msgError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          author_id: user.id,
          body,
          reply_to: replyTo
        }])
        .select('*, author:profiles!messages_author_id_fkey(name, avatar_url, email)')
        .single();

      if (msgError) throw msgError;

      // 2) Upload file if provided
      if (file) {
        // Get project_id from conversation
        const { data: conv } = await supabase
          .from('conversations')
          .select('project_id, card_id')
          .eq('id', conversationId)
          .single();

        let projectId = conv?.project_id;

        // If card conversation, get project_id from card
        if (!projectId && conv?.card_id) {
          const { data: card } = await supabase
            .from('cards')
            .select('project_id')
            .eq('id', conv.card_id)
            .single();
          projectId = card?.project_id;
        }

        if (!projectId) throw new Error('Cannot determine project_id for file upload');

        // Upload to storage: {projectId}/chat/{conversationId}/{uuid}-{filename}
        const filePath = `${projectId}/chat/${conversationId}/${crypto.randomUUID()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save to files table
        const { error: fileInsertError } = await supabase
          .from('files')
          .insert({
            project_id: projectId,
            message_id: msg.id,
            name: file.name,
            url: filePath,
            mime_type: file.type,
            size_bytes: file.size,
            uploaded_by: user.id
          });

        if (fileInsertError) throw fileInsertError;
      }

      return msg as any;
    } catch (error: any) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversationId, toast]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return false;
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('message_reactions')
        .insert([{ message_id: messageId, user_id: user.id, emoji }]);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return false;
      }
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


  return {
    loading,
    loadMessages,
    sendMessage,
    toggleReaction,
    markAsRead
  };
}
