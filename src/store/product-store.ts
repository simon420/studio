import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store';

interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'serverId'>) => void;
  filterProducts: () => void;
  clearSearchAndResults: () => void;
  loadInitialProducts: (initialProducts: Product[]) => void;
}

let productIdCounter = Date.now();

export const useProductStore = create<ProductState>()(
  devtools( // Optional: For Zustand devtools
    (set, get) => ({
      searchTerm: '',
      products: [
        { id: 'server1-101', name: 'Laptop Pro', code: 101, price: 1200, serverId: 'server1' },
        { id: 'server2-205', name: 'Wireless Mouse', code: 205, price: 25, serverId: 'server2' },
        { id: 'server1-102', name: 'Monitor UltraWide', code: 102, price: 450, serverId: 'server1' },
        { id: 'server3-301', name: 'Keyboard Mechanical', code: 301, price: 75, serverId: 'server3' },
        { id: 'server2-206', name: 'USB-C Hub', code: 206, price: 40, serverId: 'server2' },
      ],
      filteredProducts: [],

      loadInitialProducts: (initialProducts) => {
        set({ products: initialProducts });
        get().filterProducts(); // Filter after loading new products
      },

      setSearchTerm: (term) => {
        set({ searchTerm: term });
        get().filterProducts();
      },

      addProduct: (productData) => {
        const { userRole, isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        // Defer action if auth is still loading, or if not admin
        if (authIsLoading || !isAuthenticated || userRole !== 'admin') {
            console.warn("Attempted to add product without admin privileges or while auth loading.");
            return;
        }

        const newProduct: Product = {
          ...productData,
          id: `local-${productIdCounter++}`,
          serverId: 'local'
        };
        set((state) => ({
          products: [...state.products, newProduct],
        }));
        get().filterProducts();
      },

      filterProducts: () => {
        const { isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        // If auth is loading, or user is not authenticated, clear results.
        if (authIsLoading || !isAuthenticated) {
            set({ filteredProducts: [] });
            return;
        }

        const { products, searchTerm } = get();
        if (!searchTerm.trim()) {
          set({ filteredProducts: products }); // Show all if search is empty and authenticated
          return;
        }

        const lowerCaseSearchTerm = searchTerm.toLowerCase().split(' ').filter(term => term);
        const filtered = products.filter((product) => {
            const nameLower = product.name.toLowerCase();
            const codeString = product.code.toString();
            return lowerCaseSearchTerm.every(term =>
                nameLower.includes(term) || codeString.includes(term)
            );
        });
        set({ filteredProducts: filtered });
      },

      clearSearchAndResults: () => {
          set({ searchTerm: '', filteredProducts: [] });
      }
    }),
    { name: "ProductStore" } // Name for devtools
  )
);

// Subscribe to auth store changes
if (typeof window !== 'undefined') {
  useAuthStore.subscribe(
    (currentAuthState, previousAuthState) => {
      const productStoreActions = useProductStore.getState();

      // If auth state finished loading (isLoading transitioned from true to false)
      if (previousAuthState.isLoading && !currentAuthState.isLoading) {
        if (currentAuthState.isAuthenticated) {
          console.log("ProductStore: Auth confirmed, filtering products.");
          productStoreActions.filterProducts();
        } else {
          console.log("ProductStore: Auth confirmed (not authenticated), clearing products.");
          productStoreActions.clearSearchAndResults();
        }
      }
      // If user logs out (isAuthenticated transitions from true to false)
      // and isLoading is false (meaning it's not an initial load state change)
      else if (previousAuthState.isAuthenticated && !currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: User logged out, clearing search and results.");
        productStoreActions.clearSearchAndResults();
      }
      // If user logs in (isAuthenticated transitions from false to true)
      // and isLoading is false
      else if (!previousAuthState.isAuthenticated && currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: User logged in, filtering products.");
        productStoreActions.filterProducts();
      }
    }
  );

  // Initial filter based on auth state when store loads
  // This handles the case where the user is already logged in when the app loads.
  const initialAuth = useAuthStore.getState();
  if (!initialAuth.isLoading) { // Only run if auth state is resolved
    if (initialAuth.isAuthenticated) {
      useProductStore.getState().filterProducts();
    } else {
      useProductStore.getState().clearSearchAndResults();
    }
  }
}
