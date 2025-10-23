'use client';

import * as React from 'react';
import { useProductStore } from '@/store/product-store';
import { useAuthStore } from '@/store/auth-store'; // Import auth store
import SearchInput from '@/components/search-input'; // Import SearchInput
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, AlertCircle, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'; // Added Info icon and ArrowUpDown
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import type { Product } from '@/lib/types';


export default function SearchResults() {
  const { isAuthenticated, userRole } = useAuthStore();
  const filteredProducts = useProductStore((state) => state.filteredProducts);
  const searchTerm = useProductStore((state) => state.searchTerm);
  const products = useProductStore((state) => state.products);
  const sortKey = useProductStore((state) => state.sortKey);
  const sortDirection = useProductStore((state) => state.sortDirection);
  const setSortKey = useProductStore((state) => state.setSortKey);

  React.useEffect(() => {
    if (isAuthenticated) {
       useProductStore.getState().filterProducts();
    } else {
        useProductStore.getState().clearSearchAndResults();
    }
  }, [isAuthenticated, products, searchTerm, sortKey, sortDirection]); // Depend on auth status, products list, and search term
  
  const handleSort = (key: keyof Product) => {
    setSortKey(key);
  };
  
  const renderSortArrow = (key: keyof Product) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };


  return (
     <Card>
        <CardHeader>
          <CardTitle>Cerca Prodotti</CardTitle> {/* Updated CardTitle */}
        </CardHeader>
        <CardContent>
           <div className="mb-6"> {/* Add margin for spacing */}
             <SearchInput />
           </div>
           {/* Handle non-authenticated state */}
           {!isAuthenticated ? (
             <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground rounded-md border"> {/* Adjusted height due to input */}
               <AlertCircle className="h-8 w-8 mb-2" />
               <p>Effettua il login per vedere i risultati dei prodotti.</p>
             </div>
           ) : (
             // Render table when authenticated
             <ScrollArea className="h-[350px] rounded-md border"> {/* Adjusted height due to input */}
               <Table>
                 <TableCaption className="py-4">
                   {filteredProducts.length > 0
                     ? `Mostrando ${filteredProducts.length} prodotto(i).`
                     : ''}
                 </TableCaption>
                 <TableHeader className="sticky top-0 bg-secondary z-10">
                   <TableRow>
                     <TableHead className="w-[30%]">
                       <Button variant="ghost" onClick={() => handleSort('name')}>
                         Nome
                         {renderSortArrow('name')}
                       </Button>
                     </TableHead>
                     <TableHead className="w-[15%]">
                       <Button variant="ghost" onClick={() => handleSort('code')}>
                         Codice
                         {renderSortArrow('code')}
                       </Button>
                     </TableHead>
                     <TableHead className="w-[15%] text-right">
                       <Button variant="ghost" onClick={() => handleSort('price')} className="justify-end w-full">
                         Prezzo
                         {renderSortArrow('price')}
                       </Button>
                     </TableHead>
                     {userRole !== 'user' && (
                        <TableHead className="w-[20%]">Server</TableHead>
                     )}
                     <TableHead className="w-[20%]">Aggiunto Da</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredProducts.length > 0 ? (
                     filteredProducts.map((product) => (
                       <TableRow key={product.id}>
                         <TableCell className="font-medium">{product.name}</TableCell>
                         <TableCell>{product.code}</TableCell>
                         <TableCell className="text-right">
                           €{product.price.toFixed(2)}
                         </TableCell>
                         {userRole !== 'user' && (
                            <TableCell>
                                <Badge variant={product.serverId === 'local' ? 'secondary' : 'outline'}>
                                {product.serverId || 'N/D'}
                                </Badge>
                            </TableCell>
                         )}
                         <TableCell>{product.addedByEmail || product.addedByUid || 'N/D'}</TableCell>
                       </TableRow>
                     ))
                   ) : searchTerm ? (
                     <TableRow>
                       <TableCell colSpan={userRole !== 'user' ? 5 : 4} className="h-24 text-center text-muted-foreground">
                         <div className="flex flex-col items-center justify-center gap-2">
                           <PackageSearch className="h-8 w-8" />
                           <span>Nessun risultato trovato per "{searchTerm}".</span>
                         </div>
                       </TableCell>
                     </TableRow>
                   ) : (
                     <TableRow>
                       <TableCell colSpan={userRole !== 'user' ? 5 : 4} className="h-24 text-center text-muted-foreground">
                         <div className="flex flex-col items-center justify-center gap-2">
                           <Info className="h-8 w-8" />
                           <span>La lista è attualmente vuota.</span>
                         </div>
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </ScrollArea>
           )}
        </CardContent>
     </Card>
  );
}
