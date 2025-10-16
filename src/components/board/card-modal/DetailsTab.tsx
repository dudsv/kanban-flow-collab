import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Calendar, Flag, Hash, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
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
  mode: 'create' | 'edit';
  card?: BoardCard | null;
  projectId: string;
  columnId?: string;
  tags: Tag[];
  onUpdate?: () => void;
  onCreated?: () => void;
  onClose?: () => void;
}

const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

const priorityLabels: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
};

export function DetailsTab({ mode, card, projectId, columnId, tags, onUpdate, onCreated, onClose }: DetailsTabProps) {
  const [title, setTitle] = useState(mode === 'edit' ? card?.title || '' : '');
  const [priority, setPriority] = useState<Priority | undefined>(mode === 'edit' ? card?.priority || undefined : 'medium');
  const [dueDate, setDueDate] = useState(mode === 'edit' ? card?.due_at || '' : '');
  const [points, setPoints] = useState(mode === 'edit' ? card?.points?.toString() || '' : '');
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(mode === 'edit' ? card?.assignees?.map(a => a.user_id) || [] : []);
  const [selectedTags, setSelectedTags] = useState<string[]>(mode === 'edit' ? card?.tags?.map(t => t.tag_id) || [] : []);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Adicione uma descrição...'
      })
    ],
    content: mode === 'edit' ? card?.description || '' : '',
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
    if (!title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, insira um título para o card.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      if (mode === 'create') {
        // INSERT novo card
        const { data: newCard, error } = await supabase
          .from('cards')
          .insert({
            project_id: projectId,
            column_id: columnId!,
            title,
            description: editor?.getHTML() || '',
            priority,
            due_at: dueDate || null,
            points: points ? parseInt(points) : null,
            created_by: user.user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Inserir tags
        if (selectedTags.length > 0) {
          await supabase.from('card_tags').insert(
            selectedTags.map(tagId => ({ card_id: newCard.id, tag_id: tagId }))
          );
        }

        // Inserir assignees
        if (selectedAssignees.length > 0) {
          await supabase.from('card_assignees').insert(
            selectedAssignees.map(userId => ({ card_id: newCard.id, user_id: userId }))
          );
        }

        toast({
          title: 'Card criado',
          description: 'O card foi criado com sucesso.'
        });

        onCreated?.();
        onClose?.();
      } else {
        // UPDATE card existente
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
          .eq('id', card!.id);

        if (error) throw error;

        toast({
          title: 'Card atualizado',
          description: 'As alterações foram salvas com sucesso.'
        });
      }
    } catch (error) {
      console.error('Error saving card:', error);
      toast({
        title: mode === 'create' ? 'Erro ao criar' : 'Erro ao atualizar',
        description: mode === 'create' ? 'Não foi possível criar o card.' : 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = async (tagId: string) => {
    if (mode === 'create') {
      // Em modo criar, só atualiza estado local
      setSelectedTags(prev =>
        prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
      );
    } else {
      // Em modo editar, faz chamada ao banco
      try {
        const isSelected = selectedTags.includes(tagId);
        if (isSelected) {
          await supabase
            .from('card_tags')
            .delete()
            .eq('card_id', card!.id)
            .eq('tag_id', tagId);
          setSelectedTags(prev => prev.filter(id => id !== tagId));
        } else {
          await supabase
            .from('card_tags')
            .insert({ card_id: card!.id, tag_id: tagId });
          setSelectedTags(prev => [...prev, tagId]);
        }
      } catch (error) {
        console.error('Error toggling tag:', error);
      }
    }
  };

  const toggleAssignee = async (userId: string) => {
    if (mode === 'create') {
      // Em modo criar, só atualiza estado local
      setSelectedAssignees(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      // Em modo editar, faz chamada ao banco
      try {
        const isAssigned = selectedAssignees.includes(userId);
        if (isAssigned) {
          await supabase
            .from('card_assignees')
            .delete()
            .eq('card_id', card!.id)
            .eq('user_id', userId);
          setSelectedAssignees(prev => prev.filter(id => id !== userId));
        } else {
          await supabase
            .from('card_assignees')
            .insert({ card_id: card!.id, user_id: userId });
          setSelectedAssignees(prev => [...prev, userId]);
        }
      } catch (error) {
        console.error('Error toggling assignee:', error);
      }
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">Gerenciar Tags</Button>
            </PopoverTrigger>
            <PopoverContent
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              className="p-0 w-80"
            >
              <Command>
                <CommandInput placeholder="Buscar tags..." />
                <CommandList>
                  <CommandEmpty>Nenhuma tag encontrada</CommandEmpty>
                  <CommandGroup>
                    {tags.map(tag => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <CommandItem
                          key={tag.id}
                          value={tag.name}
                          onSelect={() => toggleTag(tag.id)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="flex-1">{tag.name}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                  <div className="p-2 border-t">
                    <TagManager projectId={projectId} onTagsChange={onUpdate} />
                  </div>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.filter(t => selectedTags.includes(t.id)).map(tag => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color, borderColor: tag.color }}
            >
              {tag.name}
            </Badge>
          ))}
          {selectedTags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma tag selecionada
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">Atribuir pessoas</Button>
          </PopoverTrigger>
          <PopoverContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            className="p-0 w-72"
          >
            <Command>
              <CommandInput placeholder="Buscar pessoa..." />
              <CommandList>
                <CommandEmpty>Ninguém encontrado</CommandEmpty>
                <CommandGroup>
                  {projectMembers.map(member => {
                    const isAssigned = selectedAssignees.includes(member.user_id);
                    return (
                      <CommandItem
                        key={member.user_id}
                        value={member.profiles?.name ?? member.user_id}
                        onSelect={() => toggleAssignee(member.user_id)}
                      >
                        <Avatar className="mr-2 h-6 w-6">
                          <AvatarImage src={member.profiles?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {member.profiles?.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1">{member.profiles?.name}</span>
                        {isAssigned && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <div className="flex flex-wrap gap-2">
          {projectMembers.filter(m => selectedAssignees.includes(m.user_id)).map(member => (
            <div key={member.user_id} className="flex items-center gap-1 bg-muted rounded-full pl-1 pr-2 py-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.profiles?.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {member.profiles?.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{member.profiles?.name}</span>
            </div>
          ))}
          {selectedAssignees.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Ninguém atribuído
            </p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Salvando...' : mode === 'create' ? 'Criar Card' : 'Salvar alterações'}
      </Button>
    </div>
  );
}