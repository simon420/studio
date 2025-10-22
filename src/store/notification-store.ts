// src/store/notification-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Notification } from '@/lib/types';

interface NotificationState {
  notifications: Notification[];
  isLoaded: boolean; // To check if state has been rehydrated
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAllAsRead: (idsToMark?: string[]) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: (idsToClear?: string[]) => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        notifications: [],
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
          }));
        },

        markAllAsRead: (idsToMark) => {
          set((state) => {
            if (state.notifications.every(n => n.read)) return {};

            return {
              notifications: state.notifications.map((n) => {
                if (idsToMark) {
                  // Mark specific notifications as read
                  return idsToMark.includes(n.id) ? { ...n, read: true } : n;
                }
                // Mark all as read if no IDs are provided
                return { ...n, read: true };
              }),
            };
          });
        },
        
        deleteNotification: (id: string) => {
            set((state) => ({
                notifications: state.notifications.filter(n => n.id !== id),
            }));
        },

        clearAllNotifications: (idsToClear) => {
          if (idsToClear) {
            set((state) => ({
              notifications: state.notifications.filter(n => !idsToClear.includes(n.id)),
            }));
          } else {
             set({ notifications: [] });
          }
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
