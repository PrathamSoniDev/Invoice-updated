import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ChartWrapper } from '@/components/common/ChartWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useState, useEffect } from 'react';
import { adminApi } from '@/utils/api';
import { BarChart3, Activity, Zap, HardDrive, TrendingUp, Loader2 } from 'lucide-react';

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

interface ApiUsageData {
  date: string;
  requests: number;
  errors: number;
}

interface FeatureUsageData {
  feature: string;
  usage: number;
}

interface StorageUsageData {
  category: string;
  used: number;
  total: number;
}

interface ActivityData {
  id: string;
  userName: string;
  description: string;
  entity: string;
  timestamp: string;
}

export function UsageAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [apiUsage, setApiUsage] = useState<ApiUsageData[]>([]);
  const [featureUsage, setFeatureUsage] = useState<FeatureUsageData[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsageData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);
  const [stats, setStats] = useState({ totalRequests: 0, totalErrors: 0, activeUsers: 0, storageUsed: '0 GB' });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [apiData, featureData, storageData, activityData, statsData] = await Promise.all([
        adminApi.getApiUsage().catch(() => ({ data: [] })),
        adminApi.getFeatureUsage().catch(() => ({ data: [] })),
        adminApi.getStorageUsage().catch(() => ({ data: [] })),
        adminApi.getActivityLogs({ limit: 10 }).catch(() => ({ data: [] })),
        adminApi.getApiUsageStats().catch(() => null),
      ]);

      setApiUsage(apiData?.data || []);
      setFeatureUsage(featureData?.data || []);
      setStorageUsage(storageData?.data || []);
      setRecentActivity(activityData?.data || []);

      if (statsData) {
        setStats({
          totalRequests: statsData.totalRequests || 0,
          totalErrors: statsData.totalErrors || 0,
          activeUsers: statsData.activeUsers || 0,
          storageUsed: statsData.storageUsed || '0 GB',
        });
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalRequests = stats.totalRequests || apiUsage.reduce((s, d) => s + d.requests, 0);
  const totalErrors = stats.totalErrors || apiUsage.reduce((s, d) => s + d.errors, 0);
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(1) : '0.0';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage Analytics"
        description="Monitor API usage, feature adoption, and system resources"
        icon={BarChart3}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="API Requests (30d)" value={totalRequests.toLocaleString()} icon={Zap} accent="primary" trend={{ value: 15.2, label: 'vs last month' }} />
        <StatCard title="Error Rate" value={`${errorRate}%`} icon={Activity} accent="destructive" trend={{ value: -0.5, label: 'vs last month' }} />
        <StatCard title="Active Users" value={stats.activeUsers.toString()} icon={TrendingUp} accent="success" trend={{ value: 8.7, label: 'vs last month' }} />
        <StatCard title="Storage Used" value={stats.storageUsed} icon={HardDrive} accent="info" trend={{ value: 3.1, label: 'vs last month' }} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartWrapper title="API Usage" description="Daily API requests and errors" icon={Zap}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={apiUsage}>
              <defs>
                <linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#apiGrad)" name="Requests" />
              <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} fill="hsl(var(--destructive))" fillOpacity={0.1} name="Errors" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Feature Usage" description="Most used features" icon={Activity}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={featureUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="%" />
              <YAxis type="category" dataKey="feature" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="usage" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Storage & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" /> Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {storageUsage.map((item) => {
              const pct = (item.used / item.total) * 100;
              return (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">{item.used} GB / {item.total} GB</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
            {storageUsage.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No storage data available</p>
            )}
          </CardContent>
        </Card>

        <ChartWrapper title="User Activity Distribution" description="By activity type" icon={Activity}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Invoices', value: 35, color: 'hsl(var(--primary))' },
                  { name: 'Customers', value: 25, color: 'hsl(var(--success))' },
                  { name: 'Payments', value: 20, color: 'hsl(var(--info))' },
                  { name: 'Reports', value: 12, color: 'hsl(var(--warning))' },
                  { name: 'Settings', value: 8, color: 'hsl(var(--muted-foreground))' },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.value}%`}
              >
                {['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Recent Activity Table */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent User Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentActivity.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {(log.userName || 'System').split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{log.description}</p>
                <p className="text-xs text-muted-foreground">{log.entity}</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No activity data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
