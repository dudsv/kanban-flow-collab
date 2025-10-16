import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface MessageInputProps {
  onSend: (text: string, file?: File) => Promise<void>;
  onTyping: (typing: boolean) => void;
  disabled?: boolean;
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  // Debounced typing indicator (3 seconds)
  const debouncedStopTyping = useMemo(
    () => debounce(() => onTyping(false), 3000),
    [onTyping]
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false,
    noClick: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || disabled) return;

    setSending(true);
    try {
      await onSend(text, file || undefined);
      setText('');
      setFile(null);
      onTyping(false);
    } finally {
      setSending(false);
    }
  };

  const handleChange = (value: string) => {
    setText(value);
    if (value.length > 0) {
      onTyping(true);
      debouncedStopTyping();
    } else {
      onTyping(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {/* File preview */}
      {file && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded">
          <Paperclip className="h-4 w-4" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div
        {...getRootProps()}
        className={`flex gap-2 ${isDragActive ? 'opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <Input
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Type a message..."
          disabled={sending || disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (files && files.length > 0) {
                setFile(files[0]);
              }
            };
            input.click();
          }}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Button type="submit" size="icon" disabled={sending || disabled}>
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line. Drag & drop files here.
      </p>
    </form>
  );
}
