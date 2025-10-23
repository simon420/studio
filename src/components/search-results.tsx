
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

const ITEMS_PER_PAGE = 10;

export default function SearchResults() {
  const { isAuthenticated, userRole } = useAuthStore();
  const filteredProducts = useProductStore((state) => state.filteredProducts);
  const searchTerm = useProductStore((state) => state.searchTerm);
  const products = useProductStore((state) => state.products);
  const sortKey = useProductStore((state) => state.sortKey);
  const sortDirection = useProductStore((state) => state.sortDirection);
  const setSortKey = useProductStore((state) => state.setSortKey);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    if (isAuthenticated) {
       useProductStore.getState().filterProducts();
    } else {
        useProductStore.getState().clearSearchAndResults();
    }
  }, [isAuthenticated, products, searchTerm, sortKey, sortDirection]); // Depend on auth status, products list, and search term
  
  const handleSort = (key: keyof Product) => {
    setSortKey(key);
    setCurrentPage(1);
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

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


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
             <>
             <ScrollArea className="h-[350px] rounded-md border">
                <div className="overflow-x-auto">
                    <Table>
                    <TableCaption className="py-4">
                        {filteredProducts.length > 0
                        ? `Mostrando ${paginatedProducts.length} di ${filteredProducts.length} prodotto(i).`
                        : ''}
                    </TableCaption>
                    <TableHeader className="sticky top-0 bg-secondary z-10">
                        <TableRow>
                        <TableHead style={{width: '300px'}}>
                            <Button variant="ghost" onClick={() => handleSort('name')}>
                            Nome
                            {renderSortArrow('name')}
                            </Button>
                        </TableHead>
                        <TableHead style={{width: '300px'}}>
                            <Button variant="ghost" onClick={() => handleSort('code')}>
                            Codice
                            {renderSortArrow('code')}
                            </Button>
                        </TableHead>
                        <TableHead style={{width: '300px'}} className="text-right">
                            <Button variant="ghost" onClick={() => handleSort('price')} className="justify-end w-full">
                            Prezzo
                            {renderSortArrow('price')}
                            </Button>
                        </TableHead>
                        {userRole !== 'user' && (
                            <TableHead style={{width: '300px'}}>
                            <Button variant="ghost" onClick={() => handleSort('serverId')}>
                                Server
                                {renderSortArrow('serverId')}
                            </Button>
                            </TableHead>
                        )}
                        <TableHead style={{width: '300px'}}>
                            <Button variant="ghost" onClick={() => handleSort('addedByEmail')}>
                            Aggiunto Da
                            {renderSortArrow('addedByEmail')}
                            </Button>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.length > 0 ? (
                        paginatedProducts.map((product) => (
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
                </div>
             </ScrollArea>
              {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Precedente
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Pagina {currentPage} di {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Successivo
                  </Button>
                </div>
              )}
            </>
           )}
        </CardContent>
     </Card>
  );
}

    