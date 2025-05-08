'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Product } from '@/lib/types';
import { Loader2, Save } from 'lucide-react';

const editProductSchema = z.object({
  name: z.string().min(2, {
    message: 'Product name must be at least 2 characters.',
  }),
  // Code is not editable in this dialog, but included for type consistency if needed later
  // code: z.coerce.number().int().positive({
  //   message: 'Product code must be a positive number.',
  // }),
  price: z.coerce.number().positive({
    message: 'Price must be a positive number.',
  }),
});

type EditProductFormValues = {
  name: string;
  price: string; // Keep as string for form input, zod will coerce
};

interface EditProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedData: Partial<Pick<Product, 'name' | 'price'>>) => Promise<void>;
  isSaving: boolean;
}

export default function EditProductDialog({
  product,
  isOpen,
  onOpenChange,
  onSave,
  isSaving,
}: EditProductDialogProps) {
  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: '',
      price: '',
    },
  });

  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        price: product.price.toString(),
      });
    }
  }, [product, form, isOpen]); // Re-initialize form when product or isOpen changes

  if (!product) return null;

  async function onSubmit(values: z.infer<typeof editProductSchema>) {
    // values.price is already coerced to number by Zod
    await onSave({ name: values.name, price: values.price });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Make changes to your product here. Product code cannot be changed. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Super Widget" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Product Code (Read-only)</FormLabel>
              <FormControl>
                <Input type="number" value={product.code} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 19.99" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
