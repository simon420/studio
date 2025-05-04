'use client';

import * as React from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, LogOut, User, ShieldCheck } from 'lucide-react';

export default function AuthControls() {
  const { userRole, loginAsAdmin, loginAsUser, logout } = useAuthStore();

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin':
        return <ShieldCheck className="mr-2 h-4 w-4" />;
      case 'user':
        return <User className="mr-2 h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
        <CardDescription>
          Current Role: <span className="font-semibold capitalize">{userRole}</span>
          {getRoleIcon()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        {userRole === 'guest' ? (
          <>
            <Button onClick={loginAsAdmin} variant="outline" size="sm">
              <LogIn className="mr-2 h-4 w-4" /> Login as Admin
            </Button>
            <Button onClick={loginAsUser} variant="outline" size="sm">
              <LogIn className="mr-2 h-4 w-4" /> Login as User
            </Button>
          </>
        ) : (
          <Button onClick={logout} variant="destructive" size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
