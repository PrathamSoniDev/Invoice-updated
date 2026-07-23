import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  label: string;
  description?: string;
  accept?: string;
  preview?: string;
  onUpload: (dataUrl: string) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  className?: string;
  aspectRatio?: 'square' | 'wide' | 'natural';
}

export function FileUpload({
  label,
  description,
  accept = 'image/png,image/jpeg,image/svg+xml',
  preview,
  onUpload,
  onRemove,
  className,
  aspectRatio = 'square',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/image\/(png|jpeg|jpg|svg\+xml)/)) {
      toast.error('Please upload a PNG, JPG, or SVG file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setIsSaving(true);
      try {
        // Await it: onUpload actually persists the change (e.g. to the
        // company profile in the database) — only report success once that
        // has genuinely happened, not just once the file's been read into
        // memory. A rejected promise here (network error, permission
        // error, etc.) now surfaces as a real error instead of a
        // misleading "uploaded successfully" toast.
        await onUpload(dataUrl);
        toast.success(`${label} uploaded successfully`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to save ${label.toLowerCase()}`);
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  }, [label, onUpload]);

  const handleRemove = useCallback(async () => {
    if (!onRemove) return;
    setIsSaving(true);
    try {
      await onRemove();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to remove ${label.toLowerCase()}`);
    } finally {
      setIsSaving(false);
    }
  }, [onRemove, label]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const previewClass = aspectRatio === 'square' ? 'aspect-square' : aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-auto';

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {preview ? (
        <div className="relative group">
          <div className={cn('relative rounded-lg border-2 border-dashed overflow-hidden bg-muted/30 flex items-center justify-center', previewClass)}>
            <img src={preview} alt={label} className="max-w-full max-h-full object-contain p-2" />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={isSaving}>
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Replace
            </Button>
            {onRemove && (
              <Button size="sm" variant="destructive" onClick={handleRemove} disabled={isSaving}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'rounded-lg border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 p-6',
            previewClass,
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, or SVG (max 2MB)</p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>;
}