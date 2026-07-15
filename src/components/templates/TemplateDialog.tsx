import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { CommunicationChannel, MessageTemplate } from '@/types';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MessageTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: CommunicationChannel;
  template?: MessageTemplate | null;
  onSave: (
    data: Omit<MessageTemplate, 'id' | 'createdAt'>
  ) => Promise<void>;
}

export function MessageTemplateDialog({
  open,
  onOpenChange,
  channel,
  template,
  onSave,
}: MessageTemplateDialogProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
      setVariables(template.variables.join(', '));
    } else {
      setName('');
      setSubject('');
      setBody('');
      setVariables('');
    }
  }, [template, open]);

  async function handleSubmit() {


    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (channel === 'email' && !subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!body.trim()) {
      toast.error('Message body is required');
      return;
    }

    // const channelTemplates = templates.filter(
    //     t => t.channel === channel
    // );

    // if (channelTemplates.length >= 2) {
    //     toast.error(`Maximum 2 ${channel} templates allowed`);
    //     return;
    // }

    setLoading(true);

    try {    
        await onSave({
            name: name.trim(),
            channel,
            subject: subject.trim(),
            body: body.trim(),
            variables: variables
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),

            isActive: template?.isActive ?? true,
            isDefault: template?.isDefault ?? false,
            updatedAt: new Date().toISOString(),
        });
      

      toast.success(
        template
          ? 'Template updated successfully'
          : 'Template created successfully'
      );

      onOpenChange(false);
    } catch {
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">

        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              placeholder="Invoice Created"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {channel === 'email' && (
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                placeholder="Your Invoice {{invoice_number}}"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Message Body</Label>
            <Textarea
              rows={10}
              placeholder="Write your template..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Variables</Label>
            <Input
              placeholder="customer_name, invoice_number, amount, due_date, company_name, payment_link"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
            />

            <p className="text-xs text-muted-foreground">
              Separate variables using commas.
            </p>
          </div>

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? 'Saving...'
              : template
              ? 'Update Template'
              : 'Create Template'}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}