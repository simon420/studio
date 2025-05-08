// src/app/login/page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { LogIn, Loader2 } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login, isLoading: authIsLoading, isAuthenticated } = useAuthStore(); // isLoading from store
  const [isSubmittingForm, setIsSubmittingForm] = React.useState(false); // Local submitting state

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if user is already authenticated
  React.useEffect(() => {
    if (isAuthenticated && !authIsLoading) { // Check authIsLoading to prevent premature redirect
      const redirectPath = searchParams?.get('redirectedFrom') || '/';
      router.push(redirectPath);
      router.refresh(); // Refresh server components if needed
    }
  }, [isAuthenticated, authIsLoading, router, searchParams]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsSubmittingForm(true);
    try {
      await login(values.email, values.password);
      // onAuthStateChanged in the store will handle updating isAuthenticated.
      // The useEffect above will handle the redirect.
      toast({
        title: 'Login Submitted',
        description: 'Please wait while we verify your credentials.',
      });
    } catch (error: any) {
      console.error('Login page error:', error);
      let errorMessage = 'An unexpected error occurred. Please check your email and password.';
      if (error.code) { // Firebase auth errors
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': // More generic for email/password combo
                 errorMessage = 'Invalid email or password.';
                 break;
            case 'auth/invalid-email':
                 errorMessage = 'The email address is not valid.';
                 break;
            default:
                errorMessage = error.message || 'Login failed.';
        }
      }
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingForm(false);
    }
  }
  
  const displayLoading = authIsLoading || isSubmittingForm;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access Product Finder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={displayLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={displayLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={displayLoading}>
                {displayLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {displayLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="underline hover:text-primary">
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
