// src/store/notification-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Notification } from '@/lib/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoaded: boolean; // To check if state has been rehydrated
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        notifications: [],
        unreadCount: 0,
        isLoaded: false, // Will be true after rehydration

        addNotification: (notificationData) => {
          const newNotification: Notification = {
            ...notificationData,
            id: new Date().getTime().toString() + Math.random().toString(), // Simple unique ID
            timestamp: Date.now(),
            read: false,
          };
          set((state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
            unreadCount: state.unreadCount + 1,
          }));
        },

        markAsRead: (id) => {
          set((state) => {
            const notifications = state.notifications.map((n) =>
              n.id === id && !n.read ? { ...n, read: true } : n
            );
            const changed = notifications.some((n, i) => n.read !== state.notifications[i].read);
            if (changed) {
              const newUnreadCount = notifications.filter((n) => !n.read).length;
              return { notifications, unreadCount: newUnreadCount };
            }
            return state; // No change
          });
        },

        markAllAsRead: () => {
          set((state) => {
            if (state.unreadCount === 0) return {};
            return {
              notifications: state.notifications.map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            };
          });
        },

        clearAllNotifications: () => {
          set({ notifications: [], unreadCount: 0 });
        },
      }),
      {
        name: 'notification-storage', // name of item in the storage (must be unique)
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isLoaded = true;
          }
        },
      }
    )
  )
);
