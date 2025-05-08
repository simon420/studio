'use client';

import * as React from 'react';
import { useProductStore } from '@/store/product-store';
import { useAuthStore } from '@/store/auth-store';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PackagePlus, Loader2 } from 'lucide-react'; // Changed Icon

export default function AdminProductsList() {
  const { uid, isLoading: authIsLoading } = useAuthStore();
  const products = useProductStore((state) => state.products);
  const fetchProductsFromFirestore = useProductStore((state) => state.fetchProductsFromFirestore);
  
  // Local loading state for this component's specific data needs
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);

  React.useEffect(() => {
    // Fetch products if not already fetched or if auth state is resolved
    if (!authIsLoading && uid) {
        // If products are already in store, use them, otherwise trigger a fetch.
        // This check avoids redundant fetches if products are already globally loaded.
        if (products.length === 0) {
            setIsLoadingProducts(true);
            fetchProductsFromFirestore().finally(() => setIsLoadingProducts(false));
        } else {
            setIsLoadingProducts(false);
        }
    } else if (authIsLoading) {
        setIsLoadingProducts(true);
    }
  }, [authIsLoading, uid, fetchProductsFromFirestore, products.length]);

  const adminProducts = React.useMemo(() => {
    if (!uid || products.length === 0) return [];
    return products.filter((product) => product.addedByUid === uid);
  }, [uid, products]);

  if (authIsLoading || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading your products...</p>
      </div>
    );
  }

  if (!uid) {
    // Should not happen if page.tsx handles auth correctly, but as a safeguard
    return <p className="text-muted-foreground text-center">Could not identify admin user.</p>;
  }

  return (
    <ScrollArea className="h-[300px] rounded-md border">
      <Table>
        <TableCaption className="py-4">
          {adminProducts.length > 0
            ? `You have added ${adminProducts.length} product(s).`
            : 'You have not added any products yet.'}
        </TableCaption>
        <TableHeader className="sticky top-0 bg-secondary z-10">
          <TableRow>
            <TableHead className="w-[50%]">Name</TableHead>
            <TableHead className="w-[25%]">Code</TableHead>
            <TableHead className="w-[25%] text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adminProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <PackagePlus className="h-8 w-8" /> 
                  <span>No products added by you.</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            adminProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.code}</TableCell>
                <TableCell className="text-right">
                  ${product.price.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
