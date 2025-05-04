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
import { UserPlus } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'user'], { required_error: 'Role is required' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'], // path of error
});


export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      role: undefined, // Initially no role selected
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    form.clearErrors(); // Clear previous errors

    let response: Response | null = null; // Define response outside try block

    try {
       // Exclude confirmPassword before sending to API
      const { confirmPassword, ...payload } = values;

      response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Read the response body as text first
      const responseText = await response.text();
      let data;

      try {
        // Try parsing the text as JSON
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // If JSON parsing fails, check if it's HTML or just malformed
        console.error('API did not return valid JSON:', jsonError);
        console.error('Raw API response text:', responseText); // Log the raw text
        if (responseText.trim().toLowerCase().startsWith('<!doctype html')) {
             throw new Error('Server returned an HTML error page instead of JSON. Check server logs.');
        } else {
             // Throw a more specific error including the response status if available
             const statusText = response.statusText ? ` (${response.statusText})` : '';
             throw new Error(`Failed to parse server response (Status: ${response.status}${statusText}). Response was not valid JSON.`);
        }
      }

      // Now that we have successfully parsed JSON (data), check response.ok
      if (!response.ok) {
        // Handle known API errors (like validation errors or conflicts)
        if (data.errors) {
             Object.entries(data.errors as Record<string, string[]>).forEach(([field, messages]) => {
                 form.setError(field as keyof z.infer<typeof registerSchema>, {
                     type: 'server',
                     message: messages.join(', '),
                 });
             });
        }
         // Use the message from the parsed JSON error response
         throw new Error(data.message || `Registration failed with status: ${response.status}`);
      }

      // --- Success Case ---
      toast({
        title: 'Registration Successful',
        description: 'You can now log in with your credentials.',
      });

      router.push('/login'); // Redirect to login page after successful registration

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        // Check if response exists and wasn't OK for a more specific default message
        description: error.message || (response && !response.ok ? `Server responded with status ${response.status}` : 'An unexpected error occurred.'),
        variant: 'destructive',
      });
       // Set a general form error if it's not field-specific
       if (!form.formState.errors.username && !form.formState.errors.password && !form.formState.errors.confirmPassword && !form.formState.errors.role) {
          form.setError('root.serverError', {
             type: 'server',
             message: error.message || 'An unexpected error occurred.'
          });
       }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="choose_a_username" {...field} disabled={isLoading} />
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
                <Input type="password" placeholder="min. 6 characters" {...field} disabled={isLoading} />
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
                <Input type="password" placeholder="re-type password" {...field} disabled={isLoading} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
         {/* Display root level errors */}
         {form.formState.errors.root?.serverError && (
             <p className="text-sm font-medium text-destructive">
                 {form.formState.errors.root.serverError.message}
             </p>
         )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          <UserPlus className="mr-2 h-4 w-4" />
          {isLoading ? 'Registering...' : 'Register'}
        </Button>
      </form>
    </Form>
  );
}
