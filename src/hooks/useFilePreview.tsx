import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PreviewType = 'image' | 'pdf' | 'unsupported';

export function useFilePreview(storagePath: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>('unsupported');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      setPreviewType('unsupported');
      return;
    }

    const generateSignedUrl = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('project-files')
          .createSignedUrl(storagePath, 3600); // 1 hour TTL

        if (error) throw error;
        setSignedUrl(data.signedUrl);

        // Determine preview type from path
        const extension = storagePath.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
          setPreviewType('image');
        } else if (extension === 'pdf') {
          setPreviewType('pdf');
        } else {
          setPreviewType('unsupported');
        }
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setSignedUrl(null);
        setPreviewType('unsupported');
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [storagePath]);

  return { signedUrl, previewType, loading };
}
