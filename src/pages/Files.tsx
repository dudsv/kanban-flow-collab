import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useFiles, type Folder, type FileItem } from '@/hooks/useFiles';
import { useFilesRealtime } from '@/hooks/useFilesRealtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderIcon, FileIcon, Upload, FolderPlus, Search, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useFilePreview } from '@/hooks/useFilePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/AppLayout';

export default function Files() {
  const { id: projectId } = useParams<{ id: string }>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const { loadFolders, loadFiles, createFolder, uploadFiles, deleteFile } = useFiles(projectId!);
  
  const loadData = useCallback(async () => {
    const [foldersData, filesData] = await Promise.all([
      loadFolders(),
      loadFiles(currentFolderId)
    ]);
    setFolders(foldersData);
    setFiles(filesData);
  }, [currentFolderId, loadFolders, loadFiles]);

  useFilesRealtime(projectId!, loadData);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId, loadData]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    await uploadFiles(acceptedFiles, currentFolderId);
    loadData();
  }, [currentFolderId, uploadFiles, loadData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleCreateFolder = async () => {
    const name = prompt('Folder name:');
    if (name) {
      await createFolder(name, currentFolderId);
      loadData();
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Delete this file?')) {
      await deleteFile(fileId);
      loadData();
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Sidebar - Folder Tree */}
        <div className="w-64 border-r border-border bg-muted/30 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Folders</h3>
            <Button size="sm" variant="ghost" onClick={handleCreateFolder}>
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <Button
              variant={currentFolderId === null ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentFolderId(null)}
            >
              <FolderIcon className="h-4 w-4 mr-2" />
              Root
            </Button>
            {folders.map(folder => (
              <Button
                key={folder.id}
                variant={currentFolderId === folder.id ? 'secondary' : 'ghost'}
                className="w-full justify-start pl-6"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <FolderIcon className="h-4 w-4 mr-2" />
                {folder.name}
              </Button>
            ))}
          </div>
        </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-border p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleCreateFolder} variant="outline">
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button {...getRootProps()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
            <input {...getInputProps()} />
          </Button>
        </div>

        {/* Files Grid */}
        <div
          {...getRootProps()}
          className={`flex-1 p-6 overflow-y-auto ${
            isDragActive ? 'bg-primary/10 border-2 border-dashed border-primary' : ''
          }`}
        >
          <input {...getInputProps()} />
          {filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {isDragActive ? 'Drop files here...' : 'No files. Drag and drop or click Upload.'}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {filteredFiles.map(file => (
                <div
                  key={file.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 cursor-pointer group"
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <FileIcon className="h-8 w-8 text-primary" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : 'Unknown size'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          open={!!selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
      </div>
    </AppLayout>
  );
}

function FilePreviewModal({ file, open, onClose }: { file: FileItem; open: boolean; onClose: () => void }) {
  const { signedUrl, previewType, loading } = useFilePreview(file.url);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto">
          {loading && <p className="text-center py-8">Loading preview...</p>}
          {!loading && previewType === 'image' && signedUrl && (
            <img src={signedUrl} alt={file.name} className="w-full h-auto" />
          )}
          {!loading && previewType === 'pdf' && signedUrl && (
            <embed src={signedUrl} type="application/pdf" className="w-full h-[600px]" />
          )}
          {!loading && previewType === 'unsupported' && (
            <p className="text-center py-8 text-muted-foreground">
              Preview not available. 
              {signedUrl && (
                <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-2">
                  Download
                </a>
              )}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
