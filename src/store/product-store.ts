import { create } from 'zustand';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store'; // Import auth store

interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'serverId'>) => void; // serverId is now 'local'
  filterProducts: () => void;
  clearSearchAndResults: () => void; // Renamed for clarity
  loadInitialProducts: (initialProducts: Product[]) => void; // To load from server if needed
}

// Simulate generating unique IDs - in a real app, this would likely come from a DB or server
let productIdCounter = Date.now(); // Use timestamp for slightly more unique local IDs

export const useProductStore = create<ProductState>((set, get) => ({
  searchTerm: '',
  products: [ // Initial dummy data (might be replaced by server data)
    { id: 'server1-101', name: 'Laptop Pro', code: 101, price: 1200, serverId: 'server1' },
    { id: 'server2-205', name: 'Wireless Mouse', code: 205, price: 25, serverId: 'server2' },
    { id: 'server1-102', name: 'Monitor UltraWide', code: 102, price: 450, serverId: 'server1' },
    { id: 'server3-301', name: 'Keyboard Mechanical', code: 301, price: 75, serverId: 'server3' },
    { id: 'server2-206', name: 'USB-C Hub', code: 206, price: 40, serverId: 'server2' },
  ],
  filteredProducts: [], // Initially empty, populated by filterProducts

  loadInitialProducts: (initialProducts) => {
    set({ products: initialProducts });
    // Optionally trigger filter if needed after loading
    // get().filterProducts();
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().filterProducts(); // Trigger filtering when search term changes
  },

  addProduct: (productData) => {
    // Ensure only admin can add - middleware should prevent unauthorized access to the page,
    // but API endpoint must also verify. This is a client-side safeguard.
    const { userRole, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || userRole !== 'admin') {
        console.warn("Attempted to add product without admin privileges.");
        // Optionally show a toast message here
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
    // Prevent filtering if user is not authenticated
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
        set({ filteredProducts: [] }); // Clear results if not authenticated
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

  clearSearchAndResults: () => {
      // Clear search term and the filtered results list
      set({ searchTerm: '', filteredProducts: [] });
      // We don't clear the main 'products' list here, only the search results
  }
}));

// Subscribe to auth store changes
const unsubscribeAuth = useAuthStore.subscribe((state, prevState) => {
    // When user logs out (isAuthenticated becomes false)
    if (prevState.isAuthenticated && !state.isAuthenticated) {
        console.log("ProductStore: Auth state changed to logged out, clearing search and results.");
        useProductStore.getState().clearSearchAndResults();
    }
    // When user logs in (isAuthenticated becomes true)
    else if (!prevState.isAuthenticated && state.isAuthenticated) {
         console.log("ProductStore: Auth state changed to logged in, running initial filter.");
         // You might want to fetch fresh products here instead of just filtering local ones
         // For now, just filter the existing products
         useProductStore.getState().filterProducts();
    }
});

// Initialize filtered products based on initial auth state (runs once on store creation)
// This needs to happen *after* the store is created and potentially rehydrated
// We can trigger this from a client component effect instead, or rely on the subscription above.

// Example of how to load initial data (e.g., in a root client component or page)
// async function loadAndSetInitialProducts() {
//   const initialAuthState = useAuthStore.getState();
//   if (initialAuthState.isAuthenticated) {
//      // Fetch products from an API endpoint
//      // const response = await fetch('/api/products');
//      // const initialProducts = await response.json();
//      // useProductStore.getState().loadInitialProducts(initialProducts);
//      useProductStore.getState().filterProducts(); // Filter after potential load
//   }
// }
// loadAndSetInitialProducts(); // Call this appropriately

// Clean up subscription on unmount (though usually store lives for app lifetime)
// () => unsubscribeAuth();

