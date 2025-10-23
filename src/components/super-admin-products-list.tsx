
// src/components/super-admin-products-list.tsx
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Edit, Trash2, Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Product } from '@/lib/types';
import EditProductDialog from './edit-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 10;

export default function SuperAdminProductsList() {
  const { 
    products, 
    superAdminUpdateProduct, 
    superAdminDeleteProduct,
    superAdminSortKey,
    superAdminSortDirection,
    setSuperAdminSortKey,
  } = useProductStore();
  const { isLoading: authIsLoading } = useAuthStore();
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
    } else {
      setIsLoading(products.length === 0 && authIsLoading);
    }
  }, [authIsLoading, products]);


  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof Product) => {
    setSuperAdminSortKey(key);
    setCurrentPage(1);
  };

  const renderSortArrow = (key: keyof Product) => {
    if (superAdminSortKey !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return superAdminSortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const filteredAndSortedProducts = React.useMemo(() => {
    let filtered = [...products];

    if (searchTerm.trim()) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().split(' ').filter(term => term);
      filtered = filtered.filter((product) => {
        const nameLower = product.name.toLowerCase();
        const codeString = product.code.toString();
        const emailLower = product.addedByEmail?.toLowerCase() || '';
        return lowerCaseSearchTerm.every(term =>
          nameLower.includes(term) || codeString.includes(term) || emailLower.includes(term)
        );
      });
    }

    if (superAdminSortKey) {
        filtered.sort((a, b) => {
            const aValue = a[superAdminSortKey!];
            const bValue = b[superAdminSortKey!];
            
            let comparison = 0;
            if (aValue! > bValue!) {
                comparison = 1;
            } else if (aValue! < bValue!) {
                comparison = -1;
            }
            
            return superAdminSortDirection === 'asc' ? comparison : -comparison;
        });
    }

    return filtered;
  }, [products, searchTerm, superAdminSortKey, superAdminSortDirection]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedData: Partial<Pick<Product, 'name' | 'price'>>) => {
    if (!editingProduct || !editingProduct.id || !editingProduct.serverId) return;
    setIsUpdating(true);
    try {
      await superAdminUpdateProduct(editingProduct.id, editingProduct.serverId, updatedData);
      toast({
        title: 'Prodotto Aggiornato',
        description: `"${updatedData.name || editingProduct.name}" è stato aggiornato.`,
      });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Errore aggiornamento prodotto (Super Admin):', error);
      toast({
        title: 'Aggiornamento Fallito',
        description: error.message || 'Impossibile aggiornare il prodotto.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete || !productToDelete.id || !productToDelete.serverId) return;
    setIsDeleting(true);
    try {
      await superAdminDeleteProduct(productToDelete.id, productToDelete.serverId);
      toast({
        title: 'Prodotto Eliminato',
        description: `"${productToDelete.name}" è stato eliminato con successo.`,
      });
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error: any) => {
      console.error('Errore eliminazione prodotto (Super Admin):', error);
      toast({
        title: 'Eliminazione Fallita',
        description: error.message || 'Impossibile eliminare il prodotto.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">In attesa dei dati in tempo reale...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cerca per nome, codice o email admin..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 w-full"
        />
      </div>
      <ScrollArea className="h-[400px] rounded-md border">
        <div className="overflow-x-auto">
            <Table>
            <TableCaption>
                {filteredAndSortedProducts.length > 0
                ? `Mostrando ${paginatedProducts.length} di ${filteredAndSortedProducts.length} prodotti.`
                : 'Nessun prodotto nel sistema o nessun risultato per la ricerca.'}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('name')}>
                    Nome {renderSortArrow('name')}
                    </Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('code')}>
                    Codice {renderSortArrow('code')}
                    </Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('price')}>
                    Prezzo {renderSortArrow('price')}
                    </Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('serverId')}>
                    Shard {renderSortArrow('serverId')}
                    </Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('addedByEmail')}>
                    Aggiunto da {renderSortArrow('addedByEmail')}
                    </Button>
                </TableHead>
                <TableHead style={{width: '300px'}} className="text-center">Azioni</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedProducts.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" /> 
                        <span>
                        {searchTerm 
                            ? `Nessun prodotto trovato per "${searchTerm}".` 
                            : 'Nessun prodotto nel sistema.'}
                        </span>
                    </div>
                    </TableCell>
                </TableRow>
                ) : (
                paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.code}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>
                        <Badge variant={'secondary'}>{product.serverId || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{product.addedByEmail || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            disabled={isUpdating || isDeleting}
                            >
                            <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(product)}
                            disabled={isUpdating || isDeleting}
                            >
                            {isDeleting && productToDelete?.id === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>                        </div>
                    </TableCell>
                    </TableRow>
                ))
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

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleSaveEdit}
          isSaving={isUpdating}
        />
      )}
      {productToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione è irreversibile. Eliminerà permanentemente il prodotto "{productToDelete.name}" dal sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    