// src/components/register-form.tsx
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import type { UserRole } from '@/lib/types';
import { UserPlus, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Indirizzo email non valido').min(1, 'Email è richiesta'),
  password: z.string().min(6, 'La password deve contenere almeno 6 caratteri'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'user'], { required_error: 'Il ruolo è richiesto' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ['confirmPassword'],
});


export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { register, isLoading: authIsLoading, isAuthenticated } = useAuthStore();
  const [isSubmittingForm, setIsSubmittingForm] = React.useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user' as UserRole,
    },
  });
  
  React.useEffect(() => {
    if (isAuthenticated && !authIsLoading) {
      router.push('/'); 
      router.refresh();
    }
  }, [isAuthenticated, authIsLoading, router]);

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsSubmittingForm(true);
    form.clearErrors();

    try {
      await register(values.email, values.password, values.role);
      // onAuthStateChanged in store handles setting isAuthenticated.
      // useEffect above handles redirect.
      toast({
        title: 'Registrazione Riuscita',
        description: 'Il tuo account è stato creato. Hai effettuato l\'accesso.',
      });
    } catch (error: any) {
      console.error('Registration form error:', error);
      let errorMessage = 'Si è verificato un errore imprevisto.';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Questo indirizzo email è già in uso.';
            form.setError('email', { type: 'server', message: errorMessage });
            break;
          case 'auth/weak-password':
            errorMessage = 'La password è troppo debole (almeno 6 caratteri).';
            form.setError('password', { type: 'server', message: errorMessage });
            break;
          case 'auth/invalid-email':
            errorMessage = 'L\'indirizzo email non è valido.';
            form.setError('email', { type: 'server', message: errorMessage });
            break;
          default:
            errorMessage = error.message || 'Registrazione fallita.';
        }
      } else {
        errorMessage = error.message || 'Registrazione fallita.';
      }
      
      toast({
        title: 'Registrazione Fallita',
        description: errorMessage,
        variant: 'destructive',
      });
       if (!form.formState.errors.email && !form.formState.errors.password && !form.formState.errors.confirmPassword && !form.formState.errors.role) {
          form.setError('root.serverError', {
             type: 'server',
             message: errorMessage
          });
       }
    } finally {
      setIsSubmittingForm(false);
    }
  }
  
  const displayLoading = authIsLoading || isSubmittingForm;

  return (
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
                <Input type="password" placeholder="min. 6 caratteri" {...field} disabled={displayLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conferma Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="riscrivi la password" {...field} disabled={displayLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ruolo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={displayLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un ruolo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Gli Admin possono aggiungere prodotti, gli Utenti possono solo cercare.
              </FormDescription>
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
          {displayLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" /> }
          {displayLoading ? 'Registrazione...' : 'Registrati'}
        </Button>
      </form>
    </Form>
  );
}
