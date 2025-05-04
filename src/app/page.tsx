// src/app/page.tsx
'use client'; // Keep as client component to use hooks and Zustand

import * as React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store'; // Import updated auth store
import SearchInput from '@/components/search-input';
import ProductInputForm from '@/components/product-input-form';
import RegisterForm from '@/components/register-form'; // Import RegisterForm
import SearchResults from '@/components/search-results';
import AuthControls from '@/components/auth-controls';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  // Get auth state from Zustand store
  const { isAuthenticated, userRole } = useAuthStore();

  React.useEffect(() => {
    // Optional: Re-check auth state on mount/navigation if needed
    // useAuthStore.getState().checkAuthStatus();
  }, []);


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

        {/* Left Column: Conditional Content based on Auth */}
        <div className="md:col-span-1 space-y-8">
          {!isAuthenticated ? (
            // Show Registration Form when not logged in
            <Card>
              <CardHeader>
                <CardTitle>Register New User</CardTitle>
                <CardDescription>Create an account to search for products.</CardDescription>
              </CardHeader>
              <CardContent>
                <RegisterForm />
                 <p className="mt-4 text-center text-sm text-muted-foreground">
                   Already have an account?{' '}
                   <Link href="/login" className="underline hover:text-primary">
                     Login here
                   </Link>
                 </p>
              </CardContent>
            </Card>
          ) : (
            // Show Search and Add Product (if admin) when logged in
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Search Products</CardTitle>
                </CardHeader>
                <CardContent>
                 <SearchInput />
                </CardContent>
              </Card>

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

              {/* Show message to non-admin users */}
              {userRole === 'user' && (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Admin Access Required</AlertTitle>
                  <AlertDescription>
                    Only administrators can add new products.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        {/* Right Column: Search Results */}
        <div className="md:col-span-2">
          {/* SearchResults component handles its own display logic based on auth state */}
          <SearchResults />
        </div>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-muted-foreground text-sm">
        Product Finder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
