import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardItem } from './CardItem';
import { cn } from '@/lib/utils';
import type { BoardColumn as BoardColumnType, BoardCard } from '@/hooks/useBoard';

interface BoardColumnProps {
  column: BoardColumnType;
  onCardClick: (card: BoardCard) => void;
  onCreateCard: () => void;
}

export function BoardColumn({ column, onCardClick, onCreateCard }: BoardColumnProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: column.id
  });

  const isWipLimitReached = column.wip_limit && column.cards.length >= column.wip_limit;

  const handleCreateCard = () => {
    onCreateCard();
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-w-[320px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg p-3 transition-colors',
        isOver && 'bg-primary/10 ring-2 ring-primary'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isWipLimitReached ? 'bg-destructive/20 text-destructive' : 'bg-muted'
          )}>
            {column.cards.length}
            {column.wip_limit && `/${column.wip_limit}`}
          </span>
        </div>
        {isWipLimitReached && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-[100px]">
        {column.cards.map(card => (
          <CardItem
            key={card.id}
            card={card}
            onClick={() => onCardClick(card)}
          />
        ))}

        {column.cards.length === 0 && !isAddingCard && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum card nesta coluna
          </div>
        )}
      </div>

      {/* Add Card */}
      <div className="mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleCreateCard}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar card
        </Button>
      </div>
    </div>
  );
}