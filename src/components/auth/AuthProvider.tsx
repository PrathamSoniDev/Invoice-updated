import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoadingState } from '@/components/common/LoadingState';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return <LoadingState className="min-h-screen" />;
  }

  return <>{children}</>;
}
