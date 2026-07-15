import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { MessageTemplate, CommunicationChannel } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  template?: MessageTemplate | null;

  onSave: (
    data: Omit<MessageTemplate, "id" | "createdAt">
  ) => Promise<void>;

  channel: CommunicationChannel;
}

export function MessageTemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
  channel,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const TEMPLATE_VARIABLES = [
    "customer_name",
    "invoice_number",
    "amount",
    "due_date",
    "company_name",
    "payment_link",
  ];

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setBody(template.body);
    } else {
      setName("");
      setSubject("");
      setBody("");
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

    setLoading(true);

    try {    
        await onSave({
            name: name.trim(),
            channel,
            subject: subject.trim(),
            body: body.trim(),
            variables: TEMPLATE_VARIABLES,
            isActive: template?.isActive ?? true,
            isDefault: template?.isDefault ?? false,
            updatedAt: new Date().toISOString(),
        }); 

      onOpenChange(false);
    } catch(e) {
      toast.error(`${e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">

        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Invoice Paid"
            />
          </div>         

          {channel === "email" && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your Invoice {{invoice_number}}"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Variables</Label>
            <Input 
              disabled
              placeholder="customer_name, invoice_number, amount, due_date, company_name, payment_link"
              value={TEMPLATE_VARIABLES.join(", ")}
            />
          </div>

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}