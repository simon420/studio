// src/app/page.tsx
'use client'; // Keep as client component to use hooks and Zustand

import * as React from 'react';
import { useAuthStore } from '@/store/auth-store'; // Import updated auth store
import SearchInput from '@/components/search-input';
import ProductInputForm from '@/components/product-input-form';
import SearchResults from '@/components/search-results';
import AuthControls from '@/components/auth-controls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// No need for getServerSideProps or manual cookie checks here anymore,
// middleware handles redirection for unauthenticated users.
// We just need to read the state from Zustand for UI rendering logic.

export default function Home() {
  // Get auth state from Zustand store
  const { isAuthenticated, userRole } = useAuthStore();

   // Effect to potentially check auth status if needed on client-side navigation
    React.useEffect(() => {
      // If navigating client-side and state might be stale, re-check.
      // Usually not strictly necessary if persist middleware and redirects work.
      // useAuthStore.getState().checkAuthStatus();
    }, []);

  // If middleware hasn't redirected yet, but state is not authenticated,
  // show a loading or minimal state. Usually middleware handles this faster.
  // This check prevents rendering sensitive UI elements briefly before redirection.
  // if (!isAuthenticated) {
  //   return (
  //     <div className="container mx-auto p-4 md:p-8 text-center">
  //       <p>Loading or Redirecting...</p>
  //       {/* Optionally show a spinner */}
  //     </div>
  //   );
  // }


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

      {/* Main Content Grid */}
      <main className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column: Search & Add Product */}
        <div className="md:col-span-1 space-y-8">
           {/* Search is available to both admin and user */}
           {isAuthenticated ? (
              <Card>
                <CardHeader>
                  <CardTitle>Search Products</CardTitle>
                </CardHeader>
                <CardContent>
                 <SearchInput />
                </CardContent>
              </Card>
            ) : (
              // This case should ideally not be reached due to middleware
               <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Required</AlertTitle>
                  <AlertDescription>
                    Please log in to search for products.
                  </AlertDescription>
                </Alert>
            )}


          {/* Only show Add Product form to Admins */}
          {isAuthenticated && userRole === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductInputForm />
              </CardContent>
            </Card>
          )}
          {/* Show message to non-admin users */}
          {isAuthenticated && userRole === 'user' && (
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
          {isAuthenticated ? (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
              </CardHeader>
              <CardContent>
                <SearchResults />
              </CardContent>
            </Card>
          ) : (
             // This case should ideally not be reached
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
