
import { fmtDate, fmtDateTime } from '@/lib/utils';
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Bell, Moon, Sun, Sparkles, Home, CheckCheck } from 'lucide-react';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNavigate } from 'react-router-dom';
import useFetch from '@/hooks/useFetch';
import { postData } from '@/lib/Api';

interface TopBarProps {
  currentPage?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  approval_request: number | null;
  approval_request_type: string | null;
  approval_request_status: string | null;
  created_at: string;
}

const TopBar = ({ currentPage = 'Dashboard' }: TopBarProps) => {
  const [isDark, setIsDark] = React.useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: countData, refetch: refetchCount } = useFetch<{ count: number }>(
    'approvals/notifications/unread_count/',
    { refetchInterval: 60000 }
  );

  const { data: notifData, refetch: refetchList } = useFetch<{ results: Notification[] }>(
    open ? 'approvals/notifications/?page_size=5' : '',
    { enabled: open }
  );

  const unreadCount = countData?.count ?? 0;
  const notifications: Notification[] = (notifData as any)?.results ?? (Array.isArray(notifData) ? notifData : []);

  const markRead = async (id: number) => {
    try {
      await postData({ url: `approvals/notifications/${id}/read/`, data: {} });
      refetchCount();
      refetchList();
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await postData({ url: 'approvals/notifications/mark_all_read/', data: {} });
      refetchCount();
      refetchList();
    } catch {}
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="h-12 bg-background flex items-center justify-between px-4 relative border-b border-border">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Home className="h-3.5 w-3.5" />
          <span>Dashboard</span>
          {currentPage !== 'Dashboard' && (
            <>
              <span>/</span>
              <span className="text-foreground font-medium">{currentPage}</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Ask AI Anything */}
      <div className="flex items-center gap-2 flex-1 justify-center">
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
        <Input
          placeholder="Ask AI Anything"
          className="max-w-md bg-accent/50 border-border h-7 text-xs"
        />
      </div>

      {/* Right: Icons */}
      <div className="flex items-center gap-1 flex-1 justify-end">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme}>
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 relative">
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-3 py-2 border-b last:border-0 cursor-pointer hover:bg-accent/50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    onClick={() => {
                      markRead(n.id);
                      if (n.approval_request) {
                        navigate('/approvals');
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <div className={!n.is_read ? '' : 'pl-3.5'}>
                        <p className="text-xs font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {fmtDate(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => { navigate('/approvals'); setOpen(false); }}
              >
                View all approvals
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TopBar;
