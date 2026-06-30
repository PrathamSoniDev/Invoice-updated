import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Menu, Search, Sun, Moon, Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { getInitials } from '@/utils';

export function TopNavbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { setMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebar(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search invoices, customers, payments..."
          className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Badge variant="secondary" className="text-xs">3 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { title: 'Payment Received', desc: 'Invoice INV-2025-1005 was paid', time: '2m ago' },
              { title: 'Invoice Overdue', desc: 'Invoice INV-2025-1002 is overdue', time: '1h ago' },
              { title: 'New Customer', desc: 'TechFlow Solutions was added', time: '3h ago' },
            ].map((notif, i) => (
              <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 py-2.5">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">{notif.title}</span>
                  <span className="text-xs text-muted-foreground">{notif.time}</span>
                </div>
                <span className="text-xs text-muted-foreground">{notif.desc}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role || 'admin'}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
