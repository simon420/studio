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
    message: 'Il nome del prodotto deve contenere almeno 2 caratteri.',
  }),
  // Code is not editable in this dialog, but included for type consistency if needed later
  // code: z.coerce.number().int().positive({
  //   message: 'Product code must be a positive number.',
  // }),
  price: z.coerce.number().positive({
    message: 'Il prezzo deve essere un numero positivo.',
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
          <DialogTitle>Modifica Prodotto</DialogTitle>
          <DialogDescription>
            Apporta modifiche al tuo prodotto qui. Il codice del prodotto non può essere modificato. Clicca su salva quando hai finito.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Prodotto</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Super Widget" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Codice Prodotto (Sola lettura)</FormLabel>
              <FormControl>
                <Input type="number" value={product.code} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
              </FormControl>
            </FormItem>
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo (€)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="es. 19.99" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Annulla
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
