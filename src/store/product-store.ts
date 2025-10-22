import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store';
import { db, shards } from '@/lib/firebase'; 
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, Firestore, onSnapshot, Unsubscribe } from 'firebase/firestore';

const shardIds = ['shard-a', 'shard-b', 'shard-c'];

// Coordinator logic: Simple sharding function based on product code
function getShard(productCode: number): { shardId: string; shardDb: Firestore } {
    const shardIndex = productCode % shardIds.length;
    const shardId = shardIds[shardIndex];
    return { shardId, shardDb: shards[shardId as keyof typeof shards] };
}

// Keep track of unsubscribe functions for real-time listeners
let productListeners: Unsubscribe[] = [];

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
  listenToAllProductShards: () => void;
  cleanupProductListeners: () => void;
  superAdminUpdateProduct: (productId: string, serverId: string, updatedData: Partial<Pick<Product, 'name' | 'price'>>) => Promise<void>;
  superAdminDeleteProduct: (productId: string, serverId: string) => Promise<void>;
}


export const useProductStore = create<ProductState>()(
  devtools( 
    (set, get) => ({
      searchTerm: '',
      products: [],
      filteredProducts: [],

      setSearchTerm: (term) => {
        set({ searchTerm: term });
        get().filterProducts();
      },
      
      listenToAllProductShards: () => {
        const { isAuthenticated, isLoading: authIsLoading } = useAuthStore.getState();
        if (authIsLoading || !isAuthenticated) {
          get().clearSearchAndResults();
          return;
        }

        // Clean up any existing listeners before starting new ones
        get().cleanupProductListeners();

        const productsByShard: { [key: string]: Product[] } = {};

        const updateCombinedProducts = () => {
          const allProducts = Object.values(productsByShard).flat();
          set({ products: allProducts });
          get().filterProducts();
        };

        productListeners = shardIds.map(shardId => {
          const shardDb = shards[shardId as keyof typeof shards];
          const productCollection = collection(shardDb, 'products');

          const unsubscribe = onSnapshot(productCollection, (snapshot) => {
            const productList: Product[] = snapshot.docs.map(docSnap => {
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
            productsByShard[shardId] = productList;
            updateCombinedProducts();
          }, (error) => {
            console.error(`Errore di ascolto per lo shard ${shardId}:`, error);
          });

          return unsubscribe;
        });
      },

      cleanupProductListeners: () => {
        productListeners.forEach(unsubscribe => unsubscribe());
        productListeners = [];
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

        // No need to manually add to state, onSnapshot will handle it.
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

        // No need to manually update state, onSnapshot will handle it.
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

        // No need to manually update state, onSnapshot will handle it.
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

        // No need to manually update state, onSnapshot will handle it.
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

        // No need to manually update state, onSnapshot will handle it.
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
          get().cleanupProductListeners();
          set({ searchTerm: '', filteredProducts: [], products: [] });
      }
    }),
    { name: "ProductStore" } 
  )
);


if (typeof window !== 'undefined') {
  // Subscribe to auth changes to manage product listeners
  useAuthStore.subscribe(
    (currentAuthState, previousAuthState) => {
      const productStore = useProductStore.getState();
      const wasAuthenticated = previousAuthState.isAuthenticated;
      const isAuthenticated = currentAuthState.isAuthenticated;

      // User logs in
      if (!wasAuthenticated && isAuthenticated) {
        console.log("ProductStore: Utente autenticato. Avvio listener prodotti.");
        productStore.listenToAllProductShards();
      }
      // User logs out
      else if (wasAuthenticated && !isAuthenticated) {
        console.log("ProductStore: Utente disconnesso. Pulisco prodotti e listeners.");
        productStore.clearSearchAndResults(); // This also cleans up listeners
      }
    }
  );
  
  // Initial check on page load
  const initialAuth = useAuthStore.getState();
  if (initialAuth.isAuthenticated && !initialAuth.isLoading) {
       console.log("ProductStore: Check iniziale, utente autenticato. Avvio listener.");
       useProductStore.getState().listenToAllProductShards();
  }
}
