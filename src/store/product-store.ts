import { create } from 'zustand';
import type { Product } from '@/lib/types';

interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  // Note: In a real distributed system, fetching/searching would be async operations
  // calling APIs on different servers. Here, we simulate it locally.
  filterProducts: () => void;
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
    const { products, searchTerm } = get();
    if (!searchTerm.trim()) {
      set({ filteredProducts: products }); // Show all products if search is empty
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
}));

// Initialize filtered products on load
useProductStore.getState().filterProducts();
