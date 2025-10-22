// src/app/super-admin/dashboard/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminRequests from '@/components/admin-requests';
import { Loader2, LogOut, ShieldCheck, ShieldAlert, KeyRound, ServerCrash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { userRole, isAuthenticated, logout, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // State for debugging the private key
  const [privateKey, setPrivateKey] = React.useState<string>('');
  const [isFetchingKey, setIsFetchingKey] = React.useState<boolean>(false);
  const [keyError, setKeyError] = React.useState<string>('');

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

  const fetchPrivateKeyForDebug = async () => {
    setIsFetchingKey(true);
    setKeyError('');
    setPrivateKey('');
    try {
        const response = await fetch('/api/debug-key');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Errore nel recupero della chiave.');
        }
        const data = await response.json();
        setPrivateKey(data.privateKey || 'CHIAVE VUOTA O NON TROVATA');
    } catch (error: any) {
        console.error('Fetch private key error:', error);
        setKeyError(error.message);
    } finally {
        setIsFetchingKey(false);
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

              {/* Debugging Panel */}
              <Card className="border-amber-500 border-2">
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-600">
                    <KeyRound className="mr-2"/>
                    Pannello di Debug: Chiave Privata
                  </CardTitle>
                  <CardDescription>
                    Utilizza questo strumento per visualizzare il valore della variabile d'ambiente della chiave privata così come viene letta dal server.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Button onClick={fetchPrivateKeyForDebug} disabled={isFetchingKey}>
                     {isFetchingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
                     {isFetchingKey ? 'Recupero...' : 'Mostra Chiave Privata'}
                   </Button>
                   {keyError && (
                    <Alert variant="destructive">
                        <ServerCrash className="h-4 w-4" />
                        <AlertTitle>Errore</AlertTitle>
                        <AlertDescription>{keyError}</AlertDescription>
                    </Alert>
                   )}
                   {privateKey && (
                     <div>
                        <Label htmlFor="privateKeyDebug" className="mb-2 block">Valore di FIREBASE_PRIVATE_KEY dal server:</Label>
                        <Textarea
                            id="privateKeyDebug"
                            readOnly
                            value={privateKey}
                            className="h-48 font-mono text-xs bg-muted/50"
                            placeholder="La chiave privata apparirà qui..."
                        />
                     </div>
                   )}
                </CardContent>
              </Card>

          </main>
        </div>
      </div>
    </div>
  );
}
