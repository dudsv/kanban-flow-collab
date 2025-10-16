import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Column = Database['public']['Tables']['columns']['Row'];
type Card = Database['public']['Tables']['cards']['Row'];
type Tag = Database['public']['Tables']['tags']['Row'];

export interface BoardCard extends Card {
  assignees?: { user_id: string; profiles: { name: string; avatar_url: string | null } }[];
  tags?: { tag_id: string; tags: Tag }[];
  checklists?: { id: string; items: { done: boolean }[] }[];
  comments?: { id: string }[];
}

export interface BoardColumn extends Column {
  cards: BoardCard[];
}

export const useBoard = (projectId: string) => {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBoard = useCallback(async () => {
    try {
      setLoading(true);

      // Load columns
      const { data: columnsData, error: colError } = await supabase
        .from('columns')
        .select('*')
        .eq('project_id', projectId)
        .order('order');

      if (colError) throw colError;

      // Load cards with relations
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select(`
          *,
          assignees:card_assignees(user_id, profiles(name, avatar_url)),
          tags:card_tags(tag_id, tags(id, name, color)),
          checklists(id, items:checklist_items(done)),
          comments(id)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (cardsError) throw cardsError;

      // Load tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId);

      if (tagsError) throw tagsError;

      // Organize cards by column
      const columnsWithCards: BoardColumn[] = (columnsData || []).map(col => ({
        ...col,
        cards: (cardsData || []).filter(card => card.column_id === col.id) as BoardCard[]
      }));

      setColumns(columnsWithCards);
      setTags(tagsData || []);
    } catch (error) {
      console.error('Error loading board:', error);
      toast({
        title: 'Erro ao carregar board',
        description: 'Não foi possível carregar o board do projeto.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const moveCard = useCallback(async (cardId: string, targetColumnId: string, optimisticUpdate: () => void) => {
    optimisticUpdate();

    try {
      const { error } = await supabase
        .from('cards')
        .update({ column_id: targetColumnId, updated_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        entity: 'card',
        entity_id: cardId,
        action: 'move',
        project_id: projectId,
        actor_id: (await supabase.auth.getUser()).data.user?.id
      });
    } catch (error) {
      console.error('Error moving card:', error);
      toast({
        title: 'Erro ao mover card',
        description: 'Não foi possível mover o card. Recarregando...',
        variant: 'destructive'
      });
      loadBoard();
    }
  }, [projectId, loadBoard]);

  const createCard = useCallback(async (columnId: string, title: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('cards')
        .insert({
          project_id: projectId,
          column_id: columnId,
          title,
          created_by: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        entity: 'card',
        entity_id: data.id,
        action: 'create',
        project_id: projectId,
        actor_id: user.user.id
      });

      toast({
        title: 'Card criado',
        description: 'Novo card adicionado com sucesso.'
      });

      loadBoard();
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: 'Erro ao criar card',
        description: 'Não foi possível criar o card.',
        variant: 'destructive'
      });
    }
  }, [projectId, loadBoard]);

  return {
    columns,
    tags,
    loading,
    loadBoard,
    moveCard,
    createCard,
    setColumns,
    setTags
  };
};