import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';

type AuditLog = Database['public']['Tables']['audit_log']['Row'] & {
  actor: { name: string; avatar_url: string | null } | null;
  from_column?: { name: string };
  to_column?: { name: string };
};

interface HistoryTabProps {
  cardId: string;
}

export function HistoryTab({ cardId }: HistoryTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [cardId]);

  const loadHistory = async () => {
    try {
      // Buscar logs de mudanças de status (column_id) e criação do card
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          actor:profiles!audit_log_actor_id_fkey(name, avatar_url)
        `)
        .eq('entity', 'card')
        .eq('entity_id', cardId)
        .in('action', ['create', 'update'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filtrar apenas mudanças de status (column_id) e criação
      const statusChanges = (data || []).filter(log => {
        if (log.action === 'create') return true;
        if (log.action === 'update' && log.diff && typeof log.diff === 'object') {
          const diff = log.diff as any;
          // Verificar se houve mudança de column_id (mudança de status)
          return diff.column_id !== undefined;
        }
        return false;
      });

      // Buscar nomes das colunas para as mudanças de status
      const enrichedLogs = await Promise.all(
        statusChanges.map(async (log, index) => {
          if (log.action === 'create') {
            return { ...log, column_name: null, is_creation: true };
          }

          if (log.action === 'update' && log.diff && typeof log.diff === 'object') {
            const diff = log.diff as any;
            if (diff.column_id !== undefined) {
              // Buscar nome da coluna atual
              const { data: columnData } = await supabase
                .from('columns')
                .select('name')
                .eq('id', diff.column_id)
                .single();
              
              // Tentar encontrar o status anterior (próximo log na lista)
              let previousColumnName = null;
              if (index < statusChanges.length - 1) {
                const nextLog = statusChanges[index + 1];
                if (nextLog.action === 'update' && nextLog.diff && typeof nextLog.diff === 'object') {
                  const nextDiff = nextLog.diff as any;
                  if (nextDiff.column_id !== undefined) {
                    const { data: prevColumnData } = await supabase
                      .from('columns')
                      .select('name')
                      .eq('id', nextDiff.column_id)
                      .single();
                    previousColumnName = prevColumnData?.name;
                  }
                }
              }
              
              return { 
                ...log, 
                column_name: columnData?.name || 'Coluna desconhecida',
                previous_column_name: previousColumnName,
                column_id: diff.column_id
              };
            }
          }

          return log;
        })
      );

      setLogs(enrichedLogs as any);
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
        Nenhuma mudança de status registrada
      </div>
    );
  }

  const getStatusChangeText = (log: AuditLog & { column_name?: string; previous_column_name?: string; is_creation?: boolean }) => {
    if (log.is_creation) {
      return 'criou este card';
    }
    
    if (log.action === 'update' && log.column_name) {
      if (log.previous_column_name) {
        return `moveu este card de "${log.previous_column_name}" para "${log.column_name}"`;
      } else {
        return `moveu este card para "${log.column_name}"`;
      }
    }
    
    return 'atualizou este card';
  };

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
              {getStatusChangeText(log)}
            </p>
            
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}