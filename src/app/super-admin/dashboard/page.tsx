// src/app/super-admin/dashboard/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminRequests from '@/components/admin-requests';
import { Loader2, LogOut, ShieldCheck, ShieldAlert, Package, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SuperAdminProductsList from '@/components/super-admin-products-list'; // Import the new component
import ProductInputForm from '@/components/product-input-form';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { userRole, isAuthenticated, logout, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    // If auth is not loading and the user is not a super-admin, redirect them.
    if (!isLoading && (!isAuthenticated || userRole !== 'super-admin')) {
      router.replace('/super-admin');
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: 'Disconnesso',
        description: 'Sei stato disconnesso con successo.',
      });
      // The useEffect will handle redirecting to the login page after state change.
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast({
        title: 'Logout Fallito',
        description: error.message || 'Impossibile effettuare il logout.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show a loading screen while authentication status is being determined.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Verifica accesso...</p>
      </div>
    );
  }

  // If after loading, the user is still not a super-admin, show nothing or a redirecting message.
  // The useEffect handles the actual redirect logic.
  if (!isAuthenticated || userRole !== 'super-admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="ml-3 text-lg text-muted-foreground">Accesso non autorizzato. Reindirizzamento...</p>
      </div>
    );
  }

  // Render the dashboard for the authenticated super-admin.
  return (
    <div className="main-app-container">
      <div className="main-app-content">
        <div className="container mx-auto p-4 md:p-8">
          <header className="mb-8 flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center">
              <ShieldCheck className="h-8 w-8 mr-3 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-primary">Dashboard Super Admin</h1>
                <p className="text-muted-foreground">Gestione completa delle risorse dell'applicazione.</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="destructive" size="sm" disabled={isLoggingOut}>
              {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
              {isLoggingOut ? 'Disconnessione...' : 'Logout'}
            </Button>
          </header>

          <main className="space-y-8">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><UserPlus className="mr-2"/> Richieste Admin</CardTitle>
                        <CardDescription>
                          Approva o rifiuta le richieste per i nuovi account admin.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AdminRequests />
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Package className="mr-2"/> Aggiungi Prodotto</CardTitle>
                         <CardDescription>
                          Aggiungi un nuovo prodotto al sistema da qui.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ProductInputForm />
                      </CardContent>
                   </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gestione Prodotti Totale</CardTitle>
                      <CardDescription>
                        Visualizza, modifica ed elimina qualsiasi prodotto nel sistema.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SuperAdminProductsList />
                    </CardContent>
                  </Card>
                </div>
              </div>
          </main>
        </div>
      </div>
    </div>
  );
}
