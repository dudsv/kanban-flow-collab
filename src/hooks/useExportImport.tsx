import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { parseCSV, generateCSV, validateCSVRow, type CSVRow } from '@/lib/csvUtils';
import Papa from 'papaparse';

export function useExportImport(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const exportJSON = async () => {
    setLoading(true);
    try {
      const { data: cards } = await supabase
        .from('cards')
        .select(
          `
          *,
          card_tags(tag_id, tags(name, color)),
          card_assignees(user_id, profiles(name)),
          checklists(*, checklist_items(*)),
          comments(*)
        `
        )
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const exportData = {
        projectId,
        exportedAt: new Date().toISOString(),
        cards: cards || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanflow-${projectId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: 'Arquivo JSON baixado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setLoading(true);
    try {
      const { data: cards } = await supabase
        .from('cards')
        .select(
          `
          *,
          card_tags(tags(name)),
          card_assignees(profiles(name)),
          columns(name)
        `
        )
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const csvData: CSVRow[] =
        cards?.map((card: any) => ({
          title: card.title,
          description: card.description || '',
          tags: card.card_tags?.map((ct: any) => ct.tags.name).join(';') || '',
          assignees: card.card_assignees?.map((ca: any) => ca.profiles.name).join(';') || '',
          priority: card.priority || '',
          points: card.points?.toString() || '',
          due_at: card.due_at || '',
          column: card.columns?.name || '',
        })) || [];

      const csv = generateCSV(csvData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanflow-${projectId}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: 'Arquivo CSV baixado com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const importCSV = async (file: File) => {
    if (!user) return { created: 0, errors: [] };

    setLoading(true);
    setProgress(0);
    const errors: Array<{ row: number; message: string }> = [];

    try {
      const rows = await parseCSV(file);

      // Validar rows
      rows.forEach((row, idx) => {
        const error = validateCSVRow(row, idx);
        if (error) errors.push({ row: idx + 1, message: error });
      });

      if (errors.length > 0) {
        toast({
          title: 'Erros de validação',
          description: `${errors.length} linhas com erros.`,
          variant: 'destructive',
        });
        return { created: 0, errors };
      }

      // Carregar colunas e tags
      const { data: columns } = await supabase
        .from('columns')
        .select('id, name')
        .eq('project_id', projectId);

      const { data: tags } = await supabase
        .from('tags')
        .select('id, name')
        .eq('project_id', projectId);

      const columnMap = new Map(columns?.map((c) => [c.name, c.id]));
      const tagMap = new Map(tags?.map((t) => [t.name, t.id]));

      // Criar tags inexistentes
      const uniqueTags = new Set(
        rows.flatMap((r) => r.tags?.split(';').map((t) => t.trim()) || [])
      );
      for (const tagName of uniqueTags) {
        if (!tagMap.has(tagName)) {
          const { data } = await supabase
            .from('tags')
            .insert({ project_id: projectId, name: tagName, color: '#8b5cf6' })
            .select('id, name')
            .single();
          if (data) tagMap.set(data.name, data.id);
        }
      }

      // Criar cards
      const cardsToInsert = rows
        .map((row) => {
          const columnId = columnMap.get(row.column);
          if (!columnId) {
            errors.push({
              row: rows.indexOf(row) + 1,
              message: `Coluna "${row.column}" não encontrada`,
            });
            return null;
          }

          return {
            project_id: projectId,
            column_id: columnId,
            title: row.title,
            description: row.description || null,
            priority: row.priority || 'medium',
            points: row.points ? parseInt(row.points) : null,
            due_at: row.due_at || null,
            created_by: user.id,
          };
        })
        .filter(Boolean);

      const { data: insertedCards, error: insertError } = await supabase
        .from('cards')
        .insert(cardsToInsert as any)
        .select();

      if (insertError) throw insertError;

      // Criar relações de tags
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const card = insertedCards?.[i];
        if (!card || !row.tags) continue;

        const tagIds = row.tags
          .split(';')
          .map((t) => tagMap.get(t.trim()))
          .filter(Boolean);

        await supabase.from('card_tags').insert(
          tagIds.map((tagId) => ({
            card_id: card.id,
            tag_id: tagId,
          }))
        );

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      toast({
        title: 'Importação concluída',
        description: `${insertedCards?.length || 0} cards criados.`,
      });

      return { created: insertedCards?.length || 0, errors };
    } catch (error: any) {
      toast({
        title: 'Erro ao importar',
        description: error.message,
        variant: 'destructive',
      });
      return { created: 0, errors: [{ row: 0, message: error.message }] };
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return {
    loading,
    progress,
    exportJSON,
    exportCSV,
    importCSV,
  };
}
