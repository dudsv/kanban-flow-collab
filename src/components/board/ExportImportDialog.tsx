import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useExportImport } from '@/hooks/useExportImport';
import { Download, Upload, FileJson, FileSpreadsheet } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

interface ExportImportDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportImportDialog({
  projectId,
  open,
  onOpenChange,
}: ExportImportDialogProps) {
  const { loading, progress, exportJSON, exportCSV, importCSV } = useExportImport(projectId);
  const [importResult, setImportResult] = useState<any>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const result = await importCSV(acceptedFiles[0]);
        setImportResult(result);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar / Importar Dados</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Exportar</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={exportJSON}
                disabled={loading}
                className="w-full justify-start"
                variant="outline"
              >
                <FileJson className="mr-2 h-4 w-4" />
                Baixar JSON (completo)
              </Button>
              <p className="text-sm text-muted-foreground pl-4">
                Exporta todos os dados incluindo comentários, checklists e histórico
              </p>

              <Button
                onClick={exportCSV}
                disabled={loading}
                className="w-full justify-start"
                variant="outline"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Baixar CSV (compatível com Trello)
              </Button>
              <p className="text-sm text-muted-foreground pl-4">
                Exporta apenas os cards com informações básicas
              </p>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg font-medium">Solte o arquivo aqui...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Arraste um arquivo CSV ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formato compatível com Trello
                  </p>
                </>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Importando...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {importResult && (
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2">Resultado da Importação</h4>
                <div className="space-y-1 text-sm">
                  <p>✅ {importResult.created} cards criados</p>
                  {importResult.errors.length > 0 && (
                    <p className="text-destructive">
                      ❌ {importResult.errors.length} erros encontrados
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
