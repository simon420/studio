// src/app/page.tsx
'use client'; 

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import SearchInput from '@/components/search-input';
import ProductInputForm from '@/components/product-input-form';
import RegisterForm from '@/components/register-form';
import SearchResults from '@/components/search-results';
import AuthControls from '@/components/auth-controls';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const { isAuthenticated, userRole, isLoading: authIsLoading } = useAuthStore();
  const router = useRouter();

  React.useEffect(() => {
    // If auth is not loading and user is not authenticated, redirect to login
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login?redirectedFrom=/'); // Pass current path for redirect after login
    }
  }, [authIsLoading, isAuthenticated, router]);

  if (authIsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  // If not authenticated and not loading, this content might briefly show before redirect
  // or if redirect fails. Consider a more robust "protected route" HOC if needed.
  // For now, the useEffect handles the redirect.
  if (!isAuthenticated) {
    // This part will likely not be rendered due to the redirect,
    // but it's a fallback or can be shown if redirect logic is changed.
     return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md p-6">
            <CardHeader>
                <CardTitle className="text-center">Access Denied</CardTitle>
                <CardDescription className="text-center">
                    You need to be logged in to view this page. Redirecting to login...
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">Product Finder</h1>
        <p className="text-muted-foreground">
          Search for products using Firebase Authentication.
        </p>
      </header>

      <div className="mb-8">
        <AuthControls />
      </div>

      <main className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-8">
          {/* Content for authenticated users */}
          <Card>
            <CardHeader>
              <CardTitle>Search Products</CardTitle>
            </CardHeader>
            <CardContent>
             <SearchInput />
            </CardContent>
          </Card>

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
              <AlertTitle>User Account</AlertTitle>
              <AlertDescription>
                You are logged in as a user. Only administrators can add new products.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="md:col-span-2">
          <SearchResults />
        </div>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-muted-foreground text-sm">
        Product Finder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
