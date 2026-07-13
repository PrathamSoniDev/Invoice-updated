import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { useModuleStore } from '@/store/moduleStore';
import { useAuthStore } from '@/store/authStore';
import { navSections } from '@/routes/navConfig';
import { Receipt, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { isModuleEnabled } = useModuleStore();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin';

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-sidebar-border px-4', sidebarCollapsed && 'justify-center px-0')}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-md shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-lg font-bold tracking-tight leading-none">InvoiceGen</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Premium Invoicing</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.roles && (!user || !item.roles.includes(user.role))) return false;
            if (item.module !== 'admin' && !user?.permissions.includes(item.module)) return false;
            return isModuleEnabled(item.module);
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="space-y-1">
              {!sidebarCollapsed && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {section.title}
                </p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        sidebarCollapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
            sidebarCollapsed && 'justify-center px-0'
          )}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const { mobileSidebarOpen, setMobileSidebar } = useUIStore();
  const { isModuleEnabled } = useModuleStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebar(false)}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col border-r bg-sidebar lg:hidden"
          >
            <div className="flex h-16 items-center border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-md">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold tracking-tight leading-none">InvoiceGen</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Premium Invoicing</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
              {navSections.map((section) => {
                const visibleItems = section.items.filter((item) => {
                  if (item.adminOnly && !isAdmin) return false;
                  if (item.roles && (!user || !item.roles.includes(user.role))) return false;
                  if (item.module !== 'admin' && !user?.permissions.includes(item.module)) return false;
                  return isModuleEnabled(item.module);
                });
                if (visibleItems.length === 0) return null;
                return (
                  <div key={section.title} className="space-y-1">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {section.title}
                    </p>
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileSidebar(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )
                          }
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
