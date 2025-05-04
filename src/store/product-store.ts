import { create } from 'zustand';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store'; // Import auth store

interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  filterProducts: () => void;
  clearSearchResults: () => void; // New action to clear results
}

// Simulate generating unique IDs - in a real app, this would likely come from a DB or server
let productIdCounter = 0;

export const useProductStore = create<ProductState>((set, get) => ({
  searchTerm: '',
  products: [ // Initial dummy data
    { id: 'server1-101', name: 'Laptop Pro', code: 101, price: 1200, serverId: 'server1' },
    { id: 'server2-205', name: 'Wireless Mouse', code: 205, price: 25, serverId: 'server2' },
    { id: 'server1-102', name: 'Monitor UltraWide', code: 102, price: 450, serverId: 'server1' },
    { id: 'server3-301', name: 'Keyboard Mechanical', code: 301, price: 75, serverId: 'server3' },
    { id: 'server2-206', name: 'USB-C Hub', code: 206, price: 40, serverId: 'server2' },
  ],
  filteredProducts: [], // Initially empty, populated by filterProducts

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().filterProducts(); // Trigger filtering when search term changes
  },

  addProduct: (productData) => {
    // Ensure only admin can add - although UI should prevent this, add a safeguard
    if (useAuthStore.getState().userRole !== 'admin') {
        console.warn("Attempted to add product without admin privileges.");
        return;
    }

    const newProduct: Product = {
      ...productData,
      // Simple ID generation for this simulation
      id: `local-${productIdCounter++}`,
      serverId: 'local' // Mark products added via the UI
    };
    set((state) => ({
      products: [...state.products, newProduct],
    }));
    get().filterProducts(); // Re-filter after adding a product
  },

  filterProducts: () => {
    // Prevent filtering if user is guest
    if (useAuthStore.getState().userRole === 'guest') {
        set({ filteredProducts: [] });
        return;
    }

    const { products, searchTerm } = get();
    if (!searchTerm.trim()) {
      // Show all products if search is empty (and user is logged in)
      set({ filteredProducts: products });
      return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase().split(' ').filter(term => term); // Split into words

    const filtered = products.filter((product) => {
        const nameLower = product.name.toLowerCase();
        const codeString = product.code.toString();

        // Check if *all* search terms are present in either name or code
        return lowerCaseSearchTerm.every(term =>
            nameLower.includes(term) || codeString.includes(term)
        );
    });
    set({ filteredProducts: filtered });
  },

  clearSearchResults: () => {
      set({ searchTerm: '', filteredProducts: [] });
  }
}));

// Subscribe to auth store changes to clear product state on logout
useAuthStore.subscribe((state, prevState) => {
    // If user changes from logged-in (admin/user) to guest
    if (prevState.userRole !== 'guest' && state.userRole === 'guest') {
        useProductStore.getState().clearSearchResults();
    }
    // If user logs in (from guest to admin/user), trigger initial filter
    else if (prevState.userRole === 'guest' && state.userRole !== 'guest') {
         useProductStore.getState().filterProducts();
    }
});


// Initialize filtered products based on initial auth state
const initialAuthRole = useAuthStore.getState().userRole;
if (initialAuthRole !== 'guest') {
    useProductStore.getState().filterProducts();
}
