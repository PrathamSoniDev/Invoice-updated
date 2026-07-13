import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTemplateStore } from '@/store/templateStore';
import { formatDate, timeAgo } from '@/utils';
import { History, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import type { TemplateVersion, InvoiceTemplate } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  template: InvoiceTemplate | null;
}

export function TemplateVersionTimeline({ open, onClose, template }: Props) {
  const { versions, templates } = useTemplateStore();
  const [previewVersion, setPreviewVersion] = useState<TemplateVersion | null>(null);

  if (!template) return null;

  const templateVersions = versions
    .filter((v) => v.templateId === template.id)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const currentTemplate = templates.find((t) => t.id === template.id);

  const handleRestore = (version: TemplateVersion) => {
    toast.success(`Restored version ${version.version} of ${template.name}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Version History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {templateVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No version history available.</p>
            ) : (
              <div className="relative border-l-2 border-muted pl-6 space-y-6">
                {templateVersions.map((version, index) => {
                  const isCurrent = currentTemplate?.version === version.version;
                  return (
                    <div key={version.id} className="relative">
                      <span
                        className={`absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 ${
                          isCurrent ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'
                        }`}
                      />
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">v{version.version}</span>
                            {isCurrent && <Badge variant="default" className="text-[10px] h-5">Current</Badge>}
                            {index === templateVersions.length - 1 && !isCurrent && (
                              <Badge variant="outline" className="text-[10px] h-5">Original</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{timeAgo(version.uploadedAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {version.uploadedBy} on {formatDate(version.uploadedAt, 'medium')}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => setPreviewVersion(version)}
                          >
                            <Eye className="h-3 w-3" /> Preview
                          </Button>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleRestore(version)}
                            >
                              <RotateCcw className="h-3 w-3" /> Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TemplatePreviewModal
        open={!!previewVersion}
        onClose={() => setPreviewVersion(null)}
        template={currentTemplate || null}
      />
    </>
  );
}
