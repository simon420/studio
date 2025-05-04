'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { useProductStore } from '@/store/product-store';
import { Search } from 'lucide-react';

export default function SearchInput() {
  const searchTerm = useProductStore((state) => state.searchTerm);
  const setSearchTerm = useProductStore((state) => state.setSearchTerm);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="relative">
       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
       <Input
         type="search"
         placeholder="Search by name or code..."
         value={searchTerm}
         onChange={handleInputChange}
         className="pl-10 w-full" // Add padding for the icon
       />
    </div>
  );
}
