import { create } from 'zustand';

type UserRole = 'admin' | 'user' | 'guest';

interface AuthState {
  userRole: UserRole;
  loginAsAdmin: () => void;
  loginAsUser: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userRole: 'guest', // Default role is guest (not logged in)
  loginAsAdmin: () => set({ userRole: 'admin' }),
  loginAsUser: () => set({ userRole: 'user' }),
  logout: () => set({ userRole: 'guest' }),
}));
