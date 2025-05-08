import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store';
import { db } from '@/lib/firebase'; 
import { collection, getDocs, addDoc } from 'firebase/firestore';


interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Product) => void; // Changed to accept full Product object
  filterProducts: () => void;
  clearSearchAndResults: () => void;
  loadInitialProducts: (initialProducts: Product[]) => void;
  fetchProductsFromFirestore: () => Promise<void>;
}


export const useProductStore = create<ProductState>()(
  devtools( 
    (set, get) => ({
      searchTerm: '',
      products: [],
      filteredProducts: [],

      loadInitialProducts: (initialProducts) => {
        set({ products: initialProducts });
        get().filterProducts(); 
      },

      setSearchTerm: (term) => {
        set({ searchTerm: term });
        get().filterProducts();
      },
      
      fetchProductsFromFirestore: async () => {
        const { isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        if (authIsLoading || !isAuthenticated) {
          set({ products: [], filteredProducts: []}); // Clear products if not authenticated or still loading
          return;
        }
        try {
          const productCollection = collection(db, 'products');
          const productSnapshot = await getDocs(productCollection);
          const productList: Product[] = productSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              code: data.code,
              price: data.price,
              serverId: 'firestore', 
            };
          });
          set({
            products: productList,
          });
          get().filterProducts(); // Filter after fetching
        } catch (error) {
          console.error('Error fetching products from Firestore:', error);
        }
      },

      // addProduct now expects a full Product object, typically after it's saved to Firestore
      addProduct: (newProductWithId) => {
        const { userRole, isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        if (authIsLoading || !isAuthenticated || userRole !== 'admin') {
            console.warn("Attempted to add product to store without admin privileges or while auth loading.");
            return;
        }
        
        set((state) => ({
            products: [...state.products, newProductWithId],
        }));
        get().filterProducts(); // Re-filter products after adding
      },

      filterProducts: () => {
        const { isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        if (authIsLoading || !isAuthenticated) {
            set({ filteredProducts: [] });
            return;
        }

        const { products, searchTerm } = get();
        if (!searchTerm.trim()) {
          set({ filteredProducts: products }); 
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
    { name: "ProductStore" } 
  )
);


if (typeof window !== 'undefined') {
  // Initial fetch when the store is created and auth state is resolved
  const initialAuth = useAuthStore.getState();
  if (!initialAuth.isLoading && initialAuth.isAuthenticated) {
    useProductStore.getState().fetchProductsFromFirestore();
  } else if (!initialAuth.isLoading && !initialAuth.isAuthenticated) {
    useProductStore.getState().clearSearchAndResults();
  }

  // Subscribe to auth store changes
  useAuthStore.subscribe(
    (currentAuthState, previousAuthState) => {
      const productStore = useProductStore.getState();
      
      // Case 1: Auth just finished loading
      if (previousAuthState.isLoading && !currentAuthState.isLoading) {
        if (currentAuthState.isAuthenticated) {
          console.log("ProductStore: Auth loaded, user authenticated. Fetching products.");
          productStore.fetchProductsFromFirestore();
        } else {
          console.log("ProductStore: Auth loaded, user not authenticated. Clearing products.");
          productStore.clearSearchAndResults();
          set({ products: [] }); // Also clear the main products list
        }
      }
      // Case 2: User logs in (and auth was already loaded)
      else if (!previousAuthState.isAuthenticated && currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: User logged in. Fetching products.");
        productStore.fetchProductsFromFirestore();
      }
      // Case 3: User logs out (and auth was already loaded)
      else if (previousAuthState.isAuthenticated && !currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: User logged out. Clearing products.");
        productStore.clearSearchAndResults();
        set({ products: [] }); // Also clear the main products list
      }
    }
  );
}