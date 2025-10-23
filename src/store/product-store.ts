
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '@/lib/types';
import { useAuthStore } from './auth-store';
import { db, shards } from '@/lib/firebase'; 
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, writeBatch, Firestore, onSnapshot, Unsubscribe, DocumentChange } from 'firebase/firestore';
import { useNotificationStore } from './notification-store';

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
  superAdminUpdateProduct: (productId: string, serverId: string, updatedData: Partial<Pick<Product, 'name' | 'price' | 'addedByUid' | 'addedByEmail'>>) => Promise<void>;
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
          const { isAuthenticated, isLoading: authIsLoading, uid: currentUserId } = useAuthStore.getState();
      
          if (authIsLoading || !isAuthenticated) {
              get().clearSearchAndResults();
              return;
          }
      
          get().cleanupProductListeners();
          let localIsInitialLoad = true;
          const productsByShard: { [key: string]: Product[] } = {};
      
          const processUpdates = () => {
              const newProductList = Object.values(productsByShard).flat();
              const oldProducts = get().products;
              const { addNotification } = useNotificationStore.getState();
      
              // Do not notify on the very first data load
              if (!localIsInitialLoad) {
                  const oldProductMap = new Map(oldProducts.map(p => [p.id, p]));
                  const newProductMap = new Map(newProductList.map(p => [p.id, p]));
      
                  // Check for added/updated products
                  newProductList.forEach(newProduct => {
                      const oldProduct = oldProductMap.get(newProduct.id);
                      // Case 1: New product added by someone else
                      if (!oldProduct && newProduct.addedByUid !== currentUserId) {
                          addNotification({
                              type: 'product_added',
                              message: `Nuovo prodotto: "${newProduct.name}" aggiunto da ${newProduct.addedByEmail}.`,
                          });
                      // Case 2: Existing product was updated
                      } else if (oldProduct) {
                          const hasChanged = oldProduct.name !== newProduct.name || oldProduct.price !== newProduct.price;
                          const isOwner = oldProduct.addedByUid === currentUserId;
                          const modifierIsSomeoneElse = newProduct.lastModifiedByUid !== currentUserId;

                          if (hasChanged && isOwner && modifierIsSomeoneElse && newProduct.lastModifiedByUid) {
                              addNotification({
                                type: 'product_updated',
                                message: `Il tuo prodotto "${oldProduct.name}" è stato aggiornato da ${newProduct.lastModifiedByEmail}.`,
                              });
                          } else if (hasChanged && !isOwner) {
                              addNotification({
                                  type: 'product_updated',
                                  message: `Prodotto "${newProduct.name}" aggiornato.`,
                              });
                          }
                      }
                  });
      
                  // Check for deleted products by someone else
                  oldProducts.forEach(oldProduct => {
                      if (!newProductMap.has(oldProduct.id) && oldProduct.addedByUid !== currentUserId) {
                          addNotification({
                              type: 'product_deleted',
                              message: `Prodotto "${oldProduct.name}" eliminato.`,
                          });
                      }
                  });
              }
      
              set({ products: newProductList });
              get().filterProducts();
      
              // After the first complete data load, set initial load to false
              if (localIsInitialLoad && Object.keys(productsByShard).length === shardIds.length) {
                  localIsInitialLoad = false;
              }
          };
      
          productListeners = shardIds.map(shardId => {
              const shardDb = shards[shardId as keyof typeof shards];
              const productCollection = collection(shardDb, 'products');
      
              const unsubscribe = onSnapshot(productCollection, (snapshot) => {
                  productsByShard[shardId] = snapshot.docs.map(docSnap => ({
                      id: docSnap.id,
                      ...docSnap.data(),
                      serverId: shardId,
                  } as Product));
                  processUpdates();
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
      
        const q = query(productsRef, where("code", "==", productData.code));
        const querySnapshot = await getDocs(q);
      
        if (!querySnapshot.empty) {
          throw new Error(`Un prodotto con codice "${productData.code}" esiste già nello shard "${shardId}".`);
        }
      
        const productDataToSave = {
          ...productData,
          addedByUid: uid,
          addedByEmail: email,
          lastModifiedByUid: uid, // Set modifier on creation
          lastModifiedByEmail: email,
        };
      
        const batch = writeBatch(db); 
        const shardBatch = writeBatch(shardDb);
      
        const newProductRef = doc(collection(shardDb, 'products'));
        shardBatch.set(newProductRef, productDataToSave);
      
        const mapRef = doc(db, 'product-shard-map', newProductRef.id);
        batch.set(mapRef, { shardId: shardId });
      
        await shardBatch.commit();
        await batch.commit();
      },

      updateProductInStoreAndFirestore: async (productId, serverId, updatedData) => {
        const { userRole, isAuthenticated, uid, email } = useAuthStore.getState();
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
        
        const dataToUpdate = {
          ...updatedData,
          lastModifiedByUid: uid,
          lastModifiedByEmail: email,
        };

        await updateDoc(productDocRef, dataToUpdate);
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

        const shardBatch = writeBatch(shardDb);
        const mainDbBatch = writeBatch(db);

        const productDocRef = doc(shardDb, 'products', productId);
        shardBatch.delete(productDocRef);

        const mapDocRef = doc(db, 'product-shard-map', productId);
        mainDbBatch.delete(mapDocRef);

        await shardBatch.commit();
        await mainDbBatch.commit();
      },

      superAdminUpdateProduct: async (productId, serverId, updatedData) => {
        const { userRole, isAuthenticated, email, uid } = useAuthStore.getState();
        if (!isAuthenticated || userRole !== 'super-admin') {
          throw new Error("Solo i super-amministratori possono eseguire questa azione.");
        }

        const shardDb = shards[serverId as keyof typeof shards];
        if (!shardDb) {
            throw new Error(`ServerId/shard non valido: ${serverId}`);
        }

        const productDocRef = doc(shardDb, 'products', productId);

        const dataToUpdate: any = { 
            ...updatedData,
            lastModifiedByUid: uid,
            lastModifiedByEmail: email,
        };

        // When super-admin reassigns, they become the new owner
        if (dataToUpdate.addedByUid) {
            dataToUpdate.addedByEmail = email; // Ensure email is also updated on reassign
        }

        await updateDoc(productDocRef, dataToUpdate);
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
  useAuthStore.subscribe(
    (currentAuthState, previousAuthState) => {
      const productStore = useProductStore.getState();
      const wasAuthenticated = previousAuthState.isAuthenticated;
      const isAuthenticated = currentAuthState.isAuthenticated;

      if (!wasAuthenticated && isAuthenticated) {
        console.log("ProductStore: Utente autenticato. Avvio listener prodotti.");
        productStore.listenToAllProductShards();
      }
      else if (wasAuthenticated && !isAuthenticated) {
        console.log("ProductStore: Utente disconnesso. Pulisco prodotti e listeners.");
        productStore.clearSearchAndResults();
      }
    }
  );
  
  const initialAuth = useAuthStore.getState();
  if (initialAuth.isAuthenticated && !initialAuth.isLoading) {
       console.log("ProductStore: Check iniziale, utente autenticato. Avvio listener.");
       useProductStore.getState().listenToAllProductShards();
  }
}
