import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagsSectionProps {
  projectId: string;
}

export function TagsSection({ projectId }: TagsSectionProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#8b5cf6');

  const loadTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    if (data) setTags(data);
  };

  useEffect(() => {
    loadTags();
  }, [projectId]);

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color);
    } else {
      setEditingTag(null);
      setTagName('');
      setTagColor('#8b5cf6');
    }
    setIsDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira um nome para a tag.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingTag) {
        const { error } = await supabase
          .from('tags')
          .update({ name: tagName, color: tagColor })
          .eq('id', editingTag.id);

        if (error) throw error;
        toast({ title: 'Tag atualizada' });
      } else {
        const { error } = await supabase.from('tags').insert({
          project_id: projectId,
          name: tagName,
          color: tagColor,
        });

        if (error) throw error;
        toast({ title: 'Tag criada' });
      }

      setIsDialogOpen(false);
      loadTags();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar tag',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);

      if (error) throw error;

      toast({ title: 'Tag deletada' });
      loadTags();
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar tag',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Gerencie as tags do projeto</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-2 p-2 rounded-lg border hover:bg-accent"
              >
                <Badge style={{ backgroundColor: tag.color }}>{tag.name}</Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleOpenDialog(tag)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Digite o nome da tag"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-color">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Badge style={{ backgroundColor: tagColor }}>{tagName || 'Preview'}</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTag}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
