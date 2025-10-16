import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileAttachmentProps {
  file: {
    id: string;
    name: string;
    url: string;
    mime_type: string | null;
    size_bytes: number | null;
  };
}

export function FileAttachment({ file }: FileAttachmentProps) {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Create signed URL (without bucket prefix)
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.url, 60 * 10); // 10 minutes

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('No signed URL');

      // Open in new tab (prevents AdBlock issues)
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDownloading(false);
    }
  };

  const isImage = file.mime_type?.startsWith('image/');
  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded mt-2">
      {isImage ? (
        <div className="w-20 h-20 bg-muted-foreground/10 rounded flex items-center justify-center">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <FileIcon className="h-8 w-8 text-muted-foreground" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        {file.size_bytes && (
          <p className="text-xs text-muted-foreground">
            {formatSize(file.size_bytes)}
          </p>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDownload}
        disabled={downloading}
        className="h-8 w-8"
      >
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
