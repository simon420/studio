import SearchInput from '@/components/search-input';
import ProductInputForm from '@/components/product-input-form';
import SearchResults from '@/components/search-results';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary">Product Finder</h1>
        <p className="text-muted-foreground">
          Search for products across distributed servers.
        </p>
      </header>

      <main className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left Column: Search & Add Product */}
        <div className="md:col-span-1 space-y-8">
           <Card>
             <CardHeader>
               <CardTitle>Search Products</CardTitle>
             </CardHeader>
             <CardContent>
              <SearchInput />
             </CardContent>
           </Card>

           <Card>
             <CardHeader>
               <CardTitle>Add New Product</CardTitle>
             </CardHeader>
             <CardContent>
              <ProductInputForm />
             </CardContent>
           </Card>
        </div>

        {/* Right Column: Search Results */}
        <div className="md:col-span-2">
           <Card>
             <CardHeader>
               <CardTitle>Search Results</CardTitle>
             </CardHeader>
             <CardContent>
               <SearchResults />
             </CardContent>
           </Card>
        </div>
      </main>

      <footer className="mt-12 pt-4 border-t text-center text-muted-foreground text-sm">
        Product Finder &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
