import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CommunicationStatusBadge } from '@/components/common/StatusBadge';
import { communicationService } from '@/services';
import type { CommunicationLog, CommunicationChannel, MessageTemplate } from '@/types';
import { formatDateTime } from '@/utils';
import { MessageCircle, Mail, MessageSquare, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { MessageTemplateDialog } from "@/components/templates/MessageTemplateDialog";
import { useDebounce } from '@/hooks/use-debounce';

interface CommunicationHistoryProps {
  channel: CommunicationChannel;
  title: string;
  description: string;
  icon: typeof MessageCircle;
}

export function CommunicationHistory({ channel, title, description, icon: Icon }: CommunicationHistoryProps) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const limit = 10;

  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  const loadTemplates = async () => {
    try {
      const data = await communicationService.listTemplates();
      setTemplates(
        data.filter((t) => t.channel === channel)
      );
    } catch {
      setTemplates([]);
    }
  };  

  const handleSetDefault = async (id: string) => {
    try {
      await communicationService.setDefaultTemplate(id);

      const updated = await communicationService.listTemplates();

      setTemplates(updated.filter((t) => t.channel === channel));

      toast.success("Default template updated");
    } catch {
      toast.error("Failed to update default template");
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await communicationService.setActiveTemplate(id);

      const updated = await communicationService.listTemplates();

      setTemplates(updated.filter((t) => t.channel === channel));

      toast.success("Active template updated");
    } catch {
      toast.error("Failed to update active template");
    }
  };

  const handleUpdateTemplate = async (
    id: string,
    data: Omit<MessageTemplate, "id" | "createdAt">
  ) => {
    try {
      await communicationService.updateTemplate(id, data);

      const updated = await communicationService.listTemplates();

      setTemplates(updated.filter((t) => t.channel === channel));

      toast.success("Template updated successfully");
    } catch {
      toast.error("Failed to update template");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const template: MessageTemplate | undefined = templates.find((t) => t.id === id)
      
      if (template?.isDefault) {
        toast.error("Please select another default template first.");
        return;
      }

      if (template?.isActive) {
        toast.error("Please activate another template first.");
        return;
      }

      await communicationService.deleteTemplate(id);

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      toast.success("Template deleted"); 
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const debouncedSearch = useDebounce(search, 500);
  useEffect(() => {
    setLoading(true);
    communicationService.listLogs({ search : debouncedSearch, channel, status: statusFilter, page, limit }).then((res) => {
      setLogs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setLoading(false);
    });
  }, [debouncedSearch, statusFilter, page, channel]);

  useEffect(() => {
    loadTemplates();
  }, [channel]);

  const channelTemplates = templates;

  const columns: Column<CommunicationLog>[] = [
    {
      key: 'recipient',
      header: 'Recipient',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.recipientName}</p>
          <p className="text-xs text-muted-foreground">{row.recipient}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: (row) => <span className="text-sm">{row.subject}</span>,
    },
    {
      key: 'template',
      header: 'Template',
      cell: (row) => row.templateName ? <span className="text-xs text-muted-foreground">{row.templateName}</span> : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'sentAt',
      header: 'Sent',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.sentAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <CommunicationStatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        icon={Icon}
        actions={
          <Button size="sm" className="gap-2" onClick={() => setShowTemplates(!showTemplates)}>
            <FileText className="h-4 w-4" /> Templates
          </Button>
        }
      />

      {showTemplates && (
        <Card className="shadow-soft">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Message Templates</CardTitle>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                  setSelectedTemplate(null);
                  setDialogOpen(true);
                }}>
                <Plus className="h-4 w-4" /> New Template
              </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {channelTemplates.map((tpl) => (
                <div key={tpl.id} className="rounded-lg border p-4 hover:shadow-soft transition-shadow">   
                  <div className="flex items-center justify-between mb-3 gap-2">
                      {tpl.isDefault ? (
                        <Badge variant="default">Default</Badge>  
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetDefault(tpl.id)}
                        >
                          Set Default
                        </Button>
                      )}
                       {tpl.isActive ? (                      
                        <Badge variant="secondary">Active</Badge> 
                      ) : (                        
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetActive(tpl.id)}
                        >
                          Set Active
                        </Button>
                      )}
                  </div> 
                  <p className="text-sm font-semibold mb-1">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{tpl.body}</p>
                  <div className="flex flex-wrap gap-1">
                    {tpl.variables.map((v: string) => (
                      <span key={v} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>                                 
                  <div className="flex justify-end gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setShowTemplateDialog(true);
                      }}
                    >
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {channelTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">No templates for this channel yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft">
        <div className="p-4 border-b">
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search messages...' }}
            filters={[
              {
                label: 'Status',
                value: statusFilter,
                onChange: (v) => { setStatusFilter(v); setPage(1); },
                options: [
                  { label: 'All Status', value: 'all' },
                  { label: 'Sent', value: 'sent' },
                  { label: 'Delivered', value: 'delivered' },
                  { label: 'Read', value: 'read' },
                  { label: 'Failed', value: 'failed' },
                ],
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          data={logs}
          isLoading={loading}
          emptyTitle="No messages found"
          emptyDescription="Send a message to see it here."
        />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </Card>


       <MessageTemplateDialog
      open={showTemplateDialog}
      onOpenChange={(open) => {
        setShowTemplateDialog(open);

        if (!open) {
          setEditingTemplate(null);
        }
      }}
      template={editingTemplate}
      channel={channel}
      onSave={async (data) => {
        if (!editingTemplate) return;

        await handleUpdateTemplate(editingTemplate.id, data);

        setShowTemplateDialog(false);
        setEditingTemplate(null);
      }}
    />
    
      <MessageTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        channel={channel}
        template={selectedTemplate}
        onSave={async (data) => {
          const channelTemplates = templates.filter(t => t.channel === channel);

          if (!editingTemplate && channelTemplates.length >= 2) {
            toast.error(`You can only create 2 ${channel} templates.`);
            return;
          }          

          await communicationService.createTemplate(data);

          toast.success(
          selectedTemplate
            ? 'Template updated successfully'
            : 'Template created successfully'
          );

          await loadTemplates();
        }}
      />     
    </div>
  );
}

export function WhatsAppHistoryPage() {
  return <CommunicationHistory channel="whatsapp" title="WhatsApp History" description="Track all WhatsApp messages sent to customers" icon={MessageCircle} />;
}

export function EmailHistoryPage() {
  return <CommunicationHistory channel="email" title="Email History" description="Track all emails sent to customers" icon={Mail} />;
}

export function CommunicationLogsPage() {
  return <CommunicationHistory channel="sms" title="Communication Logs" description="All communication across channels" icon={MessageSquare} />;
}
