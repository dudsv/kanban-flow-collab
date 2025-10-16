import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Calendar, Flag, Hash, Users, Check, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DialogFooter } from '@/components/ui/dialog';
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

export function DetailsTab({ mode, card, projectId, columnId, tags, onCreated, onClose }: DetailsTabProps) {
  const [title, setTitle] = useState(mode === 'edit' ? card?.title || '' : '');
  const [priority, setPriority] = useState<Priority | undefined>(mode === 'edit' ? card?.priority || undefined : 'medium');
  const [dueDate, setDueDate] = useState(mode === 'edit' ? card?.due_at || '' : '');
  const [points, setPoints] = useState<number | null>(mode === 'edit' ? card?.points || null : null);
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
      toast({ title: 'Erro', description: 'O título não pode estar vazio', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (mode === 'create') {
        if (!columnId) throw new Error('Column ID não fornecido');

        const { data: newCard, error } = await supabase
          .from('cards')
          .insert({
            project_id: projectId,
            column_id: columnId,
            title: title.trim(),
            description: editor?.getHTML() || '',
            priority: priority || 'medium',
            points: points || null,
            due_at: dueDate || null,
            created_by: user.id
          })
          .select('*')
          .single();

        if (error) {
          console.error('Create card error:', error);
          throw new Error(error.message);
        }

        if (selectedAssignees.length > 0) {
          await supabase.from('card_assignees').insert(
            selectedAssignees.map(uid => ({ card_id: newCard.id, user_id: uid }))
          );
        }
        if (selectedTags.length > 0) {
          await supabase.from('card_tags').insert(
            selectedTags.map(tid => ({ card_id: newCard.id, tag_id: tid }))
          );
        }

        toast({ title: 'Card criado com sucesso!' });
        onCreated?.();
        onClose?.();
      } else {
        if (!card) throw new Error('Card não encontrado');

        const payload: any = {};
        if (title !== card.title) payload.title = title.trim();
        if (editor && editor.getHTML() !== card.description) {
          payload.description = editor.getHTML();
        }
        if (priority !== card.priority) payload.priority = priority;
        if (points !== card.points) payload.points = points;
        if (dueDate !== card.due_at) payload.due_at = dueDate;

        if (Object.keys(payload).length > 0) {
          const { error } = await supabase
            .from('cards')
            .update(payload)
            .eq('id', card.id);

          if (error) {
            console.error('Update card error:', error);
            throw new Error(error.message);
          }
        }

        const currentAssigneeIds = card.assignees?.map(a => a.user_id) || [];
        const toAdd = selectedAssignees.filter(id => !currentAssigneeIds.includes(id));
        const toRemove = currentAssigneeIds.filter(id => !selectedAssignees.includes(id));

        if (toAdd.length > 0) {
          await supabase.from('card_assignees').insert(
            toAdd.map(uid => ({ card_id: card.id, user_id: uid }))
          );
        }
        if (toRemove.length > 0) {
          await supabase.from('card_assignees')
            .delete()
            .eq('card_id', card.id)
            .in('user_id', toRemove);
        }

        const currentTagIds = card.tags?.map(t => t.tag_id) || [];
        const tagsToAdd = selectedTags.filter(id => !currentTagIds.includes(id));
        const tagsToRemove = currentTagIds.filter(id => !selectedTags.includes(id));

        if (tagsToAdd.length > 0) {
          await supabase.from('card_tags').insert(
            tagsToAdd.map(tid => ({ card_id: card.id, tag_id: tid }))
          );
        }
        if (tagsToRemove.length > 0) {
          await supabase.from('card_tags')
            .delete()
            .eq('card_id', card.id)
            .in('tag_id', tagsToRemove);
        }

        toast({ title: 'Alterações salvas!' });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    
    try {
      const { error } = await supabase
        .from('cards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', card.id);

      if (error) throw error;

      toast({ title: 'Card movido para lixeira' });
      onClose?.();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleTag = async (tagId: string) => {
    if (mode === 'create') {
      setSelectedTags(prev =>
        prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
      );
    } else {
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
      setSelectedAssignees(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
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
              value={points || ''}
              onChange={(e) => setPoints(e.target.value ? parseInt(e.target.value) : null)}
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
                    <TagManager projectId={projectId} />
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

      <DialogFooter className="flex justify-between items-center">
        <div>
          {mode === 'edit' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir card
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    O card será movido para a lixeira. Você pode restaurá-lo depois.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : mode === 'create' ? 'Criar Card' : 'Salvar alterações'}
        </Button>
      </DialogFooter>
    </div>
  );
}
