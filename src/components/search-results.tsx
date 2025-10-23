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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PackageSearch, AlertCircle, Info } from 'lucide-react'; // Added Info icon
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components


export default function SearchResults() {
  const { isAuthenticated, userRole } = useAuthStore(); // Get authentication status and role
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
                     <TableHead className="w-[30%]">Nome</TableHead>
                     <TableHead className="w-[15%]">Codice</TableHead>
                     <TableHead className="w-[15%] text-right">Prezzo</TableHead>
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
