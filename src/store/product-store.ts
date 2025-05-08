import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store';
import { db } from '@/lib/firebase'; 
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';


interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Product) => void; 
  updateProductInStoreAndFirestore: (productId: string, updatedData: Partial<Pick<Product, 'name' | 'price'>>) => Promise<void>;
  deleteProductFromStoreAndFirestore: (productId: string) => Promise<void>;
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
          set({ products: [], filteredProducts: []}); 
          return;
        }
        try {
          const productCollection = collection(db, 'products');
          const productSnapshot = await getDocs(productCollection);
          const productList: Product[] = productSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name,
              code: data.code,
              price: data.price,
              serverId: 'firestore', 
              addedByUid: data.addedByUid,
              addedByEmail: data.addedByEmail,
            };
          });
          set({
            products: productList,
          });
          get().filterProducts(); 
        } catch (error) {
          console.error('Error fetching products from Firestore:', error);
        }
      },

      addProduct: (newProductWithId) => {
        const { userRole, isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        if (authIsLoading || !isAuthenticated || userRole !== 'admin') {
            console.warn("Attempted to add product to store without admin privileges or while auth loading.");
            return;
        }
        
        set((state) => ({
            products: [...state.products, newProductWithId],
        }));
        get().filterProducts(); 
      },

      updateProductInStoreAndFirestore: async (productId, updatedData) => {
        const { userRole, isAuthenticated, uid } = useAuthStore.getState();
        if (!isAuthenticated || userRole !== 'admin') {
          throw new Error("User must be an admin to update products.");
        }

        const productDocRef = doc(db, 'products', productId);
        
        // Ensure the admin owns this product (extra check, though UI should prevent this)
        const currentProduct = get().products.find(p => p.id === productId);
        if (currentProduct?.addedByUid !== uid) {
            throw new Error("Admin can only update their own products.");
        }

        // Firestore update
        await updateDoc(productDocRef, updatedData);

        // Zustand store update
        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...updatedData } : product
          ),
        }));
        get().filterProducts(); // Re-filter products after updating
      },

      deleteProductFromStoreAndFirestore: async (productId) => {
        const { userRole, isAuthenticated, uid } = useAuthStore.getState();
         if (!isAuthenticated || userRole !== 'admin') {
          throw new Error("User must be an admin to delete products.");
        }

        const productDocRef = doc(db, 'products', productId);

        // Ensure the admin owns this product
        const currentProduct = get().products.find(p => p.id === productId);
        if (currentProduct?.addedByUid !== uid) {
            throw new Error("Admin can only delete their own products.");
        }

        // Firestore delete
        await deleteDoc(productDocRef);

        // Zustand store delete
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }));
        get().filterProducts(); // Re-filter products after deleting
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
          const { isAuthenticated } = useAuthStore.getState();
          if (isAuthenticated) {
             set({ searchTerm: '', filteredProducts: [], products: [] });
          } else {
            set({ searchTerm: '', filteredProducts: [], products: [] });
          }
      }
    }),
    { name: "ProductStore" } 
  )
);


if (typeof window !== 'undefined') {
  const initialAuth = useAuthStore.getState();
  if (!initialAuth.isLoading && initialAuth.isAuthenticated) {
    useProductStore.getState().fetchProductsFromFirestore();
  } else if (!initialAuth.isLoading && !initialAuth.isAuthenticated) {
     useProductStore.getState().clearSearchAndResults();
  }

  useAuthStore.subscribe(
    (currentAuthState, previousAuthState) => {
      const productStore = useProductStore.getState();
      
      if (previousAuthState.isLoading && !currentAuthState.isLoading) {
        if (currentAuthState.isAuthenticated) {
          console.log("ProductStore: Auth loaded, user authenticated. Fetching products.");
          productStore.fetchProductsFromFirestore();
        } else {
          console.log("ProductStore: Auth loaded, user not authenticated. Clearing products.");
          productStore.clearSearchAndResults();
          // No need to call set({ products: [] }) here, clearSearchAndResults handles it.
        }
      }
      else if (!previousAuthState.isAuthenticated && currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: User logged in. Fetching products.");
        productStore.fetchProductsFromFirestore();
      }
      else if (previousAuthState.isAuthenticated && !currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: User logged out. Clearing products.");
        productStore.clearSearchAndResults();
      }
    }
  );
}
