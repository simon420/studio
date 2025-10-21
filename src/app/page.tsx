// src/app/page.tsx
'use client'; 

import * as React from 'react';
// Link component is not used directly in this version of the page's logic for redirection
// import Link from 'next/link'; 
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import next/image
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
import { AlertCircle, Loader2, PackageSearch, Search } from 'lucide-react'; // Added PackageSearch, Search
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
      <div className="flex min-h-screen items-center justify-center bg-background"> {/* Ensure loading also has a background */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">
          {authIsLoading ? 'Caricamento applicazione...' : 'Reindirizzamento al login...'}
        </p>
      </div>
    );
  }

  // If we reach here, authIsLoading is false and isAuthenticated is true.
  // Render the authenticated application content.
  return (
    <div className="main-app-container">
      <div className="main-app-content">
        <div className="container mx-auto p-4 md:p-8">
          <header className="mb-8 flex flex-col sm:flex-row items-center justify-center sm:justify-start text-center sm:text-left">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mr-0 sm:mr-4 mb-2 sm:mb-0 rounded-full overflow-hidden shadow-md">
                <Image
                    src="https://picsum.photos/80/80?data-ai-hint=product+design" 
                    alt="Logo Ricerca Prodotti"
                    width={80}
                    height={80}
                    className="object-cover"
                    data-ai-hint="product design" 
                />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-primary">Ricerca Prodotti</h1>
                <p className="text-muted-foreground">
                Cerca prodotti utilizzando Firebase Authentication e Cloud Firestore Database
                </p>
            </div>
          </header>

          <div className="mb-8">
            <AuthControls />
          </div>

          <main className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Section 1: Add New Product (Admin Only) or User Info */}
              {userRole === 'admin' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Aggiungi Nuovo Prodotto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProductInputForm />
                  </CardContent>
                </Card>
              ) : ( // userRole === 'user'
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5 text-primary" />
                      Funzionalità Admin
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex items-center">
                    <p className="text-sm text-muted-foreground">
                      L'aggiunta di nuovi prodotti è una funzionalità esclusiva per gli account amministratori. Come utente, puoi cercare i prodotti esistenti.
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Section 2: My Added Products (Admin Only) or Placeholder */}
              {userRole === 'admin' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>I Miei Prodotti Aggiunti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdminProductsList />
                  </CardContent>
                </Card>
              ) : ( // userRole === 'user'
                <Card className="h-full flex flex-col">
                  <CardHeader className="text-center">
                      <PackageSearch className="h-10 w-10 mx-auto mb-2 text-primary" />
                      <CardTitle className="text-lg">I Tuoi Contributi di Prodotti</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center flex-grow flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground">
                      Gli amministratori possono visualizzare e gestire i prodotti che hanno aggiunto in questa sezione.
                      Gli utenti non hanno contributi di prodotti da visualizzare qui.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section 3: Search Products & Results */}
            <SearchResults /> 
          </main>

          <footer className="mt-12 pt-4 border-t text-center text-muted-foreground text-sm">
            Ricerca Prodotti &copy; {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </div>
  );
}
