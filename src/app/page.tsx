// src/app/page.tsx
'use client'; 

import * as React from 'react';
// Link component is not used directly in this version of the page's logic for redirection
// import Link from 'next/link'; 
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
// SearchInput is now part of SearchResults
// import SearchInput from '@/components/search-input'; 
import ProductInputForm from '@/components/product-input-form';
// RegisterForm is not used on this page
// import RegisterForm from '@/components/register-form'; 
import SearchResults from '@/components/search-results';
import AuthControls from '@/components/auth-controls';
import AdminProductsList from '@/components/admin-products-list'; // Import the new component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Loader2, PackageSearch } from 'lucide-react'; // Added PackageSearch
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

  // If auth is still loading, or if auth has loaded but user is not authenticated,
  // show a loading/redirecting message. The useEffect above handles the actual redirect.
  if (authIsLoading || (!authIsLoading && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">
          {authIsLoading ? 'Loading application...' : 'Redirecting to login...'}
        </p>
      </div>
    );
  }

  // If we reach here, authIsLoading is false and isAuthenticated is true.
  // Render the authenticated application content.
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

      <main className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> {/* Adjusted grid from md:grid-cols-3 to md:grid-cols-2 */}
          
          {/* Section 1: Add New Product (Admin Only) or User Info */}
          {userRole === 'admin' ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductInputForm />
              </CardContent>
            </Card>
          ) : ( // userRole === 'user'
            <Card className="h-full flex flex-col"> {/* Make it a Card for consistency */}
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="mr-2 h-5 w-5 text-primary" />
                  Admin Feature
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-center">
                <p className="text-sm text-muted-foreground">
                  Adding new products is an exclusive feature for administrator accounts. As a user, you can search for existing products.
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Section 2: My Added Products (Admin Only) or Placeholder */}
          {userRole === 'admin' ? (
            <Card>
              <CardHeader>
                <CardTitle>My Added Products</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminProductsList />
              </CardContent>
            </Card>
          ) : ( // userRole === 'user'
            <Card className="h-full flex flex-col">
              <CardHeader className="text-center">
                  <PackageSearch className="h-10 w-10 mx-auto mb-2 text-primary" />
                  <CardTitle className="text-lg">Your Product Contributions</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow flex flex-col justify-center">
                <p className="text-sm text-muted-foreground">
                  Administrators can view and manage products they've added in this section.
                  Users do not have product contributions to display here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Section 3: Search Products & Results */}
        <SearchResults /> 
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-muted-foreground text-sm">
        Product Finder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
