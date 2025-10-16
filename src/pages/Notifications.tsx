import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { Button } from '@/components/ui/button';
import { CheckCheck, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';

export default function Notifications() {
  const [filter, setFilter] = useState('all');
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read_at;
    if (filter === 'mention') return n.type === 'mention';
    if (filter === 'assigned') return n.type === 'assigned';
    return true;
  });

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <AppLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Notificações</h1>
            <p className="text-muted-foreground">
              Fique por dentro das atualizações do seu time
            </p>
          </div>
          {hasUnread && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="mb-6">
          <NotificationFilters activeFilter={filter} onFilterChange={setFilter} />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma notificação</h3>
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? 'Você está em dia! Nenhuma notificação pendente.'
                : 'Quando houver atualizações, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
