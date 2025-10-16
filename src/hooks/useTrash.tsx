import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TrashItem {
  id: string;
  type: 'card' | 'message' | 'file';
  title: string;
  deleted_at: string;
}

export function useTrash(projectId: string) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsRes, filesRes] = await Promise.all([
        supabase
          .from('cards')
          .select('id, title, deleted_at')
          .eq('project_id', projectId)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('files')
          .select('id, name, deleted_at')
          .eq('project_id', projectId)
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false }),
      ]);

      const allItems: TrashItem[] = [
        ...(cardsRes.data || []).map((c) => ({
          id: c.id,
          type: 'card' as const,
          title: c.title,
          deleted_at: c.deleted_at!,
        })),
        ...(filesRes.data || []).map((f) => ({
          id: f.id,
          type: 'file' as const,
          title: f.name,
          deleted_at: f.deleted_at!,
        })),
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());

      setItems(allItems);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar lixeira',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const restore = useCallback(async (type: 'card' | 'message' | 'file', id: string) => {
    try {
      const table = type === 'card' ? 'cards' : type === 'message' ? 'messages' : 'files';
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Item restaurado',
        description: 'O item foi recuperado com sucesso.',
      });
      loadTrash();
    } catch (error: any) {
      toast({
        title: 'Erro ao restaurar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [loadTrash]);

  const hardDelete = useCallback(async (type: 'card' | 'message' | 'file', id: string) => {
    try {
      const table = type === 'card' ? 'cards' : type === 'message' ? 'messages' : 'files';
      const { error } = await supabase.from(table).delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Item deletado permanentemente',
        description: 'Esta ação não pode ser desfeita.',
      });
      loadTrash();
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [loadTrash]);

  return {
    items,
    loading,
    loadTrash,
    restore,
    hardDelete,
  };
}
