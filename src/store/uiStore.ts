import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebar: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
  setCommandOpen: (open) => set({ commandOpen: open }),
}));
