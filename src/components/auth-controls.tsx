// src/components/auth-controls.tsx
'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, ShieldCheck, LogIn, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AuthControls() {
  const { email, userRole, isAuthenticated, logout, isLoading: authIsLoading } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: 'Disconnesso',
        description: 'Sei stato disconnesso con successo.',
      });
       // Redirect is handled by onAuthStateChanged listener setting isAuthenticated to false,
       // which page.tsx or other protected components would react to.
       // Forcing a push here can be redundant or conflict.
       // router.push('/login');
       // router.refresh(); // Might not be needed if components correctly react to store changes
    } catch (error: any) {
      console.error('Logout fallito:', error);
      toast({
        title: 'Logout Fallito',
        description: error.message || 'Impossibile effettuare il logout.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const getRoleIcon = () => {
    if (!isAuthenticated) return null;
    switch (userRole) {
      case 'admin':
        return <ShieldCheck className="ml-2 h-4 w-4 text-primary" />;
      case 'user':
        return <User className="ml-2 h-4 w-4 text-secondary-foreground" />;
      default:
        return null;
    }
  };
  
  // Show loading state if auth is initially loading and not during a logout operation
  if (authIsLoading && !isLoggingOut) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autenticazione</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">Verifica stato autenticazione...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticazione</CardTitle>
        <CardDescription className="flex items-center min-h-[20px]"> {/* Added min-height */}
          {isAuthenticated ? (
            <>
              Accesso come: <span className="font-semibold ml-1">{email || 'Utente'}</span> ({userRole})
              {getRoleIcon()}
            </>
          ) : (
            'Non hai effettuato l\'accesso.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        {isAuthenticated ? (
          <Button onClick={handleLogout} variant="destructive" size="sm" disabled={isLoggingOut || authIsLoading}>
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
            {isLoggingOut ? 'Disconnessione...' : 'Logout'}
          </Button>
        ) : (
           <Button onClick={handleLoginRedirect} variant="outline" size="sm" disabled={authIsLoading}>
             <LogIn className="mr-2 h-4 w-4" /> Vai al Login
           </Button>
        )}
      </CardContent>
    </Card>
  );
}
