import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { searchIndex, type SearchResult } from '@/store/searchIndexStore';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types';
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
import { Menu, Search, Sun, Moon, Bell, User, Settings, LogOut, ChevronDown, FileText, Users, CreditCard, ArrowRight } from 'lucide-react';
import { getInitials, timeAgo } from '@/utils';

const RESULT_ICON = {
  invoice: FileText,
  customer: Users,
  'payment-link': CreditCard,
  nav: ArrowRight,
} as const;

export function TopNavbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { setMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const [latest, count] = await Promise.all([
        notificationService.getLatest(3),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(latest);
      setUnreadCount(count);
    } catch (err) {
      // Non-critical — the bell just stays empty/quiet rather than blocking anything.
      console.error('[TopNavbar] failed to load notifications:', err instanceof Error ? err.message : err);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Light polling so the bell reflects new payment/invoice events without
    // needing a full realtime subscription for a low-frequency feature.
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.error('[TopNavbar] failed to mark notification read:', err instanceof Error ? err.message : err);
      }
    }
    navigate('/notifications');
  };

  // Cmd/Ctrl+K focuses the search box from anywhere in the app.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setResults(searchIndex(value, user?.permissions, user?.role));
    setOpen(value.trim().length > 0);
  }

  function handleSelect(result: SearchResult) {
    navigate(result.path);
    setQuery('');
    setResults([]);
    setOpen(false); 
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 lg:px-6">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebar(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div ref={containerRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(query.trim().length > 0)}
          placeholder="Search invoices, customers, payments..."
          className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>

        {open && (
          <div className="absolute top-full mt-2 w-full rounded-lg border bg-popover shadow-lg overflow-hidden z-50">
            {results.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No matches in currently loaded data. Visit the Invoices, Customers, or
                Payment Links page to load more.
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((r) => {
                  const Icon = RESULT_ICON[r.type];
                  return (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        onClick={() => handleSelect(r)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 ml-auto">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
          {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu onOpenChange={(isOpen) => { if (isOpen) loadNotifications(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                You're all caught up.
              </div>
            ) : (
              notifications.map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start gap-1 py-2.5 cursor-pointer"
                  onSelect={(e) => { e.preventDefault(); handleNotificationClick(notif); }}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {!notif.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      {notif.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(notif.createdAt)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{notif.message}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary cursor-pointer" onClick={() => navigate('/notifications')}>
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