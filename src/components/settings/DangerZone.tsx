import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DangerZoneProps {
  projectId: string;
  projectName: string;
}

export function DangerZone({ projectId, projectName }: DangerZoneProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmName !== projectName) {
      toast({
        title: 'Nome incorreto',
        description: 'Digite o nome do projeto exatamente como aparece.',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: 'Projeto deletado',
        description: 'O projeto foi movido para a lixeira.',
      });
      navigate('/projects');
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar projeto',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis que afetam permanentemente o projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Deletar Projeto</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Uma vez deletado, o projeto e todos os seus dados serão movidos para a lixeira. Esta
                ação pode ser revertida por 30 dias.
              </p>
              <Button variant="destructive" onClick={() => setIsDialogOpen(true)}>
                Deletar Projeto
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação deletará o projeto <strong>{projectName}</strong> e todo o seu conteúdo.
              <br />
              <br />
              Digite <strong>{projectName}</strong> para confirmar:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={projectName}
          />
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmName !== projectName}
            >
              {deleting ? 'Deletando...' : 'Confirmar Deleção'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
