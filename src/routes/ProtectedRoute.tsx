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
  // console.log("========== ProtectedRoute ==========");
  // console.log("Authenticated:", isAuthenticated);
  // console.log("User:", user);
  // console.log("Role:", user?.role);
  // console.log("Permissions:", user?.permissions);
  // console.log("Module:", module);
  // console.log("Admin Only:", adminOnly);


  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const isSuperAdmin = user?.role === 'super_admin';

  const isAdmin =
  user &&
  ['admin', 'super_admin'].includes(user.role);

  if (adminOnly && !isAdmin) {
  console.log("❌ Failed adminOnly check");
  return <AccessDenied />;
}

if (
  module &&
  !isSuperAdmin &&
  !user?.permissions?.includes(module)
) {
  console.log("❌ Failed permission check");
  console.log("module =", module);
  console.log("permissions =", user?.permissions);

  return <AccessDenied />;
}

if (
  module &&
  !adminOnly &&
  !isSuperAdmin &&
  !isModuleEnabled(module)
) {
  console.log(" Module disabled");

  return <ModuleDisabled moduleName={module} />;
}

// console.log(" Route allowed");

  return <>{children}</>;
}