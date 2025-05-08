// src/app/login/page.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

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
  const { login, isLoading: authIsLoading, isAuthenticated } = useAuthStore();
  const [isSubmittingForm, setIsSubmittingForm] = React.useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (isAuthenticated && !authIsLoading) {
      const redirectPath = searchParams?.get('redirectedFrom') || '/';
      router.push(redirectPath);
      router.refresh();
    }
  }, [isAuthenticated, authIsLoading, router, searchParams]);

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsSubmittingForm(true);
    try {
      await login(values.email, values.password);
      toast({
        title: 'Login Submitted',
        description: 'Please wait while we verify your credentials.',
      });
    } catch (error: any) {
      console.error('Login page error:', error);
      let errorMessage = 'An unexpected error occurred. Please check your email and password.';
      if (error.code) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
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
      <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl w-full items-center">
        {/* Left Column: Welcome Message */}
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <header className="max-w-md"> {/* Adjusted max-width for better balance */}
            <div className="mx-auto md:mx-0 mb-6 flex items-center justify-center md:justify-start">
                <Image
                    src="https://picsum.photos/100/100" 
                    alt="Product Finder App Logo"
                    width={100} 
                    height={100}
                    className="rounded-full shadow-lg object-cover"
                    data-ai-hint="modern tech"
                />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Welcome to Product Finder
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground">
               Product Finder is your go-to solution for efficiently managing and discovering products. 
               Utilizing Next.js, Firebase Authentication, and Cloud Firestore for a seamless experience.
            </p>
          </header>
        </div>

        {/* Right Column: Login Card */}
        <div className="flex items-center justify-center w-full">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LogIn className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-bold">Login to Your Account</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter your credentials to access your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} disabled={displayLoading} className="text-base"/>
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
                          <Input type="password" placeholder="••••••••" {...field} disabled={displayLoading} className="text-base"/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full py-3 text-base" disabled={displayLoading}>
                    {displayLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                    {displayLoading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </Form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/register" className="font-semibold underline hover:text-primary">
                  Register here
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
