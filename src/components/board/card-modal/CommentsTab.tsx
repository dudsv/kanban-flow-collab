import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Placeholder from '@tiptap/extension-placeholder';
import { mergeAttributes } from '@tiptap/core';
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
}

export function CommentsTab({ card, projectId }: CommentsTabProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  interface MentionListRef {
    onKeyDown: (props: any) => boolean;
  }

  const MentionList = forwardRef<MentionListRef, any>(({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: any) => {
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
          return true;
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selectedIndex];
          if (item) command({ id: item.user_id, label: item.profiles?.name });
          return true;
        }
        return false;
      }
    }));

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
              type="button"
              className={`w-full px-2 py-1.5 text-sm rounded flex items-center gap-2 ${
                index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(index);
              }}
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
  });
  
  MentionList.displayName = 'MentionList';

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escreva um comentário... Use @ para mencionar' }),
      Mention.configure({
        HTMLAttributes: { 
          class: 'mention bg-primary/10 text-primary px-1 rounded',
          'data-type': 'mention'
        },
        renderHTML({ node }) {
          return [
            'span',
            { 
              class: 'mention bg-primary/10 text-primary px-1 rounded',
              'data-type': 'mention',
              'data-user-id': node.attrs.id 
            },
            `@${node.attrs.label}`
          ];
        },
        suggestion: {
          items: ({ query }) => {
            return projectMembers
              .filter(m => {
                const name = m.profiles?.name?.toLowerCase() || '';
                return name.includes(query.toLowerCase());
              })
              .slice(0, 5);
          },
          render: () => {
            let component: ReactRenderer<MentionListRef>;
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
                
                // Delegar para o MentionList via ref
                return component.ref?.onKeyDown?.(props) ?? false;
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
  }, [projectMembers, editorReady]);

  useEffect(() => {
    const init = async () => {
      await loadProjectMembers();
      await loadComments();
      setEditorReady(true);
    };
    init();
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
          description: 'Você precisa estar autenticado para comentar',
          variant: 'destructive',
        });
        return;
      }

      // Optimistic update
      const tempComment = {
        id: `temp-${Date.now()}`,
        card_id: card.id,
        author_id: user.user.id,
        body: content,
        created_at: new Date().toISOString(),
        deleted_at: null,
        author: {
          name: user.user.user_metadata?.name || user.user.email || 'Você',
          avatar_url: user.user.user_metadata?.avatar_url || null,
        },
      };
      setComments((prev) => [...prev, tempComment as Comment]);
      editor.commands.clearContent();

      // Insert to database
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          card_id: card.id,
          author_id: user.user.id,
          body: content,
        })
        .select('id, created_at, body, author_id, deleted_at, author:profiles!comments_author_id_fkey(name, avatar_url)')
        .single();

      if (error) {
        console.error('Comment error:', error);
        // Rollback
        setComments((prev) => prev.filter((c) => c.id !== tempComment.id));
        throw error;
      }

      // Replace temp with real
      setComments((prev) =>
        prev.map((c) => (c.id === tempComment.id ? (comment as Comment) : c))
      );

      // Extract mentioned user IDs using DOMParser
      const mentionedUserIds = Array.from(
        new DOMParser()
          .parseFromString(content, 'text/html')
          .querySelectorAll('[data-user-id]')
      ).map(el => (el as HTMLElement).dataset.userId!).filter(Boolean);

      if (mentionedUserIds.length > 0 && comment) {
        // Insert mentions
        await supabase.from('comment_mentions').insert(
          mentionedUserIds.map((userId) => ({
            comment_id: comment.id,
            mentioned_user_id: userId,
          }))
        );

        // Create notifications with enriched payload
        await supabase.from('notifications').insert(
          mentionedUserIds.map((userId) => ({
            user_id: userId,
            type: 'mention',
            payload: {
              projectId,
              cardId: card.id,
              cardTitle: card.title,
              commentId: comment.id,
              actorName: user.user.user_metadata?.name || user.user.email || 'Alguém',
              actorId: user.user.id,
            },
          }))
        );
      }

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi publicado com sucesso.',
      });
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Erro ao comentar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  if (loading || !editorReady || !editor) {
    return <div className="flex items-center justify-center p-8 text-muted-foreground">Carregando editor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Editor */}
      <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
        <label className="text-sm font-medium">Novo comentário</label>

          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none p-3 min-h-[100px] border border-input rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            💡 Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">@</kbd> para mencionar membros
          </p>
          <Button onClick={postComment} disabled={posting}>
            <Send className="h-4 w-4 mr-2" />
            {posting ? 'Enviando...' : 'Comentar'}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground">
          Comentários ({comments.length})
        </h4>

        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`flex gap-3 p-4 rounded-lg border transition-smooth ${
              comment.id.startsWith('temp-')
                ? 'bg-muted/50 opacity-60 animate-pulse'
                : 'bg-card hover:bg-accent/5'
            }`}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={comment.author.avatar_url || ''} />
              <AvatarFallback>
                {comment.author.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div
                className="text-sm prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: comment.body }}
              />
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">Nenhum comentário ainda.</p>
            <p className="text-xs mt-1">Seja o primeiro a comentar! 💬</p>
          </div>
        )}
      </div>
    </div>
  );
}
