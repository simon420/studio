// src/app/super-admin/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  email: z.string().email('Indirizzo email non valido').min(1, 'Email è richiesta'),
  password: z.string().min(1, 'La password è richiesta.'),
});

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { login, userRole, isAuthenticated, isLoading } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  React.useEffect(() => {
    if (isAuthenticated && userRole === 'super-admin') {
      router.replace('/super-admin/dashboard');
    }
  }, [isAuthenticated, userRole, router]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    form.clearErrors();
    
    try {
      await login(values.email, values.password);
      // The useEffect will handle the redirect upon successful state change
    } catch (error: any) {
      console.error('Super Admin Login error:', error);
      let errorMessage = "Si è verificato un errore imprevisto.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
             errorMessage = 'Credenziali non valide o utente non autorizzato.';
             break;
          default:
            errorMessage = 'Login fallito. Riprova.';
        }
      }
      toast({
        title: 'Accesso Fallito',
        description: errorMessage,
        variant: 'destructive',
      });
      form.setError("root.serverError", { type: "server", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Verifica accesso...</p>
      </div>
    );
  }
  
  if (isAuthenticated && userRole === 'super-admin') {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-lg text-muted-foreground">Reindirizzamento alla dashboard...</p>
        </div>
    );
  }

  // If authenticated but NOT a super-admin, show an unauthorized message.
  if (isAuthenticated && userRole !== 'super-admin') {
      return (
          <div className="super-admin-page-container flex min-h-screen items-center justify-center p-4">
              <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-md rounded-xl relative z-10">
                  <CardHeader className="text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                          <Shield className="h-7 w-7" />
                      </div>
                      <CardTitle className="text-2xl font-bold">Accesso Negato</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-center text-card-foreground">Non hai le autorizzazioni necessarie per accedere a questa pagina.</p>
                      <Button onClick={() => router.push('/')} className="w-full mt-4">Torna alla Home</Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="super-admin-page-container flex min-h-screen items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="w-full shadow-2xl bg-card/80 backdrop-blur-md rounded-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Shield className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold">Accesso Super Admin</CardTitle>
            <CardDescription className="text-card-foreground/80">
              Questa area è riservata. Inserisci le credenziali per continuare.
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
                      <FormLabel>Email Super Admin</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="superadmin@esempio.com"
                          {...field}
                          disabled={isSubmitting}
                        />
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
                      <FormLabel>Password Super Admin</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.formState.errors.root?.serverError && (
                    <p className="text-sm font-medium text-destructive text-center">
                        {form.formState.errors.root.serverError.message}
                    </p>
                )}
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isSubmitting ? 'Verifica...' : 'Accedi'}
                </Button>
              </form>
            </Form>
             <p className="mt-6 text-center text-sm text-card-foreground/80">
                <Link href="/" className="font-semibold text-primary hover:text-primary/80 underline">
                  Torna alla pagina principale
                </Link>
              </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
