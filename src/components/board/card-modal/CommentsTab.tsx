import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import type { BoardCard } from '@/hooks/useBoard';
import type { Database } from '@/integrations/supabase/types';

type Comment = Database['public']['Tables']['comments']['Row'] & {
  author: { name: string; avatar_url: string | null };
};

interface CommentsTabProps {
  card: BoardCard;
  projectId: string;
  onUpdate: () => void;
}

export function CommentsTab({ card, projectId, onUpdate }: CommentsTabProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const MentionList = ({ items, command }: any) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.user_id, label: item.profiles?.name });
      }
    };

    return (
      <div className="bg-popover border rounded-md shadow-md p-1 space-y-1 max-h-60 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-2 py-1 text-sm text-muted-foreground">
            Nenhum membro encontrado
          </div>
        ) : (
          items.map((item: any, index: number) => (
            <button
              key={item.user_id}
              className={`w-full px-2 py-1.5 text-sm rounded flex items-center gap-2 ${
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onClick={() => selectItem(index)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.profiles?.avatar_url || ''} />
                <AvatarFallback>
                  {(item.profiles?.name || 'U').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{item.profiles?.name || 'Sem nome'}</span>
            </button>
          ))
        )}
      </div>
    );
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escreva um comentário...' }),
      Mention.configure({
        HTMLAttributes: { class: 'mention bg-primary/10 text-primary px-1 rounded' },
        suggestion: {
          items: ({ query }) =>
            projectMembers
              .filter(m => m.profiles?.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5),
          render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props: any) => {
                component.updateProps(props);
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return (component.ref as any)?.onKeyDown?.(props) ?? false;
              },
              onExit: () => {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
  });

  useEffect(() => {
    loadComments();
    loadProjectMembers();
  }, [card.id]);

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

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles!comments_author_id_fkey(name, avatar_url)')
        .eq('card_id', card.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!content.trim() || content === '<p></p>') return;

    setPosting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: 'Erro',
          description: 'Você precisa estar autenticado',
          variant: 'destructive'
        });
        return;
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          card_id: card.id,
          author_id: user.user.id,
          body: content
        })
        .select('id, created_at, body, author_id')
        .single();

      if (error) {
        console.error('Comment error:', error);
        throw error;
      }

      const mentionedIds = Array.from(content.matchAll(/data-user-id="([^"]+)"/g)).map(m => m[1]);

      if (mentionedIds.length > 0) {
        await supabase.from('comment_mentions')
          .insert(mentionedIds.map(uid => ({ comment_id: comment.id, mentioned_user_id: uid })));

        await supabase.from('notifications')
          .insert(mentionedIds.map(uid => ({
            user_id: uid,
            type: 'mention',
            payload: { projectId, cardId: card.id, commentId: comment.id }
          })));
      }

      editor.commands.clearContent();
      loadComments();

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi publicado com sucesso.'
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Erro ao comentar',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* New Comment */}
      <div className="space-y-2">
        <EditorContent editor={editor} />
        <p className="text-xs text-muted-foreground">
          Use @ para mencionar membros do projeto
        </p>
        <Button onClick={postComment} disabled={posting}>
          <Send className="h-4 w-4 mr-2" />
          {posting ? 'Enviando...' : 'Comentar'}
        </Button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.author.avatar_url || ''} />
              <AvatarFallback>
                {comment.author.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
              <div 
                className="text-sm prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: comment.body }}
              />
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum comentário ainda. Seja o primeiro!
          </div>
        )}
      </div>
    </div>
  );
}