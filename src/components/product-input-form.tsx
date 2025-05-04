'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { useProductStore } from '@/store/product-store';
import { useAuthStore } from '@/store/auth-store'; // Import auth store
import { useToast } from '@/hooks/use-toast'; // Assuming useToast hook exists
import { PlusCircle } from 'lucide-react';


const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Product name must be at least 2 characters.',
  }),
  code: z.coerce.number().int().positive({ // Coerce to number, ensure positive integer
    message: 'Product code must be a positive number.',
  }),
  price: z.coerce.number().positive({ // Coerce to number, ensure positive
    message: 'Price must be a positive number.',
  }),
});

export default function ProductInputForm() {
  const addProduct = useProductStore((state) => state.addProduct);
  // Get full auth state
  const { isAuthenticated, userRole } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = isAuthenticated && userRole === 'admin'; // Check if user is authenticated admin

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: undefined, // Use undefined for number inputs initially
      price: undefined,
    },
  });

   // Reset form if user is no longer an admin or logs out
   React.useEffect(() => {
     if (!isAdmin) {
       form.reset();
     }
   }, [isAdmin, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isAdmin) return; // Prevent submission if not authenticated admin

    // Add the product to the store
    addProduct({
        name: values.name,
        code: values.code,
        price: values.price,
    });

    // Show success toast
    toast({
      title: "Product Added",
      description: `"${values.name}" has been added successfully locally.`, // Clarify it's local
    });

    // Reset the form
    form.reset();
  }

  // The parent component (`Home`) should already conditionally render this form
  // only for admins, but we keep the disabled state as an extra layer.
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Disable the entire fieldset if not an admin */}
        <fieldset disabled={!isAdmin} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Super Widget" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Code</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 12345" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="e.g., 19.99" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <Button type="submit" className="w-full" disabled={!isAdmin}>
             <PlusCircle className="mr-2 h-4 w-4" /> Add Product
           </Button>
        </fieldset>
         {!isAdmin && (
             <p className="text-sm text-muted-foreground text-center">
                 Only administrators can add products.
             </p>
         )}
      </form>
    </Form>
  );
}
