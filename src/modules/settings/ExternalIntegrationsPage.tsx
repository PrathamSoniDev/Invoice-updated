import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { IntegrationConfigDialog } from '@/components/integrations/IntegrationConfigDialog';
import { useIntegrationStore } from '@/store/integrationStore';
import { SearchBar } from '@/components/common/SearchBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plug, Activity, Clock } from 'lucide-react';
import type { ExternalIntegration } from '@/types';

export function ExternalIntegrationsPage() {
  const { integrations, syncHistory } = useIntegrationStore();
  const [search, setSearch] = useState('');
  const [configIntegration, setConfigIntegration] = useState<ExternalIntegration | null>(null);

  const filtered = integrations.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const connected = filtered.filter((i) => i.status === 'connected');
  const disconnected = filtered.filter((i) => i.status !== 'connected');

  return (
    <div className="space-y-6">
      <PageHeader
        title="External Integrations"
        description="Connect InvoiceGen with your ERP and accounting software"
        icon={Plug}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search integrations..."
        className="max-w-md"
      />

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Plug className="h-3.5 w-3.5" /> All ({filtered.length})
          </TabsTrigger>
          <TabsTrigger value="connected" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Connected ({connected.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Available ({disconnected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={setConfigIntegration}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Plug className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No integrations found matching your search.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="connected" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {connected.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={setConfigIntegration}
              />
            ))}
          </div>
          {connected.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No connected integrations yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {disconnected.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConfigure={setConfigIntegration}
              />
            ))}
          </div>
          {disconnected.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">All available integrations are connected.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {syncHistory.length > 0 && (
        <div className="pt-6 border-t">
          <h3 className="text-sm font-semibold mb-3">Recent Sync Activity</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Integration</th>
                  <th className="text-left px-4 py-2 font-medium">Type</th>
                  <th className="text-left px-4 py-2 font-medium">Entity</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Records</th>
                  <th className="text-left px-4 py-2 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {syncHistory.slice(0, 5).map((entry) => {
                  const intName = integrations.find((i) => i.id === entry.integrationId)?.name || entry.integrationId;
                  return (
                    <tr key={entry.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{intName}</td>
                      <td className="px-4 py-2 capitalize">{entry.syncType}</td>
                      <td className="px-4 py-2 capitalize">{entry.entityType.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          entry.status === 'completed' ? 'bg-success/10 text-success' :
                          entry.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                          entry.status === 'running' ? 'bg-primary/10 text-primary' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{entry.recordsCount}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(entry.startedAt).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <IntegrationConfigDialog
        open={!!configIntegration}
        onClose={() => setConfigIntegration(null)}
        integration={configIntegration}
      />
    </div>
  );
}
