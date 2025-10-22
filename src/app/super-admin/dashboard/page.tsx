// src/app/super-admin/dashboard/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminRequests from '@/components/admin-requests';
import { Loader2, LogOut, ShieldCheck, ShieldAlert, Package, UserPlus, Users, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SuperAdminProductsList from '@/components/super-admin-products-list'; 
import ProductInputForm from '@/components/product-input-form';
import UserManagement from '@/components/user-management';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { userRole, isAuthenticated, logout, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
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

  if (isLoading || (isLoggingOut && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">
            {isLoggingOut ? 'Disconnessione in corso...' : 'Verifica accesso...'}
        </p>
      </div>
    );
  }
  
  if (!isAuthenticated || userRole !== 'super-admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="ml-3 text-lg text-muted-foreground">Accesso non autorizzato. Reindirizzamento...</p>
      </div>
    );
  }

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

          <main>
            <Tabs defaultValue="products" className="space-y-4">
              <TabsList>
                <TabsTrigger value="products"><Package className="mr-2" /> Gestione Prodotti</TabsTrigger>
                <TabsTrigger value="users"><Users className="mr-2" /> Gestione Utenti</TabsTrigger>
                <TabsTrigger value="add-product"><PackagePlus className="mr-2" /> Aggiungi Prodotto</TabsTrigger>
                <TabsTrigger value="admin-requests"><UserPlus className="mr-2" /> Richieste Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle>Gestione Prodotti Totale</CardTitle>
                    <CardDescription>
                      Visualizza, cerca, modifica ed elimina qualsiasi prodotto nel sistema.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SuperAdminProductsList />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                    <CardHeader>
                      <CardTitle>Gestione Utenti</CardTitle>
                      <CardDescription>
                        Visualizza ed elimina gli utenti registrati nel sistema.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserManagement />
                    </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="add-product">
                <Card>
                    <CardHeader>
                      <CardTitle>Aggiungi Nuovo Prodotto</CardTitle>
                        <CardDescription>
                        Aggiungi un nuovo prodotto al sistema da qui. Verrà assegnato allo shard corretto in base al codice.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProductInputForm />
                    </CardContent>
                  </Card>
              </TabsContent>

              <TabsContent value="admin-requests">
                <Card>
                    <CardHeader>
                      <CardTitle>Richieste di Registrazione Admin</CardTitle>
                      <CardDescription>
                        Approva o rifiuta le richieste per i nuovi account di tipo "admin".
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AdminRequests />
                    </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
