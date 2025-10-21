// src/app/login/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { LogIn, Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email('Indirizzo email non valido').min(1, 'Email è richiesta'),
  password: z.string().min(1, 'Password è richiesta'),
});

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading, firebaseUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && firebaseUser) {
      const redirectedFrom = searchParams.get('redirectedFrom');
      const targetUrl = redirectedFrom || '/';
      router.push(targetUrl);
    }
  }, [isLoading, isAuthenticated, firebaseUser, router, searchParams]);
  

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    form.clearErrors();
    
    try {
      await login(values.email, values.password);
      toast({
        title: 'Login Riuscito',
        description: 'Sei stato autenticato con successo.',
      });
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = "Si è verificato un errore imprevisto.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
             errorMessage = 'Email o password non validi.';
             form.setError('email', { type: 'server', message: ' ' });
             form.setError('password', { type: 'server', message: ' ' });
             break;
          case 'auth/invalid-email':
            errorMessage = 'Indirizzo email non valido.';
            form.setError('email', { type: 'server', message: errorMessage });
            break;
          default:
            errorMessage = 'Login fallito. Riprova.';
        }
      }
      toast({
        title: 'Login Fallito',
        description: errorMessage,
        variant: 'destructive',
      });
      if(!form.formState.errors.email && !form.formState.errors.password) {
        form.setError("root.serverError", { type: "server", message: errorMessage});
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayLoading = isLoading || isSubmitting;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Verifica autenticazione...</p>
      </div>
    );
  }
  
  if (isAuthenticated) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-background">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-3 text-lg text-muted-foreground">Reindirizzamento...</p>
       </div>
     );
  }

  return (
    <div className="login-page-container p-4">
      <div className="login-page-content-grid grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl w-full items-center">
        <div className="flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <header className="max-w-md p-6 md:p-8 rounded-xl bg-card/80 backdrop-blur-md shadow-2xl">
            <div className="mx-auto md:mx-0 mb-6 flex items-center justify-center md:justify-start">
              <Image
                src="https://picsum.photos/seed/tech/100/100"
                alt="Logo App Ricerca Prodotti"
                width={100}
                height={100}
                className="rounded-full shadow-lg object-cover"
                data-ai-hint="modern tech"
              />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              Benvenuto!
            </h1>
            <p className="text-lg lg:text-xl text-card-foreground/90">
              Accedi al tuo account per iniziare a scoprire e gestire i prodotti.
            </p>
          </header>
        </div>

        <div className="flex items-center justify-center w-full">
          <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-md rounded-xl">
            <CardHeader className="text-center">
               <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
                 <LogIn className="h-7 w-7" />
               </div>
              <CardTitle className="text-2xl font-bold">Accedi al tuo Account</CardTitle>
              <CardDescription className="text-card-foreground/80">
                Inserisci le tue credenziali qui sotto.
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
                          <Input type="email" placeholder="tu@esempio.com" {...field} disabled={displayLoading} />
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
                          <Input type="password" placeholder="********" {...field} disabled={displayLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   {form.formState.errors.root?.serverError && (
                       <p className="text-sm font-medium text-destructive">
                           {form.formState.errors.root.serverError.message}
                       </p>
                   )}
                  <Button type="submit" className="w-full" disabled={displayLoading}>
                    {displayLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    {displayLoading ? 'Accesso in corso...' : 'Accedi'}
                  </Button>
                </form>
              </Form>
              <p className="mt-6 text-center text-sm text-card-foreground/80">
                Non hai un account?{' '}
                <Link href="/register" className="font-semibold text-primary hover:text-primary/80 underline">
                  Registrati qui
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
