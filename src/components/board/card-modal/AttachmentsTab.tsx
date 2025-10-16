import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, Download, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BoardCard } from '@/hooks/useBoard';
import type { Database } from '@/integrations/supabase/types';

type FileItem = Database['public']['Tables']['files']['Row'] & {
  uploader?: { name: string };
};

interface AttachmentsTabProps {
  card: BoardCard;
  projectId: string;
  onUpdate: () => void;
}

export function AttachmentsTab({ card, projectId, onUpdate }: AttachmentsTabProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [card.id]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*, uploader:profiles!files_uploaded_by_fkey(name)')
        .eq('card_id', card.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data as any || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      for (const file of acceptedFiles) {
        // Upload to storage
        const filePath = `${projectId}/card-${card.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Insert record
        await supabase.from('files').insert({
          project_id: projectId,
          card_id: card.id,
          name: file.name,
          url: filePath,
          mime_type: file.type,
          size_bytes: file.size,
          uploaded_by: user.user.id
        });
      }

      toast({
        title: 'Arquivos enviados',
        description: `${acceptedFiles.length} arquivo(s) adicionado(s) com sucesso.`
      });

      loadFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar os arquivos.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId: string, fileUrl: string) => {
    try {
      // Use the file path directly (it's stored as path now, not URL)
      const filePath = fileUrl;

      // Delete from storage
      await supabase.storage
        .from('project-files')
        .remove([filePath]);

      // Mark as deleted
      await supabase
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      toast({
        title: 'Arquivo removido',
        description: 'O arquivo foi excluído com sucesso.'
      });

      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o arquivo.',
        variant: 'destructive'
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    disabled: uploading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith('image/');
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {uploading
            ? 'Enviando arquivos...'
            : isDragActive
            ? 'Solte os arquivos aqui...'
            : 'Arraste arquivos ou clique para selecionar'}
        </p>
      </div>

      {/* Files List */}
      <div className="space-y-2">
        {files.map(file => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {file.size_bytes && <span>{formatFileSize(file.size_bytes)}</span>}
                {file.uploader && <span>• {file.uploader.name}</span>}
                {file.created_at && (
                  <span>
                    • {formatDistanceToNow(new Date(file.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isImage(file.mime_type) && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    const { data, error } = await supabase.storage
                      .from('project-files')
                      .createSignedUrl(file.url, 3600);
                    
                    if (!error && data?.signedUrl) {
                      window.open(data.signedUrl, '_blank');
                    }
                  }}
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  const { data, error } = await supabase.storage
                    .from('project-files')
                    .createSignedUrl(file.url, 3600);
                  
                  if (!error && data?.signedUrl) {
                    window.open(data.signedUrl, '_blank');
                  }
                }}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm('Deseja realmente excluir este arquivo?')) {
                    deleteFile(file.id, file.url);
                  }
                }}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum arquivo anexado ainda.
          </div>
        )}
      </div>
    </div>
  );
}