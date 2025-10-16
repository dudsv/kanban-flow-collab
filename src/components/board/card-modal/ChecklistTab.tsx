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

    // Otimista: adicionar temporário
    const tempChecklist: Checklist = {
      id: `temp-${Date.now()}`,
      card_id: card.id,
      title: newChecklistTitle,
      order: checklists.length,
      items: []
    };
    setChecklists(prev => [...prev, tempChecklist]);
    setNewChecklistTitle('');

    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert({
          card_id: card.id,
          title: newChecklistTitle,
          order: checklists.length
        })
        .select('*, items:checklist_items(*)')
        .single();

      if (error) throw error;

      // Substituir temp por real
      setChecklists(prev => 
        prev.map(c => c.id === tempChecklist.id ? data : c)
      );
    } catch (error) {
      console.error('Error creating checklist:', error);
      // Rollback: remover temp
      setChecklists(prev => prev.filter(c => c.id !== tempChecklist.id));
      toast({
        title: 'Erro ao criar checklist',
        variant: 'destructive'
      });
    }
  };

  const createItem = async (checklistId: string) => {
    const title = newItemTitle[checklistId];
    if (!title?.trim()) return;

    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;

    // Otimista: adicionar item temporário
    const tempItem = {
      id: `temp-${Date.now()}`,
      checklist_id: checklistId,
      title,
      order: checklist.items.length,
      done: false,
      done_at: null
    };
    
    setChecklists(prev => prev.map(c => 
      c.id === checklistId 
        ? { ...c, items: [...c.items, tempItem] }
        : c
    ));
    setNewItemTitle(prev => ({ ...prev, [checklistId]: '' }));

    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: checklistId,
          title,
          order: checklist.items.length
        })
        .select('*')
        .single();

      if (error) throw error;

      // Substituir temp por real
      setChecklists(prev => prev.map(c =>
        c.id === checklistId
          ? { ...c, items: c.items.map(i => i.id === tempItem.id ? data : i) }
          : c
      ));
    } catch (error) {
      console.error('Error creating item:', error);
      // Rollback: remover temp
      setChecklists(prev => prev.map(c =>
        c.id === checklistId
          ? { ...c, items: c.items.filter(i => i.id !== tempItem.id) }
          : c
      ));
    }
  };

  const toggleItem = async (itemId: string, done: boolean) => {
    // Otimista: atualizar localmente primeiro
    setChecklists(prev => prev.map(c => ({
      ...c,
      items: c.items.map(i => 
        i.id === itemId 
          ? { ...i, done, done_at: done ? new Date().toISOString() : null }
          : i
      )
    })));

    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({
          done,
          done_at: done ? new Date().toISOString() : null
        })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling item:', error);
      // Rollback: recarregar do servidor
      loadChecklists();
    }
  };

  const deleteChecklist = async (checklistId: string) => {
    // Otimista: remover localmente
    const backup = checklists.find(c => c.id === checklistId);
    setChecklists(prev => prev.filter(c => c.id !== checklistId));

    try {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting checklist:', error);
      // Rollback: restaurar
      if (backup) {
        setChecklists(prev => [...prev, backup]);
      }
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
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            createItem(checklist.id);
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Adicionar item..."
            value={newItemTitle[checklist.id] || ''}
            onChange={(e) =>
              setNewItemTitle(prev => ({ ...prev, [checklist.id]: e.target.value }))
            }
          />
          <Button type="submit" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </form>
          </div>
        );
      })}

      {/* Add Checklist */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          createChecklist();
        }}
        className="flex gap-2"
      >
        <Input
          placeholder="Nome da nova checklist..."
          value={newChecklistTitle}
          onChange={(e) => setNewChecklistTitle(e.target.value)}
        />
        <Button type="submit">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Checklist
        </Button>
      </form>

      {checklists.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma checklist criada ainda
        </div>
      )}
    </div>
  );
}
