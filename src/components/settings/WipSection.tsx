import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';

interface Column {
  id: string;
  name: string;
  wip_limit: number | null;
  card_count?: number;
}

interface WipSectionProps {
  projectId: string;
}

export function WipSection({ projectId }: WipSectionProps) {
  const [columns, setColumns] = useState<Column[]>([]);

  const loadColumns = async () => {
    const { data: columnsData } = await supabase
      .from('columns')
      .select('id, name, wip_limit')
      .eq('project_id', projectId)
      .order('order');

    if (columnsData) {
      // Contar cards por coluna
      const { data: cardsData } = await supabase
        .from('cards')
        .select('column_id')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const cardCounts = cardsData?.reduce((acc: any, card) => {
        acc[card.column_id] = (acc[card.column_id] || 0) + 1;
        return acc;
      }, {});

      setColumns(
        columnsData.map((col) => ({
          ...col,
          card_count: cardCounts?.[col.id] || 0,
        }))
      );
    }
  };

  useEffect(() => {
    loadColumns();
  }, [projectId]);

  const handleUpdateWip = async (columnId: string, wipLimit: number | null) => {
    try {
      const { error } = await supabase
        .from('columns')
        .update({ wip_limit: wipLimit })
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: 'Limite WIP atualizado',
      });
      loadColumns();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar limite WIP',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Limites WIP</CardTitle>
        <CardDescription>
          Defina o número máximo de cards por coluna (Work In Progress)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {columns.map((column) => {
          const isExceeded = column.wip_limit && column.card_count! > column.wip_limit;
          
          return (
            <div key={column.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`wip-${column.id}`}>{column.name}</Label>
                <span className="text-sm text-muted-foreground">
                  {column.card_count} cards
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  id={`wip-${column.id}`}
                  type="number"
                  min="0"
                  placeholder="Sem limite"
                  value={column.wip_limit || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    handleUpdateWip(column.id, value);
                  }}
                  className={isExceeded ? 'border-destructive' : ''}
                />
                {isExceeded && (
                  <div className="flex items-center gap-1 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Excedido!</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
