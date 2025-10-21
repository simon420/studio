'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { useProductStore } from '@/store/product-store';
import { useAuthStore } from '@/store/auth-store'; // Import auth store
import { Search } from 'lucide-react';

export default function SearchInput() {
  const searchTerm = useProductStore((state) => state.searchTerm);
  const setSearchTerm = useProductStore((state) => state.setSearchTerm);
  const { isAuthenticated } = useAuthStore(); // Get authentication status

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Disable input if user is not authenticated
  const isDisabled = !isAuthenticated;

  return (
    <div className="relative">
       <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
       <Input
         type="search"
         placeholder={isDisabled ? "Accedi per cercare..." : "Cerca per nome o codice..."}
         value={searchTerm}
         onChange={handleInputChange}
         className="pl-10 w-full" // Add padding for the icon
         disabled={isDisabled} // Disable input if not authenticated
       />
    </div>
  );
}
