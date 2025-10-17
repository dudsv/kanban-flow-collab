import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (ids: string[]) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const navigate = useNavigate();

  const getNotificationContent = () => {
    const { type, payload } = notification;

    switch (type) {
      case 'mention':
        return {
          title: `${payload.actorName || 'Alguém'} mencionou você`,
          description: `em "${payload.cardTitle || '(sem título)'}"`,
          link: `/projects/${payload.projectId}/board`,
        };
      case 'assigned':
        return {
          title: `${payload.actorName || 'Alguém'} atribuiu você`,
          description: `ao card "${payload.cardTitle || '(sem título)'}"`,
          link: `/projects/${payload.projectId}/board`,
        };
      case 'moved':
        return {
          title: `Card movido`,
          description: `"${payload.cardTitle || '(sem título)'}" foi movido para ${payload.columnName || '(coluna)'}`,
          link: `/projects/${payload.projectId}/board`,
        };
      case 'overdue':
        return {
          title: `Card atrasado`,
          description: `"${payload.cardTitle || '(sem título)'}" está vencido`,
          link: `/projects/${payload.projectId}/board`,
        };
      case 'upload':
        return {
          title: `Novo arquivo`,
          description: `${payload.fileName || 'Um arquivo'} foi adicionado ao projeto`,
          link: `/projects/${payload.projectId}/files`,
        };
      case 'priority_change':
        return {
          title: `Prioridade alterada`,
          description: `"${payload.cardTitle || '(sem título)'}" agora tem prioridade ${payload.priority}`,
          link: `/projects/${payload.projectId}/board`,
        };
      default:
        return {
          title: 'Notificação',
          description: type,
          link: '/projects',
        };
    }
  };

  const content = getNotificationContent();
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead([notification.id]);
    }
    navigate(content.link);
  };

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
        isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card'
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{content.title.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{content.title}</p>
              <p className="text-sm text-muted-foreground">{content.description}</p>
            </div>
            {isUnread && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead([notification.id]);
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
