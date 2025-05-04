'use client';

import * as React from 'react';
import SearchInput from '@/components/search-input';
import ProductInputForm from '@/components/product-input-form';
import SearchResults from '@/components/search-results';
import AuthControls from '@/components/auth-controls'; // Import AuthControls
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store'; // Import auth store
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function Home() {
  const { userRole } = useAuthStore(); // Get user role from store

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">Product Finder</h1>
        <p className="text-muted-foreground">
          Search for products across distributed servers.
        </p>
      </header>

       {/* Authentication Controls */}
       <div className="mb-8">
         <AuthControls />
       </div>

      <main className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column: Search & Add Product */}
        <div className="md:col-span-1 space-y-8">
          {userRole !== 'guest' ? (
             <Card>
               <CardHeader>
                 <CardTitle>Search Products</CardTitle>
               </CardHeader>
               <CardContent>
                <SearchInput />
               </CardContent>
             </Card>
           ) : (
             <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Required</AlertTitle>
                <AlertDescription>
                  Please log in as Admin or User to search for products.
                </AlertDescription>
              </Alert>
           )}

          {/* Only show Add Product form to Admins */}
          {userRole === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
               <ProductInputForm />
              </CardContent>
            </Card>
          )}
           {userRole === 'user' && (
            <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Admin Access Required</AlertTitle>
                <AlertDescription>
                  Only administrators can add new products.
                </AlertDescription>
              </Alert>
           )}
        </div>

        {/* Right Column: Search Results */}
        <div className="md:col-span-2">
          {userRole !== 'guest' ? (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchResults />
              </CardContent>
            </Card>
           ) : (
              <Card>
                 <CardHeader>
                   <CardTitle>Search Results</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                       <AlertCircle className="h-8 w-8 mb-2" />
                       <p>Please log in to view search results.</p>
                    </div>
                 </CardContent>
              </Card>
           )}
        </div>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-muted-foreground text-sm">
        Product Finder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
