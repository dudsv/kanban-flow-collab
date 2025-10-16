import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [card.id]);

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
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('comments')
        .insert({
          card_id: card.id,
          author_id: user.user.id,
          body: newComment
        });

      if (error) throw error;

      // TODO: Detectar @menções e criar notificações
      // const mentions = newComment.match(/@(\w+)/g);
      // if (mentions) {
      //   // Buscar usuários mencionados e criar notificações
      // }

      // Audit log
      await supabase.from('audit_log').insert({
        entity: 'comment',
        action: 'create',
        project_id: projectId,
        actor_id: user.user.id
      });

      setNewComment('');
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
        <Textarea
          placeholder="Escreva um comentário... (use @ para mencionar)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <Button onClick={postComment} disabled={posting || !newComment.trim()}>
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
              <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
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