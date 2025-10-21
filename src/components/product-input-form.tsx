
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
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Product name must be at least 2 characters.',
  }),
  code: z.coerce.number().int().positive({
    message: 'Product code must be a positive number.',
  }),
  price: z.coerce.number().positive({
    message: 'Price must be a positive number.',
  }),
});

type ProductFormInputValues = {
  name: string;
  code: string; 
  price: string;
};

export default function ProductInputForm() {
  const addProduct = useProductStore((state) => state.addProduct);
  const { isAuthenticated, userRole, isLoading: authIsLoading } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = isAuthenticated && userRole === 'admin';
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ProductFormInputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '', 
      price: '', 
    },
  });

   React.useEffect(() => {
     if (!isAdmin && !authIsLoading) { 
       form.reset({ name: '', code: '', price: '' });
     }
   }, [isAdmin, authIsLoading, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isAdmin) {
        toast({
            title: "Unauthorized",
            description: "You must be an admin to add products.",
            variant: "destructive",
        });
        return;
    }
    setIsSubmitting(true);
    try {
        await addProduct({
            name: values.name,
            code: values.code,
            price: values.price,
        });

        toast({
          title: "Product Added",
          description: `"${values.name}" has been added successfully.`,
        });
        form.reset({ name: '', code: '', price: '' });
    } catch (e: any) {
        console.error("Error adding product:", e);
        toast({
          title: "Error",
          description: e.message || "Could not add product.",
          variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const displayLoading = authIsLoading || isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={!isAdmin || displayLoading} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => ( 
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Super Widget" {...field} value={field.value || ''} />
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
                  <Input type="number" placeholder="e.g., 12345" {...field} value={field.value || ''} />
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
                  <Input type="number" step="0.01" placeholder="e.g., 19.99" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <Button type="submit" className="w-full" disabled={!isAdmin || displayLoading}>
             {displayLoading && isAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {displayLoading && isAdmin ? 'Adding...' : 'Add Product'}
           </Button>
        </fieldset>
         {!isAdmin && !authIsLoading && ( 
             <p className="text-sm text-muted-foreground text-center pt-2">
                 Only administrators can add products.
             </p>
         )}
         {authIsLoading && ( 
            <div className="flex items-center justify-center pt-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="ml-2 text-sm text-muted-foreground">Checking permissions...</p>
            </div>
         )}
      </form>
    </Form>
  );
}
