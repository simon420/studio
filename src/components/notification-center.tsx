'use client';

import * as React from 'react';
import { useNotificationStore } from '@/store/notification-store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, PackagePlus, Edit3, Trash, UserPlus, ShieldCheck, X, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';
import { Separator } from './ui/separator';

function NotificationIcon({ type }: { type: Notification['type'] }) {
    switch (type) {
        case 'product_added':
            return <PackagePlus className="h-4 w-4 text-green-500" />;
        case 'product_updated':
            return <Edit3 className="h-4 w-4 text-blue-500" />;
        case 'product_deleted':
            return <Trash className="h-4 w-4 text-red-500" />;
        case 'admin_request':
            return <ShieldCheck className="h-4 w-4 text-orange-500" />;
        case 'user_registered':
        case 'user_approved':
            return <UserPlus className="h-4 w-4 text-cyan-500" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
}


export default function NotificationCenter() {
  const { notifications, unreadCount, markAllAsRead, isLoaded, deleteNotification, clearAllNotifications } = useNotificationStore();
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    // When popover opens, mark all as read
    if (isOpen && unreadCount > 0) {
      // Delay marking as read to allow user to see the unread state briefly
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  // Sort notifications by timestamp descending
  const sortedNotifications = React.useMemo(() => {
    return [...notifications].sort((a, b) => b.timestamp - a.timestamp);
  }, [notifications]);
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent the popover from closing
    deleteNotification(id);
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAllNotifications();
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {isLoaded && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 justify-center rounded-full p-0"
            >
              {unreadCount}
            </Badge>
          )}
          <span className="sr-only">Apri notifiche</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium">Notifiche</h3>
           {sortedNotifications.length > 0 && (
             <Button variant="ghost" size="sm" onClick={handleClearAll}>
               <Trash2 className="h-4 w-4 mr-1" />
               Svuota
             </Button>
           )}
        </div>
        <ScrollArea className="h-96">
          {isLoaded && sortedNotifications.length > 0 ? (
            <div className="divide-y">
              {sortedNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'group flex items-start gap-3 p-4 transition-colors relative',
                    !notif.read && 'bg-primary/5'
                  )}
                >
                    <div className="mt-1">
                        <NotificationIcon type={notif.type} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm pr-4">{notif.message}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: it })}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDelete(e, notif.id)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Elimina notifica</span>
                    </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mb-2" />
              <p>Nessuna notifica</p>
              <p className="text-xs">Gli eventi recenti appariranno qui.</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
