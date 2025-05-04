import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserRole } from '@/lib/types'; // Assuming UserRole is 'admin' | 'user' | 'guest'

interface AuthState {
  username: string | null;
  userRole: UserRole | 'guest'; // Use 'guest' for logged-out state
  isAuthenticated: boolean;
  login: (username: string, role: UserRole) => void; // Called after successful API login
  logout: () => Promise<void>; // Handles API call and state update
  checkAuthStatus: () => void; // Optional: Check status on app load
}

// Function to attempt decoding JWT - run only on client-side
const decodeToken = (): { username: string; role: UserRole } | null => {
    if (typeof window === 'undefined') return null; // Prevent server-side execution

    // This is a simplified check. In a real app, you'd verify the token
    // using a library like jwt-decode ONLY FOR CLIENT-SIDE CONVENIENCE,
    // but rely on the backend/middleware for actual security verification.
    // NEVER trust client-side decoding for authorization.
    try {
        // Example using jwt-decode (install if needed: npm install jwt-decode)
        // import { jwtDecode } from 'jwt-decode';
        // const token = document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
        // if (!token) return null;
        // const decoded: { username: string; role: UserRole, exp: number } = jwtDecode(token);
        // // Optional: Check expiration client-side (though backend MUST verify)
        // if (decoded.exp * 1000 < Date.now()) {
        //    console.warn("Client-side token expired");
        //    // Clear cookie manually if needed, or let backend handle expiry
        //    document.cookie = 'auth_token=; Max-Age=0; path=/;';
        //    return null;
        // }
        // return { username: decoded.username, role: decoded.role };

        // Placeholder: Simulate getting data perhaps from localStorage or initial props
        // In this setup, we rely on the middleware and API setting the cookie,
        // and the AuthControls component to fetch initial state if needed.
         return null;

    } catch (error) {
        console.error("Error decoding token client-side:", error);
        // Clear invalid token cookie?
        // document.cookie = 'auth_token=; Max-Age=0; path=/;';
        return null;
    }
};


export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            username: null,
            userRole: 'guest',
            isAuthenticated: false,

            login: (username, role) => {
                console.log(`AuthStore: Logging in user ${username} with role ${role}`);
                set({
                    username,
                    userRole: role,
                    isAuthenticated: true,
                });
            },

            logout: async () => {
                console.log("AuthStore: Logging out user");
                try {
                    // Call the logout API endpoint
                    const response = await fetch('/api/auth/logout', { method: 'POST' });
                    if (!response.ok) {
                        console.error('Logout API call failed');
                        // Decide if you still want to clear state client-side
                    }
                } catch (error) {
                    console.error('Error during logout API call:', error);
                } finally {
                    // Always clear client-side state regardless of API call success/failure
                    set({
                        username: null,
                        userRole: 'guest',
                        isAuthenticated: false,
                    });
                     // Manually clear potentially persisted state if needed
                     localStorage.removeItem('auth-storage'); // Adjust key based on persist config
                }
            },

            // This function is tricky with server components.
            // It's better to fetch auth status within components/pages
            // using server-side props or client-side effects based on cookies.
            checkAuthStatus: () => {
                 if (typeof window === 'undefined') return; // Client-side only

                 // Re-check cookie on client-side, useful for SPA navigations
                 // but middleware handles the initial server-side protection.
                 const tokenExists = document.cookie.includes('auth_token=');

                 if (!tokenExists && get().isAuthenticated) {
                      console.log("AuthStore: Token missing, logging out client-side.");
                      // If the cookie is gone but state says logged in, force logout
                      get().logout();
                 } else if (tokenExists && !get().isAuthenticated) {
                     // If token exists but state is logged out (e.g., after refresh with persisted state)
                     // Attempt to decode - INSECURE for authorization, just for UI state
                     const decoded = decodeToken();
                     if (decoded) {
                         console.log("AuthStore: Rehydrating auth state from token.");
                         set({ username: decoded.username, userRole: decoded.role, isAuthenticated: true });
                     } else {
                         // Invalid or expired token found during check
                          console.log("AuthStore: Invalid/Expired token found during check, ensuring logout state.");
                         if (get().isAuthenticated) { // Ensure logout state if token is bad
                            get().logout(); // This will also clear the cookie via API potentially
                         }
                     }
                 }
            },
        }),
        {
            name: 'auth-storage', // Name for localStorage key
            storage: createJSONStorage(() => localStorage), // Use localStorage
             // Only persist a subset of the state if needed
             // partialize: (state) => ({ isAuthenticated: state.isAuthenticated, userRole: state.userRole, username: state.username }),
             // Skip hydration on server
            // skipHydration: true,
             onRehydrateStorage: (state) => {
                 console.log("AuthStore: Hydration finished.");
                 // You could potentially run checkAuthStatus here, but be careful about client/server mismatch
                 // return (state, error) => {
                 //    if (error) {
                 //        console.error("AuthStore: An error occurred during hydration", error);
                 //    } else {
                 //        console.log("AuthStore: Hydration finished.");
                 //        // state?.checkAuthStatus?.(); // Run check after hydration
                 //    }
                 // }
             }
        }
    )
);

// Initial check on client-side load (consider moving to a root client component)
if (typeof window !== 'undefined') {
    // useAuthStore.getState().checkAuthStatus();
    // Instead of immediate check, let components handle fetching/checking
}
