import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention'
        },
        suggestion: {
          items: ({ query }) => {
            return projectMembers
              .filter(m => m.profiles.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5);
          },
          render: () => {
            let component: any;
            let popup: any;

            return {
              onStart: (props: any) => {
                component = document.createElement('div');
                component.className = 'mention-suggestions';
                
                const items = props.items.map((item: any) => {
                  const div = document.createElement('div');
                  div.className = 'mention-item';
                  div.textContent = item.profiles.name;
                  div.addEventListener('click', () => props.command({ id: item.user_id, label: item.profiles.name }));
                  return div;
                });

                items.forEach((item: any) => component.appendChild(item));
                document.body.appendChild(component);
                popup = component;
              },
              onUpdate: (props: any) => {
                const items = props.items.map((item: any) => {
                  const div = document.createElement('div');
                  div.className = 'mention-item';
                  div.textContent = item.profiles.name;
                  div.addEventListener('click', () => props.command({ id: item.user_id, label: item.profiles.name }));
                  return div;
                });

                if (popup) {
                  popup.innerHTML = '';
                  items.forEach((item: any) => popup.appendChild(item));
                }
              },
              onExit: () => {
                if (popup) {
                  popup.remove();
                }
              }
            };
          }
        }
      })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3 border rounded-md'
      }
    }
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
    const content = editor?.getHTML() || '';
    if (!content.trim() || content === '<p></p>') return;

    setPosting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Insert comment
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          card_id: card.id,
          author_id: user.user.id,
          body: content
        })
        .select()
        .single();

      if (error) throw error;

      // Extract mentions from content
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions = [...content.matchAll(mentionRegex)];
      
      if (mentions.length > 0) {
        // Insert mentions
        const mentionInserts = mentions.map(match => ({
          comment_id: comment.id,
          mentioned_user_id: match[2]
        }));

        await supabase.from('comment_mentions').insert(mentionInserts);

        // Create notifications
        const notificationInserts = mentions.map(match => ({
          user_id: match[2],
          type: 'mention_comment',
          payload: {
            comment_id: comment.id,
            card_id: card.id,
            card_title: card.title,
            author_name: user.user.email
          }
        }));

        await supabase.from('notifications').insert(notificationInserts);
      }

      // Audit log
      await supabase.from('audit_log').insert({
        entity: 'comment',
        action: 'create',
        project_id: projectId,
        actor_id: user.user.id
      });

      editor?.commands.clearContent();
      loadComments();
      onUpdate();

      toast({
        title: 'Comentário adicionado',
        description: 'Seu comentário foi publicado com sucesso.'
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Erro ao comentar',
        description: 'Não foi possível adicionar o comentário.',
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