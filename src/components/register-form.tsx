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
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'user'], { required_error: 'Role is required' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
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
        title: 'Registration Successful',
        description: 'Your account has been created. You are now logged in.',
      });
    } catch (error: any) {
      console.error('Registration form error:', error);
      let errorMessage = 'An unexpected error occurred.';
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already in use.';
            form.setError('email', { type: 'server', message: errorMessage });
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak (at least 6 characters).';
            form.setError('password', { type: 'server', message: errorMessage });
            break;
          case 'auth/invalid-email':
            errorMessage = 'The email address is not valid.';
            form.setError('email', { type: 'server', message: errorMessage });
            break;
          default:
            errorMessage = error.message || 'Registration failed.';
        }
      } else {
        errorMessage = error.message || 'Registration failed.';
      }
      
      toast({
        title: 'Registration Failed',
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
                <Input type="password" placeholder="min. 6 characters" {...field} disabled={displayLoading} />
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
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="re-type password" {...field} disabled={displayLoading} />
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
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={displayLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Admins can add products, Users can only search.
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
          {displayLoading ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </Form>
  );
}
