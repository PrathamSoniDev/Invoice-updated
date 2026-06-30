import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterBar } from '@/components/common/FilterBar';
import { Pagination } from '@/components/common/Pagination';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTemplateStore } from '@/store/templateStore';
import { timeAgo } from '@/utils';
import {
  FileText,
  Eye,
  Upload,
  Pencil,
  Trash2,
  History,
  Check,
  X,
  FileCode,
  FileJson,
  FileType2,
} from 'lucide-react';
import { toast } from 'sonner';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { TemplateUploadDialog } from '@/components/templates/TemplateUploadDialog';
import { TemplateVersionTimeline } from '@/components/templates/TemplateVersionTimeline';
import type { InvoiceTemplate, UserInvoiceTemplate, TemplateType } from '@/types';

const typeIcons: Record<TemplateType, typeof FileCode> = {
  tsx: FileCode,
  html: FileType2,
  json: FileJson,
};

export function InvoiceTemplatesPage() {
  const {
    templates,
    userTemplates,
    assignTemplate,
    updateTemplate,
    removeTemplate,
  } = useTemplateStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [previewTemplate, setPreviewTemplate] = useState<InvoiceTemplate | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadUserId, setUploadUserId] = useState<string | undefined>();
  const [versionTemplate, setVersionTemplate] = useState<InvoiceTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(() => {
    let result = [...userTemplates];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.userName.toLowerCase().includes(q) ||
          u.companyName?.toLowerCase().includes(q) ||
          u.userEmail.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((u) => {
        const tpl = templates.find((t) => t.id === u.templateId);
        return tpl?.status === statusFilter;
      });
    }
    if (typeFilter !== 'all') {
      result = result.filter((u) => {
        const tpl = templates.find((t) => t.id === u.templateId);
        return tpl?.type === typeFilter;
      });
    }
    return result;
  }, [userTemplates, templates, search, statusFilter, typeFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const paged = filtered.slice((page - 1) * limit, page * limit);

  const getTemplateForUser = (ut: UserInvoiceTemplate) =>
    templates.find((t) => t.id === ut.templateId);

  const handleAssign = (userId: string, templateId: string) => {
    assignTemplate(userId, templateId);
    toast.success('Template assigned successfully');
  };

  const handleSetDefault = (templateId: string) => {
    updateTemplate(templateId, { isDefault: true });
    toast.success('Set as default template');
  };

  const handleRemove = (templateId: string) => {
    if (confirm('Are you sure you want to remove this template?')) {
      removeTemplate(templateId);
      toast.success('Template removed');
    }
  };

  const startEdit = (tpl: InvoiceTemplate) => {
    setEditingId(tpl.id);
    setEditName(tpl.name);
  };

  const saveEdit = (id: string) => {
    updateTemplate(id, { name: editName });
    setEditingId(null);
    toast.success('Template name updated');
  };

  const columns = [
    {
      key: 'companyName',
      header: 'Company',
      cell: (ut: UserInvoiceTemplate) => (
        <div>
          <p className="font-medium text-sm">{ut.companyName || '—'}</p>
          <p className="text-xs text-muted-foreground">{ut.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'userName',
      header: 'User',
      cell: (ut: UserInvoiceTemplate) => (
        <span className="text-sm">{ut.userName}</span>
      ),
    },
    {
      key: 'template',
      header: 'Assigned Template',
      cell: (ut: UserInvoiceTemplate) => {
        const tpl = getTemplateForUser(ut);
        if (!tpl) return <span className="text-sm text-muted-foreground">—</span>;
        const TypeIcon = typeIcons[tpl.type];
        return (
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{tpl.name}</p>
              <p className="text-[10px] text-muted-foreground">v{tpl.version}</p>
            </div>
            {tpl.isDefault && <Badge variant="outline" className="text-[10px] h-5">Default</Badge>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (ut: UserInvoiceTemplate) => {
        const tpl = getTemplateForUser(ut);
        return tpl ? (
          <StatusBadge status={tpl.status === 'active' ? 'active' : tpl.status === 'disabled' ? 'inactive' : 'pending'} />
        ) : (
          <StatusBadge status="inactive" />
        );
      },
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      cell: (ut: UserInvoiceTemplate) => (
        <span className="text-xs text-muted-foreground">{timeAgo(ut.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (ut: UserInvoiceTemplate) => {
        const tpl = getTemplateForUser(ut);
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {tpl && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewTemplate(tpl)} title="Preview">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVersionTemplate(tpl)} title="Versions">
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setUploadUserId(ut.userId); setUploadOpen(true); }} title="Upload">
                  <Upload className="h-4 w-4" />
                </Button>
                {editingId === tpl.id ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEdit(tpl.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(tpl)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSetDefault(tpl.id)} title="Set Default">
                  <FileText className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(tpl.id)} title="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Select
              value={ut.templateId || ''}
              onValueChange={(v) => handleAssign(ut.userId, v)}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Assign..." />
              </SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.status === 'active').map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Templates"
        description="Manage per-user invoice template assignments"
        icon={FileText}
        actions={
          <Button onClick={() => { setUploadUserId(undefined); setUploadOpen(true); }} className="gap-2">
            <Upload className="h-4 w-4" /> Upload Template
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by company, user, or email..." className="flex-1" />
        <FilterBar
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: [
                { label: 'All Statuses', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Disabled', value: 'disabled' },
                { label: 'Draft', value: 'draft' },
              ],
              onChange: setStatusFilter,
            },
            {
              label: 'Type',
              value: typeFilter,
              options: [
                { label: 'All Types', value: 'all' },
                { label: 'React (.tsx)', value: 'tsx' },
                { label: 'HTML', value: 'html' },
                { label: 'JSON', value: 'json' },
              ],
              onChange: setTypeFilter,
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={paged}
        emptyTitle="No user template assignments found"
        emptyDescription="Try adjusting your search or filters."
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
      />

      <TemplatePreviewModal
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />

      <TemplateUploadDialog
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setUploadUserId(undefined); }}
        userId={uploadUserId}
      />

      <TemplateVersionTimeline
        open={!!versionTemplate}
        onClose={() => setVersionTemplate(null)}
        template={versionTemplate}
      />
    </div>
  );
}
