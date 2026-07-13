import { Outlet } from 'react-router-dom';
import { Sidebar, MobileSidebar } from '@/components/layout/Sidebar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { motion } from 'framer-motion';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="container mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
