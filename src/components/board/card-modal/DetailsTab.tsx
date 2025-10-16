import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Calendar, Flag, Hash, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { TagManager } from './TagManager';
import type { BoardCard } from '@/hooks/useBoard';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];
type Priority = Database['public']['Enums']['priority_t'];

interface DetailsTabProps {
  card: BoardCard;
  projectId: string;
  tags: Tag[];
  onUpdate: () => void;
}

const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

const priorityLabels: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
};

export function DetailsTab({ card, projectId, tags, onUpdate }: DetailsTabProps) {
  const [title, setTitle] = useState(card.title);
  const [priority, setPriority] = useState<Priority | undefined>(card.priority || undefined);
  const [dueDate, setDueDate] = useState(card.due_at || '');
  const [points, setPoints] = useState(card.points?.toString() || '');
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Adicione uma descrição...'
      })
    ],
    content: card.description || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3 border rounded-md'
      }
    }
  });

  useEffect(() => {
    loadProjectMembers();
  }, [projectId]);

  const loadProjectMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, profiles(name, avatar_url)')
        .eq('project_id', projectId);

      if (error) throw error;
      setProjectMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cards')
        .update({
          title,
          description: editor?.getHTML(),
          priority,
          due_at: dueDate || null,
          points: points ? parseInt(points) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', card.id);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        entity: 'card',
        entity_id: card.id,
        action: 'update',
        project_id: projectId,
        actor_id: (await supabase.auth.getUser()).data.user?.id
      });

      toast({
        title: 'Card atualizado',
        description: 'As alterações foram salvas com sucesso.'
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do card"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Descrição</Label>
        <EditorContent editor={editor} />
      </div>

      {/* Priority, Due Date, Points */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger id="priority">
              <Flag className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map(p => (
                <SelectItem key={p} value={p}>
                  {priorityLabels[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="due-date">Data limite</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="points">Story Points</Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="0"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tags</Label>
          <TagManager projectId={projectId} onTagsChange={onUpdate} />
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => {
            const isSelected = card.tags?.some(t => t.tag_id === tag.id);
            return (
              <Badge
                key={tag.id}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer"
                style={isSelected ? {
                  backgroundColor: tag.color,
                  borderColor: tag.color
                } : undefined}
                onClick={async () => {
                  try {
                    if (isSelected) {
                      await supabase
                        .from('card_tags')
                        .delete()
                        .eq('card_id', card.id)
                        .eq('tag_id', tag.id);
                    } else {
                      await supabase
                        .from('card_tags')
                        .insert({ card_id: card.id, tag_id: tag.id });
                    }
                    onUpdate();
                  } catch (error) {
                    console.error('Error toggling tag:', error);
                  }
                }}
              >
                {tag.name}
              </Badge>
            );
          })}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Use o botão "Gerenciar Tags" para criar tags
            </p>
          )}
        </div>
      </div>

      {/* Assignees */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Atribuídos
        </Label>
        <div className="space-y-2">
          {projectMembers.length > 0 ? (
            <div className="space-y-1">
              {projectMembers.map(member => {
                const isAssigned = card.assignees?.some(a => a.user_id === member.user_id);
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={async () => {
                      try {
                        if (isAssigned) {
                          await supabase
                            .from('card_assignees')
                            .delete()
                            .eq('card_id', card.id)
                            .eq('user_id', member.user_id);
                        } else {
                          await supabase
                            .from('card_assignees')
                            .insert({ card_id: card.id, user_id: member.user_id });
                        }
                        onUpdate();
                      } catch (error) {
                        console.error('Error toggling assignee:', error);
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      readOnly
                      className="rounded"
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.profiles.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {member.profiles.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{member.profiles.name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum membro no projeto
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </div>
  );
}