// src/app/super-admin/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSuperAdminStore } from '@/store/super-admin-store';
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
  password: z.string().min(1, 'La password è richiesta.'),
});

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoggingIn, error: authError } = useSuperAdminStore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '' },
  });

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/super-admin/dashboard');
    }
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    if (authError) {
      form.setError('password', { type: 'manual', message: authError });
    }
  }, [authError, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    login(values.password);
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-muted-foreground">Reindirizzamento alla dashboard...</p>
      </div>
    );
  }

  return (
    <div className="super-admin-page-container flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-md rounded-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Shield className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">Accesso Super Admin</CardTitle>
          <CardDescription className="text-card-foreground/80">
            Questa area è riservata. Inserisci la password per continuare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        disabled={isLoggingIn}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoggingIn ? 'Verifica...' : 'Accedi'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
