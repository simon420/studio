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
import { Loader2, Search, Edit, Trash2, Package } from 'lucide-react';
import type { Product } from '@/lib/types';
import EditProductDialog from './edit-product-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminProductsList() {
  const { 
    products, 
    superAdminUpdateProduct, 
    superAdminDeleteProduct 
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

  // The listener in product-store now handles fetching, so we just check for loading state.
  React.useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true);
    } else {
      // Data is loaded via real-time listeners, so if products are present, we're not "loading"
      setIsLoading(products.length === 0 && authIsLoading);
    }
  }, [authIsLoading, products]);


  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredProducts = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return products;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase().split(' ').filter(term => term);
    return products.filter((product) => {
      const nameLower = product.name.toLowerCase();
      const codeString = product.code.toString();
      const emailLower = product.addedByEmail?.toLowerCase() || '';
      return lowerCaseSearchTerm.every(term =>
        nameLower.includes(term) || codeString.includes(term) || emailLower.includes(term)
      );
    });
  }, [products, searchTerm]);

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
    } catch (error: any) {
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
        <Table>
          <TableCaption>
            {filteredProducts.length > 0
              ? `Mostrando ${filteredProducts.length} prodotti nel sistema.`
              : 'Nessun prodotto nel sistema o nessun risultato per la ricerca.'}
          </TableCaption>
          <TableHeader className="sticky top-0 bg-secondary z-10">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Codice</TableHead>
              <TableHead>Prezzo</TableHead>
              <TableHead>Shard</TableHead>
              <TableHead>Aggiunto da</TableHead>
              <TableHead className="text-center">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
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
              filteredProducts.map((product) => (
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
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
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
