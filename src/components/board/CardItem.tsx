import { useDraggable } from '@dnd-kit/core';
import { Calendar, MessageSquare, CheckSquare, AlertCircle, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BoardCard } from '@/hooks/useBoard';

interface CardItemProps {
  card: BoardCard;
  onClick: () => void;
}

const priorityConfig = {
  low: { label: 'Baixa', color: 'text-blue-500', icon: Flag },
  medium: { label: 'Média', color: 'text-yellow-500', icon: Flag },
  high: { label: 'Alta', color: 'text-orange-500', icon: Flag },
  critical: { label: 'Crítica', color: 'text-red-500', icon: Flag }
};

export function CardItem({ card, onClick }: CardItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined;

  const totalChecklistItems = card.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 0;
  const doneChecklistItems = card.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.done).length, 0) || 0;
  const commentsCount = card.comments?.length || 0;

  const isOverdue = card.due_at && isPast(new Date(card.due_at)) && !isToday(new Date(card.due_at));
  const isDueToday = card.due_at && isToday(new Date(card.due_at));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg p-3 shadow-sm border cursor-pointer',
        'transition-all hover:shadow-md hover:scale-[1.02]',
        isDragging && 'opacity-50 cursor-grabbing'
      )}
    >
      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.tags.map(({ tags }) => (
            <Badge
              key={tags.id}
              variant="secondary"
              className="text-xs"
              style={{
                backgroundColor: `${tags.color}20`,
                color: tags.color,
                borderColor: tags.color
              }}
            >
              {tags.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">{card.title}</h4>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {/* Priority */}
          {card.priority && priorityConfig[card.priority] && (
            <div className={cn('flex items-center gap-1', priorityConfig[card.priority].color)}>
              <Flag className="h-3 w-3" />
            </div>
          )}

          {/* Due Date */}
          {card.due_at && (
            <div className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-destructive font-medium',
              isDueToday && 'text-orange-500 font-medium'
            )}>
              <Calendar className="h-3 w-3" />
              {format(new Date(card.due_at), 'dd/MM', { locale: ptBR })}
            </div>
          )}

          {/* Checklist Progress */}
          {totalChecklistItems > 0 && (
            <div className={cn(
              'flex items-center gap-1',
              doneChecklistItems === totalChecklistItems && 'text-green-500'
            )}>
              <CheckSquare className="h-3 w-3" />
              {doneChecklistItems}/{totalChecklistItems}
            </div>
          )}

          {/* Comments */}
          {commentsCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentsCount}
            </div>
          )}

          {/* Story Points */}
          {card.points && (
            <Badge variant="outline" className="text-xs">
              {card.points}
            </Badge>
          )}
        </div>

        {/* Assignees */}
        {card.assignees && card.assignees.length > 0 && (
          <div className="flex -space-x-2">
            {card.assignees.slice(0, 3).map(({ user_id, profiles }) => (
              <Avatar key={user_id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={profiles.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {profiles.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {card.assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                +{card.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}