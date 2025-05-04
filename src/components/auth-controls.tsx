// src/components/auth-controls.tsx
'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, ShieldCheck, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AuthControls() {
  const { username, userRole, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

   // Effect to check auth status when component mounts on the client
   React.useEffect(() => {
      // This is a simple check if the store thinks we are authenticated.
      // More robust checks could involve verifying the token's presence/validity client-side if needed.
      // useAuthStore.getState().checkAuthStatus(); // Re-enable if needed, but be cautious
   }, []);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); // Call the logout action from the store (handles API + state)
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
       router.push('/login'); // Redirect to login page
       router.refresh(); // Refresh server components
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast({
        title: 'Logout Failed',
        description: error.message || 'Could not log out.',
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
        <CardDescription className="flex items-center">
          {isAuthenticated ? (
            <>
              Logged in as: <span className="font-semibold ml-1">{username}</span> ({userRole})
              {getRoleIcon()}
            </>
          ) : (
            'You are not logged in.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        {isAuthenticated ? (
          <Button onClick={handleLogout} variant="destructive" size="sm" disabled={isLoggingOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        ) : (
           <Button onClick={handleLoginRedirect} variant="outline" size="sm">
             <LogIn className="mr-2 h-4 w-4" /> Go to Login
           </Button>
          // Optionally add a button to redirect to registration
          // <Button onClick={() => router.push('/register')} variant="outline" size="sm">
          //   <UserPlus className="mr-2 h-4 w-4" /> Register
          // </Button>
        )}
      </CardContent>
    </Card>
  );
}
