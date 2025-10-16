import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type AuditLog = Database['public']['Tables']['audit_log']['Row'] & {
  actor: { name: string; avatar_url: string | null } | null;
};

interface HistoryTabProps {
  cardId: string;
}

const actionLabels: Record<string, string> = {
  create: 'criou',
  update: 'atualizou',
  move: 'moveu',
  delete: 'deletou'
};

export function HistoryTab({ cardId }: HistoryTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [cardId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, actor:profiles!audit_log_actor_id_fkey(name, avatar_url)')
        .eq('entity', 'card')
        .eq('entity_id', cardId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data as any || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum histórico disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map(log => (
        <div key={log.id} className="flex gap-3 pb-4 border-b last:border-0">
          <div className="pt-1">
            {log.actor ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={log.actor.avatar_url || ''} />
                <AvatarFallback>
                  {log.actor.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-sm">
              <span className="font-semibold">{log.actor?.name || 'Sistema'}</span>
              {' '}
              {actionLabels[log.action] || log.action}
              {' '}
              este card
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
            {log.diff && (
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                {JSON.stringify(log.diff, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}