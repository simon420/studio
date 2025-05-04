'use client';

import * as React from 'react';
import { useProductStore } from '@/store/product-store';
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
import { PackageSearch } from 'lucide-react';


export default function SearchResults() {
  const filteredProducts = useProductStore((state) => state.filteredProducts);
  const searchTerm = useProductStore((state) => state.searchTerm);

  // Effect to re-filter products when the component mounts or products change
  // This ensures the initial state or changes from adding products are reflected.
  React.useEffect(() => {
    useProductStore.getState().filterProducts();
  }, []); // Empty dependency array ensures it runs once on mount


  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <Table>
        <TableCaption className="py-4">
          {filteredProducts.length > 0
            ? `Showing ${filteredProducts.length} product(s).`
            : searchTerm
            ? `No products found for "${searchTerm}".`
            : 'Enter a search term or add products.'}
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
          {filteredProducts.length === 0 && searchTerm ? (
             <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                     <PackageSearch className="h-8 w-8" />
                     <span>No results found.</span>
                  </div>
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
