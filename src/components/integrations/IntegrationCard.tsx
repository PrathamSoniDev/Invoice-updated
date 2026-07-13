import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useIntegrationStore } from '@/store/integrationStore';
import { formatDateTime } from '@/utils';
import {
  Link2,
  Unlink,
  Settings,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ExternalIntegration, IntegrationProvider } from '@/types';

const providerIcons: Record<IntegrationProvider, LucideIcon> = {
  tally: Link2,
  busy: Link2,
  zoho_books: Link2,
  marg: Link2,
  sap: Link2,
  dynamics: Link2,
  quickbooks: Link2,
  xero: Link2,
};

const providerColors: Record<IntegrationProvider, string> = {
  tally: 'bg-orange-50 text-orange-700 border-orange-200',
  busy: 'bg-blue-50 text-blue-700 border-blue-200',
  zoho_books: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  marg: 'bg-purple-50 text-purple-700 border-purple-200',
  sap: 'bg-sky-50 text-sky-700 border-sky-200',
  dynamics: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  quickbooks: 'bg-green-50 text-green-700 border-green-200',
  xero: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusConfig = {
  connected: { label: 'Connected', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
  disconnected: { label: 'Disconnected', icon: Unlink, className: 'bg-muted text-muted-foreground border-muted' },
  error: { label: 'Error', icon: AlertCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { label: 'Pending', icon: Loader2, className: 'bg-warning/10 text-warning border-warning/20' },
};

interface Props {
  integration: ExternalIntegration;
  onConfigure: (integration: ExternalIntegration) => void;
}

export function IntegrationCard({ integration, onConfigure }: Props) {
  const { updateIntegration } = useIntegrationStore();
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const status = statusConfig[integration.status];
  const StatusIcon = status.icon;
  const ProviderIcon = providerIcons[integration.provider];

  const handleConnect = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      updateIntegration(integration.id, { status: 'connected', lastSyncAt: new Date().toISOString() });
      toast.success(`${integration.name} connected successfully`);
    }, 1500);
  };

  const handleDisconnect = () => {
    updateIntegration(integration.id, { status: 'disconnected', lastSyncAt: undefined });
    toast.info(`${integration.name} disconnected`);
  };

  const handleSyncToggle = (key: keyof typeof integration.syncOptions) => {
    updateIntegration(integration.id, {
      syncOptions: { ...integration.syncOptions, [key]: !integration.syncOptions[key] },
    });
  };

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      updateIntegration(integration.id, { lastSyncAt: new Date().toISOString() });
      toast.success(`Manual sync completed for ${integration.name}`);
    }, 2000);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${providerColors[integration.provider]}`}>
              <ProviderIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{integration.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{integration.description}</p>
            </div>
          </div>
          <Badge variant="outline" className={`gap-1 text-[10px] h-6 ${status.className}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        {integration.status === 'connected' && integration.config.connectionName && (
          <div className="text-xs text-muted-foreground space-y-0.5 bg-muted/50 rounded-md p-2.5">
            <p><span className="font-medium">Connection:</span> {integration.config.connectionName}</p>
            {integration.config.companyCode && (
              <p><span className="font-medium">Company:</span> {integration.config.companyCode}</p>
            )}
          </div>
        )}

        {integration.status === 'connected' && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Synchronization</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(
                [
                  ['customers', 'Customers'],
                  ['invoices', 'Invoices'],
                  ['products', 'Products'],
                  ['taxes', 'Taxes'],
                  ['payments', 'Payments'],
                  ['chartOfAccounts', 'Chart of Accounts'],
                ] as [keyof typeof integration.syncOptions, string][]
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={`${integration.id}-${key}`} className="text-xs cursor-pointer">{label}</Label>
                  <Switch
                    id={`${integration.id}-${key}`}
                    checked={integration.syncOptions[key]}
                    onCheckedChange={() => handleSyncToggle(key)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {integration.status === 'connected' && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {integration.lastSyncAt ? (
                <span>Last sync: {formatDateTime(integration.lastSyncAt)}</span>
              ) : (
                <span>Never synced</span>
              )}
            </div>
            {integration.nextSyncAt && (
              <span>Next: {formatDateTime(integration.nextSyncAt)}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {integration.status === 'connected' ? (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleDisconnect}>
                <Unlink className="h-3.5 w-3.5" /> Disconnect
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onConfigure(integration)}>
                <Settings className="h-3.5 w-3.5" /> Configure
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 ml-auto"
                onClick={handleManualSync}
                disabled={syncing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </>
          ) : integration.status === 'pending' ? (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleConnect} disabled={testing}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                {testing ? 'Testing...' : 'Connect'}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onConfigure(integration)}>
                <Settings className="h-3.5 w-3.5" /> Configure
              </Button>
            </>
          ) : (
            <>
              <Button variant="default" size="sm" className="h-8 text-xs gap-1" onClick={handleConnect} disabled={testing}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                {testing ? 'Testing...' : 'Connect'}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onConfigure(integration)}>
                <Settings className="h-3.5 w-3.5" /> Configure
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
