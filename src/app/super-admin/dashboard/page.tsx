// src/app/super-admin/dashboard/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSuperAdminStore } from '@/store/super-admin-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminRequests from '@/components/admin-requests';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useSuperAdminStore();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isClient && !isAuthenticated) {
      router.replace('/super-admin');
    }
  }, [isAuthenticated, router, isClient]);
  
  const handleLogout = () => {
    logout();
    // The effect above will handle the redirection
  };

  if (!isClient || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Verifica accesso...</p>
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
            <Button onClick={handleLogout} variant="destructive" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </header>

          <main className="space-y-8">
             <Card>
                <CardHeader>
                  <CardTitle>Richieste di Registrazione Admin</CardTitle>
                  <CardDescription>
                    Approva o rifiuta le richieste per i nuovi account admin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminRequests />
                </CardContent>
              </Card>
              {/* Other super admin panels will go here */}
          </main>
        </div>
      </div>
    </div>
  );
}
