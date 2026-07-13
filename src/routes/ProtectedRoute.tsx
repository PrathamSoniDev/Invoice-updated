import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useModuleStore } from '@/store/moduleStore';
import type { ModuleKey } from '@/types';
import { AccessDenied } from '@/pages/AccessDenied';
import { ModuleDisabled } from '@/pages/ModuleDisabled';

interface ProtectedRouteProps {
  children: React.ReactNode;
  module?: ModuleKey;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, module, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const { isModuleEnabled } = useModuleStore();
  const { user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <AccessDenied />;
  }

  if (module && !user?.permissions.includes(module)) {
    return <AccessDenied />;
  }

  if (module && !adminOnly && !isModuleEnabled(module)) {
    return <ModuleDisabled moduleName={module} />;
  }

  return <>{children}</>;
}
