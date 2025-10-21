
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
    message: 'Il nome del prodotto deve essere di almeno 2 caratteri.',
  }),
  code: z.coerce.number().int().positive({
    message: 'Il codice prodotto deve essere un numero positivo.',
  }),
  price: z.coerce.number().positive({
    message: 'Il prezzo deve essere un numero positivo.',
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
            title: "Non autorizzato",
            description: "Devi essere un amministratore per aggiungere prodotti.",
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
          title: "Prodotto Aggiunto",
          description: `"${values.name}" è stato aggiunto con successo.`,
        });
        form.reset({ name: '', code: '', price: '' });
    } catch (e: any) {
        console.error("Errore aggiunta prodotto:", e);
        toast({
          title: "Errore",
          description: e.message || "Impossibile aggiungere il prodotto.",
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
                <FormLabel>Nome Prodotto</FormLabel>
                <FormControl>
                  <Input placeholder="es. Super Widget" {...field} value={field.value || ''} />
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
                <FormLabel>Codice Prodotto</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="es. 12345" {...field} value={field.value || ''} />
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
                <FormLabel>Prezzo (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="es. 19.99" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <Button type="submit" className="w-full" disabled={!isAdmin || displayLoading}>
             {displayLoading && isAdmin ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {displayLoading && isAdmin ? 'Aggiungendo...' : 'Aggiungi Prodotto'}
           </Button>
        </fieldset>
         {!isAdmin && !authIsLoading && ( 
             <p className="text-sm text-muted-foreground text-center pt-2">
                 Solo gli amministratori possono aggiungere prodotti.
             </p>
         )}
         {authIsLoading && ( 
            <div className="flex items-center justify-center pt-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="ml-2 text-sm text-muted-foreground">Verifica autorizzazioni...</p>
            </div>
         )}
      </form>
    </Form>
  );
}
