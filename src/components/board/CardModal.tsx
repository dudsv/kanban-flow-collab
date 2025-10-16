import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, CheckSquare, MessageSquare, History, Paperclip } from 'lucide-react';
import { DetailsTab } from './card-modal/DetailsTab';
import { ChecklistTab } from './card-modal/ChecklistTab';
import { CommentsTab } from './card-modal/CommentsTab';
import { HistoryTab } from './card-modal/HistoryTab';
import { AttachmentsTab } from './card-modal/AttachmentsTab';
import type { BoardCard } from '@/hooks/useBoard';
import type { Database } from '@/integrations/supabase/types';

type Tag = Database['public']['Tables']['tags']['Row'];

interface CardModalProps {
  mode: 'create' | 'edit';
  card?: BoardCard | null;
  projectId: string;
  columnId?: string;
  tags: Tag[];
  onClose: () => void;
  onUpdate?: () => void;
  onCreated?: () => void;
}

export function CardModal({ mode, card, projectId, columnId, tags, onClose, onUpdate, onCreated }: CardModalProps) {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {mode === 'create' ? 'Criar Novo Card' : card?.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className={mode === 'create' ? 'grid w-full grid-cols-1' : 'grid w-full grid-cols-5'}>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Detalhes
            </TabsTrigger>
            {mode === 'edit' && (
              <>
                <TabsTrigger value="checklist" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="attachments" className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Anexos
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="mt-0">
              <DetailsTab 
                mode={mode}
                card={card}
                projectId={projectId}
                columnId={columnId}
                tags={tags}
                onUpdate={onUpdate}
                onCreated={onCreated}
                onClose={onClose}
              />
            </TabsContent>

            {mode === 'edit' && card && (
              <>
                <TabsContent value="checklist" className="mt-0">
                  <ChecklistTab card={card} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="attachments" className="mt-0">
                  <AttachmentsTab card={card} projectId={projectId} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="comments" className="mt-0">
                  <CommentsTab card={card} projectId={projectId} onUpdate={onUpdate} />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <HistoryTab cardId={card.id} />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}