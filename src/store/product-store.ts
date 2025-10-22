import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store';
import { db, shards } from '@/lib/firebase'; 
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, Firestore } from 'firebase/firestore';

const shardIds = ['shard-a', 'shard-b', 'shard-c'];

// Coordinator logic: Simple sharding function based on product code
function getShard(productCode: number): { shardId: string; shardDb: Firestore } {
    const shardIndex = productCode % shardIds.length;
    const shardId = shardIds[shardIndex];
    return { shardId, shardDb: shards[shardId as keyof typeof shards] };
}

interface ProductState {
  searchTerm: string;
  products: Product[];
  filteredProducts: Product[];
  setSearchTerm: (term: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'serverId'>) => Promise<void>; 
  updateProductInStoreAndFirestore: (productId: string, serverId: string, updatedData: Partial<Pick<Product, 'name' | 'price'>>) => Promise<void>;
  deleteProductFromStoreAndFirestore: (productId: string, serverId: string) => Promise<void>;
  filterProducts: () => void;
  clearSearchAndResults: () => void;
  loadInitialProducts: (initialProducts: Product[]) => void;
  fetchProductsFromFirestore: () => Promise<void>;
  superAdminUpdateProduct: (productId: string, serverId: string, updatedData: Partial<Pick<Product, 'name' | 'price'>>) => Promise<void>;
  superAdminDeleteProduct: (productId: string, serverId: string) => Promise<void>;
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
          const allProducts: Product[] = [];
          for (const shardId in shards) {
            const shardDb = shards[shardId as keyof typeof shards];
            const productCollection = collection(shardDb, 'products');
            const productSnapshot = await getDocs(productCollection);
            const productList: Product[] = productSnapshot.docs.map(docSnap => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                name: data.name,
                code: data.code,
                price: data.price,
                serverId: shardId, 
                addedByUid: data.addedByUid,
                addedByEmail: data.addedByEmail,
              };
            });
            allProducts.push(...productList);
          }
          set({
            products: allProducts,
          });
          get().filterProducts(); 
        } catch (error) {
          console.error('Errore nel recupero dei prodotti da Firestore sharded:', error);
        }
      },

      addProduct: async (productData) => {
        const { userRole, isAuthenticated, isLoading: authIsLoading, uid, email } = useAuthStore.getState();
        if (authIsLoading || !isAuthenticated || (userRole !== 'admin' && userRole !== 'super-admin')) {
          throw new Error("Solo gli amministratori possono aggiungere prodotti.");
        }
      
        const { shardId, shardDb } = getShard(productData.code);
        const productsRef = collection(shardDb, 'products');
      
        // Check for duplicate code within the target shard
        const q = query(productsRef, where("code", "==", productData.code));
        const querySnapshot = await getDocs(q);
      
        if (!querySnapshot.empty) {
          throw new Error(`Un prodotto con codice "${productData.code}" esiste già nello shard "${shardId}".`);
        }
      
        const productDataToSave = {
          ...productData,
          addedByUid: uid,
          addedByEmail: email,
        };
      
        // Use a batch write to ensure atomicity
        const batch = writeBatch(db); // Main DB for the map
        const shardBatch = writeBatch(shardDb); // Shard DB for the product
      
        const newProductRef = doc(collection(shardDb, 'products'));
        shardBatch.set(newProductRef, productDataToSave);
      
        const mapRef = doc(db, 'product-shard-map', newProductRef.id);
        batch.set(mapRef, { shardId: shardId });
      
        await shardBatch.commit();
        await batch.commit();
      
        const newProductWithId: Product = {
          ...productDataToSave,
          id: newProductRef.id,
          serverId: shardId,
        };
      
        set((state) => ({
          products: [...state.products, newProductWithId],
        }));
        get().filterProducts();
      },

      updateProductInStoreAndFirestore: async (productId, serverId, updatedData) => {
        const { userRole, isAuthenticated, uid } = useAuthStore.getState();
        if (!isAuthenticated || userRole !== 'admin') {
          throw new Error("L'utente deve essere un amministratore per aggiornare i prodotti.");
        }
        
        const shardDb = shards[serverId as keyof typeof shards];
        if (!shardDb) {
            throw new Error(`ServerId/shard non valido: ${serverId}`);
        }

        const productDocRef = doc(shardDb, 'products', productId);
        
        const currentProduct = get().products.find(p => p.id === productId);
        if (currentProduct?.addedByUid !== uid) {
            throw new Error("L'amministratore può aggiornare solo i propri prodotti.");
        }

        await updateDoc(productDocRef, updatedData);

        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...updatedData } : product
          ),
        }));
        get().filterProducts();
      },

      deleteProductFromStoreAndFirestore: async (productId, serverId) => {
        const { userRole, isAuthenticated, uid } = useAuthStore.getState();
         if (!isAuthenticated || userRole !== 'admin') {
          throw new Error("L'utente deve essere un amministratore per eliminare i prodotti.");
        }

        const shardDb = shards[serverId as keyof typeof shards];
        if (!shardDb) {
            throw new Error(`ServerId/shard non valido: ${serverId}`);
        }
        
        const currentProduct = get().products.find(p => p.id === productId);
        if (currentProduct?.addedByUid !== uid) {
            throw new Error("L'amministratore può eliminare solo i propri prodotti.");
        }

        // Use batch to delete from shard and from map
        const shardBatch = writeBatch(shardDb);
        const mainDbBatch = writeBatch(db);

        const productDocRef = doc(shardDb, 'products', productId);
        shardBatch.delete(productDocRef);

        const mapDocRef = doc(db, 'product-shard-map', productId);
        mainDbBatch.delete(mapDocRef);

        await shardBatch.commit();
        await mainDbBatch.commit();

        // Update local state after successful deletion
        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }));
        get().filterProducts();
      },

      superAdminUpdateProduct: async (productId, serverId, updatedData) => {
        const { userRole, isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated || userRole !== 'super-admin') {
          throw new Error("Solo i super-amministratori possono eseguire questa azione.");
        }

        const shardDb = shards[serverId as keyof typeof shards];
        if (!shardDb) {
            throw new Error(`ServerId/shard non valido: ${serverId}`);
        }

        const productDocRef = doc(shardDb, 'products', productId);
        await updateDoc(productDocRef, updatedData);

        set((state) => ({
          products: state.products.map((product) =>
            product.id === productId ? { ...product, ...updatedData } : product
          ),
        }));
        get().filterProducts();
      },

      superAdminDeleteProduct: async (productId, serverId) => {
        const { userRole, isAuthenticated } = useAuthStore.getState();
         if (!isAuthenticated || userRole !== 'super-admin') {
          throw new Error("Solo i super-amministratori possono eseguire questa azione.");
        }

        const shardDb = shards[serverId as keyof typeof shards];
        if (!shardDb) {
            throw new Error(`ServerId/shard non valido: ${serverId}`);
        }

        const shardBatch = writeBatch(shardDb);
        const mainDbBatch = writeBatch(db);

        const productDocRef = doc(shardDb, 'products', productId);
        shardBatch.delete(productDocRef);

        const mapDocRef = doc(db, 'product-shard-map', productId);
        mainDbBatch.delete(mapDocRef);

        await shardBatch.commit();
        await mainDbBatch.commit();

        set((state) => ({
          products: state.products.filter((product) => product.id !== productId),
        }));
        get().filterProducts();
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
          console.log("ProductStore: Autenticazione caricata, utente autenticato. Recupero prodotti.");
          productStore.fetchProductsFromFirestore();
        } else {
          console.log("ProductStore: Autenticazione caricata, utente non autenticato. Pulisco prodotti.");
          productStore.clearSearchAndResults();
        }
      }
      else if (!previousAuthState.isAuthenticated && currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: Utente loggato. Recupero prodotti.");
        productStore.fetchProductsFromFirestore();
      }
      else if (previousAuthState.isAuthenticated && !currentAuthState.isAuthenticated && !currentAuthState.isLoading) {
        console.log("ProductStore: Utente disconnesso. Pulisco prodotti.");
        productStore.clearSearchAndResults();
      }
    }
  );
}
