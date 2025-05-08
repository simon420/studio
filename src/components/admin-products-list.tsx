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
import { Input } from '@/components/ui/input'; // Import Input
import { PackagePlus, Loader2, Search } from 'lucide-react';

export default function AdminProductsList() {
  const { uid, isLoading: authIsLoading } = useAuthStore();
  const products = useProductStore((state) => state.products);
  const fetchProductsFromFirestore = useProductStore((state) => state.fetchProductsFromFirestore);
  
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [adminSearchTerm, setAdminSearchTerm] = React.useState(''); // State for admin search

  React.useEffect(() => {
    if (!authIsLoading && uid) {
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
      <ScrollArea className="h-[260px] rounded-md border"> {/* Adjusted height for search bar */}
        <Table>
          <TableCaption className="py-4">
            {filteredAdminProducts.length > 0
              ? `Showing ${filteredAdminProducts.length} of your product(s).`
              : adminSearchTerm && filteredAdminProducts.length === 0
              ? '' // Message "Your search for ... yielded no results." deleted as per request
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
            {filteredAdminProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
