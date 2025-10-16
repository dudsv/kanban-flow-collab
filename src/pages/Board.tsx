import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { AppLayout } from '@/components/layout/AppLayout';
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardColumn } from '@/components/board/BoardColumn';
import { CardItem } from '@/components/board/CardItem';
import { CardModal } from '@/components/board/CardModal';
import { useBoard, type BoardCard } from '@/hooks/useBoard';
import { useBoardRealtime } from '@/hooks/useBoardRealtime';
import { Skeleton } from '@/components/ui/skeleton';

export default function Board() {
  const { id: projectId } = useParams<{ id: string }>();
  const { columns, tags, loading, loadBoard, moveCard, createCard, setColumns } = useBoard(projectId!);
  
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null);
  const [createContext, setCreateContext] = useState<{ columnId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  const handleAddCard = useCallback((columnId: string) => {
    setCreateContext({ columnId });
  }, []);

  const handleBoardUpdate = useCallback(() => {
    loadBoard();
  }, [loadBoard]);

  useBoardRealtime(projectId!, handleBoardUpdate);

  useEffect(() => {
    if (projectId) {
      loadBoard();
    }
  }, [projectId, loadBoard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // N - New card
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const firstColumn = columns[0];
        if (firstColumn) {
          const title = prompt('Título do card:');
          if (title) createCard(firstColumn.id, title);
        }
      }
      // Escape - Close modal
      if (e.key === 'Escape' && selectedCard) {
        setSelectedCard(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [columns, createCard, selectedCard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = columns
      .flatMap(col => col.cards)
      .find(c => c.id === event.active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id as string;
    const targetColumnId = over.id as string;

    // Optimistic update
    const optimisticUpdate = () => {
      setColumns(prevColumns => {
        const newColumns = prevColumns.map(col => ({
          ...col,
          cards: col.cards.filter(card => card.id !== cardId)
        }));

        const targetColumn = newColumns.find(col => col.id === targetColumnId);
        const card = prevColumns.flatMap(col => col.cards).find(c => c.id === cardId);

        if (targetColumn && card) {
          targetColumn.cards.push({ ...card, column_id: targetColumnId });
        }

        return newColumns;
      });
    };

    moveCard(cardId, targetColumnId, optimisticUpdate);
  };

  const filteredColumns = useMemo(() => {
    return columns.map(col => ({
      ...col,
      cards: col.cards.filter(card => {
        // Search filter
        if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // Tags filter
        if (selectedTags.length > 0) {
          const cardTagIds = card.tags?.map(t => t.tag_id) || [];
          if (!selectedTags.some(tagId => cardTagIds.includes(tagId))) {
            return false;
          }
        }

        // Priority filter
        if (selectedPriorities.length > 0 && card.priority) {
          if (!selectedPriorities.includes(card.priority)) {
            return false;
          }
        }

        // Assignees filter
        if (selectedAssignees.length > 0) {
          const cardAssigneeIds = card.assignees?.map(a => a.user_id) || [];
          if (!selectedAssignees.some(userId => cardAssigneeIds.includes(userId))) {
            return false;
          }
        }

        return true;
      })
    }));
  }, [columns, searchQuery, selectedTags, selectedPriorities, selectedAssignees]);

  if (loading) {
    return (
      <AppLayout>
        <div className="h-full p-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="flex gap-4 h-[calc(100vh-12rem)] overflow-x-auto">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="min-w-[320px] h-full" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        <BoardHeader
          projectId={projectId!}
          tags={tags}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          selectedPriorities={selectedPriorities}
          onPrioritiesChange={setSelectedPriorities}
          selectedAssignees={selectedAssignees}
          onAssigneesChange={setSelectedAssignees}
          columns={columns}
          onAddCard={handleAddCard}
        />

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex gap-4 h-full min-w-max">
              {filteredColumns.map(column => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  onCardClick={setSelectedCard}
                  onCreateCard={() => setCreateContext({ columnId: column.id })}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="rotate-3 opacity-80">
                <CardItem card={activeCard} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {selectedCard && (
          <CardModal
            mode="edit"
            card={selectedCard}
            projectId={projectId!}
            tags={tags}
            onClose={() => setSelectedCard(null)}
            onUpdate={loadBoard}
          />
        )}

        {createContext && (
          <CardModal
            mode="create"
            projectId={projectId!}
            columnId={createContext.columnId}
            tags={tags}
            onClose={() => setCreateContext(null)}
            onCreated={() => {
              loadBoard();
              setCreateContext(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}