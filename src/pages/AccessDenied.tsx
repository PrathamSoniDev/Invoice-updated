import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-6">
          <ShieldX className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You don't have permission to access this page. This module may be disabled or your role doesn't include this feature.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="mt-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
