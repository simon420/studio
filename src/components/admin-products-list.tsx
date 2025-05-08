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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PackagePlus, Loader2, Search, Edit, Trash2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import EditProductDialog from './edit-product-dialog'; // Import the new dialog
import { useToast } from '@/hooks/use-toast';

export default function AdminProductsList() {
  const { uid, isLoading: authIsLoading } = useAuthStore();
  const products = useProductStore((state) => state.products);
  const fetchProductsFromFirestore = useProductStore((state) => state.fetchProductsFromFirestore);
  const updateProduct = useProductStore((state) => state.updateProductInStoreAndFirestore);
  const deleteProduct = useProductStore((state) => state.deleteProductFromStoreAndFirestore);
  
  const { toast } = useToast();
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [adminSearchTerm, setAdminSearchTerm] = React.useState('');
  
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);


  React.useEffect(() => {
    if (!authIsLoading && uid) {
        if (products.length === 0) { // Fetch only if products are not already loaded
            setIsLoadingProducts(true);
            fetchProductsFromFirestore().finally(() => setIsLoadingProducts(false));
        } else {
            setIsLoadingProducts(false);
        }
    } else if (authIsLoading) {
        setIsLoadingProducts(true);
    }
  }, [authIsLoading, uid, fetchProductsFromFirestore, products.length]);

  const handleAdminSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAdminSearchTerm(event.target.value);
  };

  const filteredAdminProducts = React.useMemo(() => {
    if (!uid || products.length === 0) return [];
    
    let userProducts = products.filter((product) => product.addedByUid === uid);

    if (!adminSearchTerm.trim()) {
      return userProducts;
    }

    const lowerCaseSearchTerm = adminSearchTerm.toLowerCase().split(' ').filter(term => term);
    return userProducts.filter((product) => {
      const nameLower = product.name.toLowerCase();
      const codeString = product.code.toString();
      return lowerCaseSearchTerm.every(term =>
        nameLower.includes(term) || codeString.includes(term)
      );
    });
  }, [uid, products, adminSearchTerm]);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedData: Partial<Pick<Product, 'name' | 'price'>>) => {
    if (!editingProduct) return;
    setIsUpdating(true);
    try {
      await updateProduct(editingProduct.id, updatedData);
      toast({
        title: 'Product Updated',
        description: `"${updatedData.name || editingProduct.name}" has been updated.`,
      });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Could not update product.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (productId: string) => {
    setIsDeleting(true);
    try {
      await deleteProduct(productId);
      toast({
        title: 'Product Deleted',
        description: 'The product has been successfully deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Could not delete product.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };


  if (authIsLoading || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading your products...</p>
      </div>
    );
  }

  if (!uid) {
    return <p className="text-muted-foreground text-center">Could not identify admin user.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search your products by name or code..."
          value={adminSearchTerm}
          onChange={handleAdminSearchChange}
          className="pl-10 w-full"
        />
      </div>
      <ScrollArea className="h-[260px] rounded-md border">
        <Table>
          <TableCaption className="py-4">
            {filteredAdminProducts.length > 0
              ? `Showing ${filteredAdminProducts.length} of your product(s).`
              : adminSearchTerm && filteredAdminProducts.length === 0
              ? '' 
              : 'You have not added any products yet.'}
          </TableCaption>
          <TableHeader className="sticky top-0 bg-secondary z-10">
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead className="w-[20%]">Code</TableHead>
              <TableHead className="w-[20%] text-right">Price</TableHead>
              <TableHead className="w-[20%] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdminProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <PackagePlus className="h-8 w-8" /> 
                    <span>
                      {adminSearchTerm 
                        ? `No products found matching "${adminSearchTerm}".` 
                        : 'No products added by you.'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAdminProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.code}</TableCell>
                  <TableCell className="text-right">
                    ${product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      disabled={isUpdating || isDeleting}
                      aria-label="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isUpdating || isDeleting} aria-label="Delete product">
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product
                            "{product.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(product.id)}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
    </div>
  );
}
