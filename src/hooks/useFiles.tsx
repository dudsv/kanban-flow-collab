import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  project_id: string;
}

export interface FileItem {
  id: string;
  name: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder_id: string | null;
  project_id: string;
  uploaded_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export function useFiles(projectId: string) {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const loadFolders = async () => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('project_id', projectId)
      .order('name');

    if (error) {
      toast({ title: 'Error loading folders', description: error.message, variant: 'destructive' });
      return [];
    }
    return data as Folder[];
  };

  const loadFiles = async (folderId?: string | null) => {
    let query = supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (folderId !== undefined) {
      query = folderId === null ? query.is('folder_id', null) : query.eq('folder_id', folderId);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error loading files', description: error.message, variant: 'destructive' });
      return [];
    }
    return data as FileItem[];
  };

  const createFolder = async (name: string, parentId: string | null = null) => {
    const { data, error } = await supabase
      .from('folders')
      .insert({ name, parent_id: parentId, project_id: projectId })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error creating folder', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Folder created', description: `"${name}" created successfully` });
    return data as Folder;
  };

  const uploadFiles = async (files: File[], folderId: string | null = null) => {
    setLoading(true);
    const results = [];

    for (const file of files) {
      const fileId = crypto.randomUUID();
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        const path = `${projectId}/${folderId ? `folder-${folderId}/` : ''}${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(path, file);
        
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        if (uploadError) throw uploadError;

        // Insert file record with exact storage path
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .insert({
            name: file.name,
            url: uploadData.path,
            mime_type: file.type,
            size_bytes: file.size,
            folder_id: folderId,
            project_id: projectId
          })
          .select()
          .single();

        if (fileError) throw fileError;

        results.push(fileData);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      } catch (error: any) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }

    setLoading(false);
    if (results.length > 0) {
      toast({ title: 'Upload complete', description: `${results.length} file(s) uploaded` });
    }
    return results;
  };

  const moveFile = async (fileId: string, targetFolderId: string | null) => {
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      toast({ title: 'Error', description: 'File not found', variant: 'destructive' });
      return false;
    }

    // Calculate new path
    const oldPath = file.url;
    const fileName = file.name;
    const newPath = `${projectId}/${targetFolderId ? `folder-${targetFolderId}/` : ''}${fileName}`;

    // Move in storage
    const { error: moveError } = await supabase.storage
      .from('project-files')
      .move(oldPath, newPath);

    if (moveError) {
      toast({ title: 'Move failed', description: moveError.message, variant: 'destructive' });
      return false;
    }

    // Update file record
    const { error: updateError } = await supabase
      .from('files')
      .update({ url: newPath, folder_id: targetFolderId })
      .eq('id', fileId);

    if (updateError) {
      toast({ title: 'Update failed', description: updateError.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'File moved', description: 'File moved successfully' });
    return true;
  };

  const deleteFile = async (fileId: string) => {
    const { error } = await supabase
      .from('files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId);

    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: 'File deleted', description: 'File moved to trash' });
    return true;
  };

  return {
    loading,
    uploadProgress,
    loadFolders,
    loadFiles,
    createFolder,
    uploadFiles,
    moveFile,
    deleteFile
  };
}
