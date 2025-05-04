// src/app/register/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RegisterForm from '@/components/register-form'; // Import the reusable form

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Register</CardTitle>
          <CardDescription className="text-center">
            Create a new account for Product Finder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm /> {/* Use the reusable form component */}
           <p className="mt-4 text-center text-sm text-muted-foreground">
             Already have an account?{' '}
             <Link href="/login" className="underline hover:text-primary">
               Login here
             </Link>
           </p>
        </CardContent>
      </Card>
    </div>
  );
}

// You might want to restrict access to this page,
// e.g., only allow admins to register new users, or make it public.
// This example assumes it's public for now.
