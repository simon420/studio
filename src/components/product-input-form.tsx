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
import { toast } from '@/hooks/use-toast'; // Assuming useToast hook exists
import { Toaster } from '@/components/ui/toaster'; // Ensure Toaster is rendered in layout or page
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
  const { userRole } = useAuthStore(); // Get user role
  const isAdmin = userRole === 'admin'; // Check if user is admin

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: undefined, // Use undefined for number inputs initially
      price: undefined,
    },
  });

  // Disable form fields if not admin
  React.useEffect(() => {
    if (!isAdmin) {
      form.reset(); // Clear form if role changes away from admin
    }
  }, [isAdmin, form]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isAdmin) return; // Prevent submission if not admin

    // Add the product to the store
    addProduct({
        name: values.name,
        code: values.code,
        price: values.price,
    });

    // Show success toast
    toast({
      title: "Product Added",
      description: `"${values.name}" has been added successfully.`,
    });

    // Reset the form
    form.reset();
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!isAdmin} className="space-y-4"> {/* Disable fieldset if not admin */}
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
                    <Input type="number" placeholder="e.g., 12345" {...field} />
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
                    <Input type="number" step="0.01" placeholder="e.g., 19.99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button type="submit" className="w-full" disabled={!isAdmin}>
               <PlusCircle className="mr-2 h-4 w-4" /> Add Product
             </Button>
          </fieldset>
        </form>
      </Form>
      {/* Toaster needed to display toasts. Render it once in your layout or main page */}
      {/* <Toaster /> */}
    </>
  );
}
