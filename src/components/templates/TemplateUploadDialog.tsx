import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTemplateStore } from '@/store/templateStore';
import { generateId } from '@/utils';
import { Upload, FileCode, FileJson, FileType2, X, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

const typeIcons: Record<TemplateType, typeof FileCode> = {
  tsx: FileCode,
  html: FileType2,
  json: FileJson,
};

// Supported file extensions per template type
const ACCEPTED_EXTENSIONS: Record<TemplateType, string[]> = {
  tsx: ['tsx', 'ts', 'jsx', 'js'],
  html: ['html', 'htm'],
  json: ['json'],
};

// Human-readable label for accepted extensions (used in the accept attribute + UI)
const acceptAttr: Record<TemplateType, string> = {
  tsx: '.tsx,.ts,.jsx,.js',
  html: '.html,.htm',
  json: '.json',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface SelectedFile {
  file: File;
  content: string;
}

export function TemplateUploadDialog({ open, onClose, userId }: Props) {
  const { addTemplate, assignTemplate, templates } = useTemplateStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateType>('tsx');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName('');
    setType('tsx');
    setVersion('1.0.0');
    setDescription('');
    setSelectedFile(null);
    setError(null);
    setIsDragging(false);
    setUploading(false);
    // Reset the native input so the same file can be re-selected later
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  /**
   * Validate a selected file against the current template type and size limits.
   * Returns the file content as a string on success, or null on failure
   * (with an appropriate toast + inline error message shown).
   */
  const validateAndRead = useCallback(
    (file: File): Promise<string | null> => {
      return new Promise((resolve) => {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const allowed = ACCEPTED_EXTENSIONS[type];

        if (!allowed.includes(ext)) {
          const msg = `Invalid file type ".${ext}". Allowed: ${allowed
            .map((e) => `.${e}`)
            .join(', ')}`;
          setError(msg);
          toast.error(msg);
          resolve(null);
          return;
        }

        if (file.size === 0) {
          const msg = 'The selected file is empty.';
          setError(msg);
          toast.error(msg);
          resolve(null);
          return;
        }

        if (file.size > MAX_FILE_SIZE) {
          const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(
            2
          )} MB). Maximum allowed size is 5 MB.`;
          setError(msg);
          toast.error(msg);
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (!content || !content.trim()) {
            const msg = 'The selected file appears to be empty.';
            setError(msg);
            toast.error(msg);
            resolve(null);
            return;
          }
          // For JSON templates, verify the content is valid JSON
          if (type === 'json') {
            try {
              JSON.parse(content);
            } catch {
              const msg = 'The JSON file is not valid JSON.';
              setError(msg);
              toast.error(msg);
              resolve(null);
              return;
            }
          }
          resolve(content);
        };
        reader.onerror = () => {
          const msg = 'Failed to read the file. Please try again.';
          setError(msg);
          toast.error(msg);
          resolve(null);
        };
        reader.readAsText(file);
      });
    },
    [type]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const content = await validateAndRead(file);
      if (content === null) {
        setSelectedFile(null);
        return;
      }
      setSelectedFile({ file, content });
      // Auto-fill the template name if the user hasn't typed one yet
      if (!name.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setName(baseName);
      }
      toast.success(`File "${file.name}" ready to upload`);
    },
    [validateAndRead, name]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleTypeChange = (newType: TemplateType) => {
    setType(newType);
    // If the currently selected file is no longer valid for the new type, clear it
    if (selectedFile) {
      const ext = selectedFile.file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED_EXTENSIONS[newType].includes(ext)) {
        setSelectedFile(null);
        toast.info('Cleared file selection due to type change');
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a template file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Simulate async upload/persistence so the loading indicator is visible.
      // The template content is persisted via the store's addTemplate action.
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const template = {
        id: generateId('tpl'),
        name: name.trim(),
        type,
        version: version.trim() || '1.0.0',
        content: selectedFile.content,
        status: 'active' as const,
        isDefault: templates.length === 0,
        uploadedBy: 'Admin',
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addTemplate(template);
      if (userId) {
        assignTemplate(userId, template.id);
      }
      toast.success(`Template "${template.name}" uploaded successfully`);
      reset();
      onClose();
    } catch {
      const msg = 'Failed to upload the template. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const TypeIcon = typeIcons[type];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Invoice Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone / file picker */}
          {selectedFile ? (
            <div className="border-2 border-solid border-primary/30 rounded-xl p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.file.size / 1024).toFixed(1)} KB ·{' '}
                    {selectedFile.content.length} chars
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={clearFile}
                  title="Remove file"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <TypeIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Drag & drop your template file
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or{' '}
                <span className="text-primary font-medium underline-offset-2 hover:underline">
                  click to browse
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                {ACCEPTED_EXTENSIONS[type].map((e) => `.${e}`).join(', ')} · max
                5 MB
              </p>
            </div>
          )}

          {/* Hidden native file input */}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={acceptAttr[type]}
            onChange={handleInputChange}
          />

          {/* Inline error message */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Modern Minimal"
                disabled={uploading}
              />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                disabled={uploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Template Type</Label>
            <Select
              value={type}
              onValueChange={(v) => handleTypeChange(v as TemplateType)}
              disabled={uploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tsx">React Component (.tsx)</SelectItem>
                <SelectItem value="html">HTML Template</SelectItem>
                <SelectItem value="json">JSON Configuration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={3}
              disabled={uploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !name.trim() || !selectedFile}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
