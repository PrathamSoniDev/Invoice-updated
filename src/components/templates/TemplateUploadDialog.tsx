import { useState } from 'react';
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
import { Upload, FileCode, FileJson, FileType2 } from 'lucide-react';
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

export function TemplateUploadDialog({ open, onClose, userId }: Props) {
  const { addTemplate, assignTemplate, templates } = useTemplateStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateType>('tsx');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }
    setUploading(true);
    setTimeout(() => {
      const template = {
        id: generateId('tpl'),
        name: name.trim(),
        type,
        version,
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
      setUploading(false);
      toast.success('Template uploaded successfully');
      reset();
      onClose();
    }, 1200);
  };

  const reset = () => {
    setName('');
    setType('tsx');
    setVersion('1.0.0');
    setDescription('');
  };

  const TypeIcon = typeIcons[type];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Invoice Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); toast.info('File selected (mock)'); }}
          >
            <TypeIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drag & drop your template file</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            <input
              type="file"
              className="hidden"
              accept=".tsx,.html,.json"
              onChange={() => toast.info('File selected (mock)')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Modern Minimal" />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Template Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
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
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading || !name.trim()}>
            {uploading ? 'Uploading...' : 'Upload Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
