import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];

interface TagManagerProps {
  projectId: string;
  onTagsChange: () => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export function TagManager({ projectId, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadTags();
    }
  }, [open]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para a tag.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        // Update
        const { error } = await supabase
          .from('tags')
          .update({ name: name.trim(), color })
          .eq('id', editingTag.id);

        if (error) throw error;

        toast({
          title: 'Tag atualizada',
          description: 'A tag foi atualizada com sucesso.'
        });
      } else {
        // Create
        const { error } = await supabase
          .from('tags')
          .insert({
            project_id: projectId,
            name: name.trim(),
            color
          });

        if (error) throw error;

        toast({
          title: 'Tag criada',
          description: 'A tag foi criada com sucesso.'
        });
      }

      setName('');
      setColor('#8b5cf6');
      setEditingTag(null);
      loadTags();
      onTagsChange();
    } catch (error) {
      console.error('Error saving tag:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a tag.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Deseja realmente excluir esta tag? Ela será removida de todos os cards.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({
        title: 'Tag excluída',
        description: 'A tag foi excluída com sucesso.'
      });

      loadTags();
      onTagsChange();
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a tag.',
        variant: 'destructive'
      });
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setName(tag.name);
    setColor(tag.color);
  };

  const cancelEdit = () => {
    setEditingTag(null);
    setName('');
    setColor('#8b5cf6');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Gerenciar Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Tags do Projeto</DialogTitle>
          <DialogDescription>
            Crie, edite ou exclua tags para organizar seus cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create/Edit Form */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="tag-name">
                {editingTag ? 'Editar Tag' : 'Nova Tag'}
              </Label>
              <Input
                id="tag-name"
                placeholder="Nome da tag"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editingTag ? 'Atualizar' : 'Criar'}
              </Button>
              {editingTag && (
                <Button variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          {/* Tags List */}
          <div className="space-y-2">
            <Label>Tags Existentes</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <Badge
                    style={{
                      backgroundColor: tag.color,
                      borderColor: tag.color
                    }}
                  >
                    {tag.name}
                  </Badge>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(tag)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(tag.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {tags.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma tag criada ainda.
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}