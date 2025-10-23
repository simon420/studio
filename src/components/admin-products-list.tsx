
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
import { PackagePlus, Loader2, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Product } from '@/lib/types';
import EditProductDialog from './edit-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 10;

export default function AdminProductsList() {
  const { uid, isLoading: authIsLoading } = useAuthStore();
  const { 
    products, 
    updateProductInStoreAndFirestore, 
    deleteProductFromStoreAndFirestore,
    adminListSortKey,
    adminListSortDirection,
    setAdminListSortKey
  } = useProductStore();
  
  const { toast } = useToast();
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [adminSearchTerm, setAdminSearchTerm] = React.useState('');
  
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);


  // The listener in product-store now handles fetching, so we just check for loading state.
  React.useEffect(() => {
    // Show loading spinner initially until products are loaded by the real-time listener
    if (!authIsLoading && products.length === 0) {
        // We can keep a short loading state for UX, but data will arrive automatically
        const timer = setTimeout(() => setIsLoadingProducts(false), 1500); // Failsafe timeout
        return () => clearTimeout(timer);
    } else if (products.length > 0) {
        setIsLoadingProducts(false);
    }
  }, [authIsLoading, products]);

  const handleSort = (key: keyof Product) => {
    setAdminListSortKey(key);
    setCurrentPage(1);
  };

  const renderSortArrow = (key: keyof Product) => {
    if (adminListSortKey !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return adminListSortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleAdminSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAdminSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const filteredAndSortedAdminProducts = React.useMemo(() => {
    if (!uid || products.length === 0) return [];
    
    let userProducts = products.filter((product) => product.addedByUid === uid);

    if (adminSearchTerm.trim()) {
        const lowerCaseSearchTerm = adminSearchTerm.toLowerCase().split(' ').filter(term => term);
        userProducts = userProducts.filter((product) => {
            const nameLower = product.name.toLowerCase();
            const codeString = product.code.toString();
            return lowerCaseSearchTerm.every(term =>
                nameLower.includes(term) || codeString.includes(term)
            );
        });
    }

    if (adminListSortKey) {
        userProducts.sort((a, b) => {
            const aValue = a[adminListSortKey!];
            const bValue = b[adminListSortKey!];
            
            let comparison = 0;
            if (aValue! > bValue!) {
                comparison = 1;
            } else if (aValue! < bValue!) {
                comparison = -1;
            }
            
            return adminListSortDirection === 'asc' ? comparison : -comparison;
        });
    }

    return userProducts;
  }, [uid, products, adminSearchTerm, adminListSortKey, adminListSortDirection]);

  const totalPages = Math.ceil(filteredAndSortedAdminProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredAndSortedAdminProducts.slice(
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
    if (!editingProduct || !editingProduct.serverId) return;
    setIsUpdating(true);
    try {
      await updateProductInStoreAndFirestore(editingProduct.id, editingProduct.serverId, updatedData);
      toast({
        title: 'Prodotto Aggiornato',
        description: `"${updatedData.name || editingProduct.name}" è stato aggiornato.`,
      });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Errore aggiornamento prodotto:', error);
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
    if (!productToDelete || !productToDelete.serverId) return;
    setIsDeleting(true);
    try {
      await deleteProductFromStoreAndFirestore(productToDelete.id, productToDelete.serverId);
      toast({
        title: 'Prodotto Eliminato',
        description: `"${productToDelete.name}" è stato eliminato con successo.`,
      });
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error('Errore eliminazione prodotto:', error);
      toast({
        title: 'Eliminazione Fallita',
        description: error.message || 'Impossibile eliminare il prodotto.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };


  if (authIsLoading || (isLoadingProducts && products.length === 0)) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Caricamento dei tuoi prodotti...</p>
      </div>
    );
  }

  if (!uid) {
    return <p className="text-muted-foreground text-center">Impossibile identificare l'utente admin.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cerca i tuoi prodotti per nome o codice..."
          value={adminSearchTerm}
          onChange={handleAdminSearchChange}
          className="pl-10 w-full"
        />
      </div>
      <ScrollArea className="h-[260px] rounded-md border">
        <div className="overflow-x-auto">
            <Table>
            <TableCaption className="py-4">
                {filteredAndSortedAdminProducts.length > 0
                ? `Mostrando ${paginatedProducts.length} di ${filteredAndSortedAdminProducts.length} prodotti.`
                : adminSearchTerm && filteredAndSortedAdminProducts.length === 0
                ? '' 
                : 'Non hai ancora aggiunto nessun prodotto.'}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('name')}>Nome {renderSortArrow('name')}</Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('code')}>Codice {renderSortArrow('code')}</Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('price')} className="justify-end w-full">Prezzo {renderSortArrow('price')}</Button>
                </TableHead>
                <TableHead style={{width: '300px'}}>
                    <Button variant="ghost" onClick={() => handleSort('serverId')}>Server {renderSortArrow('serverId')}</Button>
                </TableHead>
                <TableHead style={{width: '300px'}} className="text-center">Azioni</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedProducts.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <PackagePlus className="h-8 w-8" /> 
                        <span>
                        {adminSearchTerm 
                            ? `Nessun prodotto trovato per "${adminSearchTerm}".` 
                            : 'Nessun prodotto aggiunto da te.'}
                        </span>
                    </div>
                    </TableCell>
                </TableRow>
                ) : (
                paginatedProducts.map((product) => (
                    <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.code}</TableCell>
                    <TableCell className="text-right">
                        ${product.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                        <Badge variant={'secondary'}>
                        {product.serverId || 'N/A'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            disabled={isUpdating || isDeleting}
                            aria-label="Modifica prodotto"
                            >
                            <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openDeleteDialog(product)}
                            disabled={isUpdating || isDeleting}
                            aria-label="Elimina prodotto"
                            >
                            {isDeleting && productToDelete?.id === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>
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
              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Questo eliminerà permanentemente il prodotto
                "{productToDelete.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} onClick={() => { setIsDeleteDialogOpen(false); setProductToDelete(null); }}>Annulla</AlertDialogCancel>
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

    