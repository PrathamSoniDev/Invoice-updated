import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { auditService } from '@/services';
import type { AuditLog } from '@/types';
import { formatDateTime } from '@/utils';
import { ShieldCheck, Eye } from 'lucide-react';

const actionColors: Record<string, string> = {
  create: 'bg-success/10 text-success',
  update: 'bg-info/10 text-info',
  delete: 'bg-destructive/10 text-destructive',
  login: 'bg-primary/10 text-primary',
  logout: 'bg-muted text-muted-foreground',
  export: 'bg-warning/10 text-warning',
  settings: 'bg-primary/10 text-primary',
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    auditService.list({ search, action: actionFilter, page, limit }).then((res) => {
      setLogs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setLoading(false);
    });
  }, [search, actionFilter, page]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'userName',
      header: 'User',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.userName}</p>
          <p className="text-xs text-muted-foreground capitalize">{row.userRole}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => (
        <Badge variant="outline" className={`capitalize ${actionColors[row.action] || 'bg-muted'}`}>
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      cell: (row) => <span className="text-sm">{row.module}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.description}</span>,
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      cell: (row) => <span className="text-xs font-mono text-muted-foreground">{row.ipAddress}</span>,
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      cell: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.timestamp)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedLog(row); }}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all user actions and system changes"
        icon={ShieldCheck}
      />

      <Card className="shadow-soft">
        <div className="p-4 border-b">
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search audit logs...' }}
            filters={[
              {
                label: 'Action',
                value: actionFilter,
                onChange: (v) => { setActionFilter(v); setPage(1); },
                options: [
                  { label: 'All Actions', value: 'all' },
                  { label: 'Create', value: 'create' },
                  { label: 'Update', value: 'update' },
                  { label: 'Delete', value: 'delete' },
                  { label: 'Login', value: 'login' },
                  { label: 'Logout', value: 'logout' },
                  { label: 'Export', value: 'export' },
                  { label: 'Settings', value: 'settings' },
                ],
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          data={logs}
          isLoading={loading}
          onRowClick={(row) => setSelectedLog(row)}
          emptyTitle="No audit logs found"
          emptyDescription="Try adjusting your filters."
        />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </Card>

      {/* Detail Drawer */}
      <Sheet open={Boolean(selectedLog)} onOpenChange={(v) => !v && setSelectedLog(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Audit Log Details</SheetTitle>
            <SheetDescription>Detailed information about this action</SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">User</p>
                  <p className="text-sm font-medium">{selectedLog.userName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{selectedLog.userRole}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Action</p>
                  <Badge variant="outline" className={`capitalize ${actionColors[selectedLog.action] || 'bg-muted'}`}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Module</p>
                  <p className="text-sm">{selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Entity</p>
                  <p className="text-sm">{selectedLog.entityName}</p>
                  <p className="text-xs font-mono text-muted-foreground">{selectedLog.entityId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedLog.description}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">IP Address</p>
                  <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-sm">{formatDateTime(selectedLog.timestamp)}</p>
                </div>
                {selectedLog.changes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Changes</p>
                    <div className="space-y-2">
                      {Object.entries(selectedLog.changes).map(([field, change]) => (
                        <div key={field} className="rounded-lg border p-2">
                          <p className="text-xs font-medium mb-1">{field}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-destructive line-through">{String(change.from)}</span>
                            <span>→</span>
                            <span className="text-success">{String(change.to)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
