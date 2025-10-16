import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import type { BoardCard } from '@/hooks/useBoard';
import type { Database } from '@/integrations/supabase/types';

type Checklist = Database['public']['Tables']['checklists']['Row'] & {
  items: Database['public']['Tables']['checklist_items']['Row'][];
};

interface ChecklistTabProps {
  card: BoardCard;
  onUpdate: () => void;
}

export function ChecklistTab({ card, onUpdate }: ChecklistTabProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTitle, setNewItemTitle] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklists();
  }, [card.id]);

  const loadChecklists = async () => {
    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*, items:checklist_items(*)')
        .eq('card_id', card.id)
        .order('order');

      if (error) throw error;
      setChecklists(data || []);
    } catch (error) {
      console.error('Error loading checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChecklist = async () => {
    if (!newChecklistTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('checklists')
        .insert({
          card_id: card.id,
          title: newChecklistTitle,
          order: checklists.length
        });

      if (error) throw error;

      setNewChecklistTitle('');
      loadChecklists();
      onUpdate();
    } catch (error) {
      console.error('Error creating checklist:', error);
      toast({
        title: 'Erro ao criar checklist',
        variant: 'destructive'
      });
    }
  };

  const createItem = async (checklistId: string) => {
    const title = newItemTitle[checklistId];
    if (!title?.trim()) return;

    try {
      const checklist = checklists.find(c => c.id === checklistId);
      const { error } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: checklistId,
          title,
          order: checklist?.items.length || 0
        });

      if (error) throw error;

      setNewItemTitle(prev => ({ ...prev, [checklistId]: '' }));
      loadChecklists();
      onUpdate();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const toggleItem = async (itemId: string, done: boolean) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({
          done,
          done_at: done ? new Date().toISOString() : null
        })
        .eq('id', itemId);

      if (error) throw error;

      loadChecklists();
      onUpdate();
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const deleteChecklist = async (checklistId: string) => {
    try {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;

      loadChecklists();
      onUpdate();
    } catch (error) {
      console.error('Error deleting checklist:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Existing Checklists */}
      {checklists.map(checklist => {
        const total = checklist.items.length;
        const done = checklist.items.filter(i => i.done).length;
        const progress = total > 0 ? (done / total) * 100 : 0;

        return (
          <div key={checklist.id} className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{checklist.title}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteChecklist(checklist.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {total > 0 && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {done}/{total} completo{done !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              {checklist.items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(checked) => toggleItem(item.id, !!checked)}
                  />
                  <span className={item.done ? 'line-through text-muted-foreground' : ''}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Item */}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar item..."
                value={newItemTitle[checklist.id] || ''}
                onChange={(e) =>
                  setNewItemTitle(prev => ({ ...prev, [checklist.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createItem(checklist.id);
                }}
              />
              <Button size="sm" onClick={() => createItem(checklist.id)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {/* Add Checklist */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome da nova checklist..."
          value={newChecklistTitle}
          onChange={(e) => setNewChecklistTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createChecklist();
          }}
        />
        <Button onClick={createChecklist}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Checklist
        </Button>
      </div>

      {checklists.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma checklist criada ainda
        </div>
      )}
    </div>
  );
}
