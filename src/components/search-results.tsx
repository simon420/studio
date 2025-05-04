'use client';

import * as React from 'react';
import { useProductStore } from '@/store/product-store';
import { useAuthStore } from '@/store/auth-store'; // Import auth store
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
import { Badge } from '@/components/ui/badge';
import { PackageSearch, AlertCircle } from 'lucide-react';


export default function SearchResults() {
  const { isAuthenticated } = useAuthStore(); // Get authentication status
  // Use selectors to get only the state needed, prevents unnecessary re-renders
  const filteredProducts = useProductStore((state) => state.filteredProducts);
  const searchTerm = useProductStore((state) => state.searchTerm);
  const products = useProductStore((state) => state.products); // Still needed for initial load check

  // Effect to re-filter products when the component mounts or relevant state changes
  // Only run filter if authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
       useProductStore.getState().filterProducts();
    } else {
        // Ensure results are cleared if user logs out while viewing
        useProductStore.getState().clearSearchAndResults();
    }
  }, [isAuthenticated, products, searchTerm]); // Depend on auth status, products list, and search term

  // Handle non-authenticated state
  if (!isAuthenticated) {
    return (
        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground rounded-md border">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>Log in to see product results.</p>
        </div>
    );
  }

  // At this point, user is authenticated
  const showNoResultsMessage = filteredProducts.length === 0 && !!searchTerm;
  const showInitialMessage = filteredProducts.length === 0 && !searchTerm;

  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <Table>
        <TableCaption className="py-4">
          {filteredProducts.length > 0
            ? `Showing ${filteredProducts.length} product(s).`
            : searchTerm
            ? `No products found for "${searchTerm}".`
            : 'Enter a search term or add products (if admin).'}
        </TableCaption>
        <TableHeader className="sticky top-0 bg-secondary z-10">
          <TableRow>
            <TableHead className="w-[40%]">Name</TableHead>
            <TableHead className="w-[20%]">Code</TableHead>
            <TableHead className="w-[20%] text-right">Price</TableHead>
            <TableHead className="w-[20%]">Server</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {showNoResultsMessage ? (
             <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                     <PackageSearch className="h-8 w-8" />
                     <span>No results found for "{searchTerm}".</span>
                  </div>
                </TableCell>
             </TableRow>
          ) : showInitialMessage ? (
             <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Enter a search term above, or add a product (if admin).
                </TableCell>
             </TableRow>
          ) : (
             filteredProducts.map((product) => (
               <TableRow key={product.id}>
                 <TableCell className="font-medium">{product.name}</TableCell>
                 <TableCell>{product.code}</TableCell>
                 <TableCell className="text-right">
                   ${product.price.toFixed(2)}
                 </TableCell>
                 <TableCell>
                   <Badge variant={product.serverId === 'local' ? 'secondary' : 'outline'}>
                     {product.serverId || 'N/A'}
                   </Badge>
                 </TableCell>
               </TableRow>
             ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
