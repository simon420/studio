
// src/components/user-management.tsx
'use client';

import * as React from 'react';
import { useUserManagementStore, ClientUser } from '@/store/user-management-store';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Users, AlertTriangle, Recycle, Trash, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from './ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { Timestamp } from 'firebase/firestore';

const ITEMS_PER_PAGE = 10;

type DeletionAction = 'delete' | 'reassign';

export default function UserManagement() {
  const { users, isLoading, error, deleteAdminUserAndManageProducts, deleteUser, revokeUserSession, sortKey, sortDirection, setSortKey } = useUserManagementStore();
  const { uid: currentSuperAdminUid } = useAuthStore();
  const { toast } = useToast();
  
  const [userToDelete, setUserToDelete] = React.useState<ClientUser | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  
  const openDeleteDialog = (user: ClientUser) => {
    if (user.uid === currentSuperAdminUid) {
      toast({
        title: 'Azione non permessa',
        description: 'Non puoi eliminare il tuo stesso account.',
        variant: 'destructive',
      });
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDeletion = async (action: DeletionAction | 'delete-user-only') => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      if (userToDelete.role === 'admin') {
        // First, revoke session to force logout
        await revokeUserSession(userToDelete.uid);
        // Then, manage products and delete user
        await deleteAdminUserAndManageProducts(userToDelete.uid, action as DeletionAction);
      } else {
         // First, revoke session to force logout
        await revokeUserSession(userToDelete.uid);
        // Then delete the user
        await deleteUser(userToDelete.uid);
      }
      
      toast({
        title: 'Utente Eliminato',
        description: `L'utente ${userToDelete.email} è stato eliminato con successo.`,
      });
      setUserToDelete(null); // Close dialog on success
    } catch (error: any) {
      console.error("Errore eliminazione utente:", error);
      toast({
        title: 'Eliminazione Fallita',
        description: error.message || 'Impossibile eliminare l\'utente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (key: keyof ClientUser) => {
    setSortKey(key);
    setCurrentPage(1);
  };

  const renderSortArrow = (key: keyof ClientUser) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const sortedUsers = React.useMemo(() => {
    const sorted = [...users];
    if (sortKey) {
      sorted.sort((a, b) => {
        let aValue = a[sortKey];
        let bValue = b[sortKey];

        // Handle Firestore Timestamps
        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            aValue = aValue.toMillis();
            bValue = bValue.toMillis();
        }

        let comparison = 0;
        if (aValue! > bValue!) {
          comparison = 1;
        } else if (aValue! < bValue!) {
          comparison = -1;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    return sorted;
  }, [users, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const renderDialogContent = () => {
    if (!userToDelete) return null;

    if (userToDelete.role === 'admin') {
      return (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gestisci Prodotti per {userToDelete.email}</AlertDialogTitle>
            <AlertDialogDescription>
              Questo utente è un admin. Cosa vuoi fare con i prodotti che ha aggiunto?
              Questa azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Scegliendo di riassegnare, i prodotti diventeranno di tua proprietà. Scegliendo di eliminare,
            sia l'utente che tutti i suoi prodotti verranno rimossi permanentemente.
          </div>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleConfirmDeletion('reassign')}
              disabled={isDeleting}
              className="whitespace-nowrap"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Recycle className="mr-2" />}
              Riassegna Prodotti
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleConfirmDeletion('delete')}
              disabled={isDeleting}
              className="whitespace-nowrap"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2"/>}
              Elimina Tutto
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      );
    }

    // Default dialog for 'user' role
    return (
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
          <AlertDialogDescription>
            Questa azione è irreversibile. Eliminerà permanentemente l'utente <span className="font-bold">{userToDelete.email}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleConfirmDeletion('delete-user-only')}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina Definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    );
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">In attesa degli utenti...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-destructive">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Errore nel Caricamento degli Utenti</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
        <TableCaption>
            {sortedUsers.length > 0 ? `Mostrando ${paginatedUsers.length} di ${sortedUsers.length} utenti.` : 'Nessun utente trovato.'}
        </TableCaption>
        <TableHeader className="sticky top-0 bg-secondary z-10">
            <TableRow>
            <TableHead style={{width: '300px'}}>
                <Button variant="ghost" onClick={() => handleSort('email')}>Email {renderSortArrow('email')}</Button>
            </TableHead>
            <TableHead style={{width: '300px'}}>
                <Button variant="ghost" onClick={() => handleSort('role')}>Ruolo {renderSortArrow('role')}</Button>
            </TableHead>
            <TableHead style={{width: '300px'}}>
                <Button variant="ghost" onClick={() => handleSort('uid')}>UID {renderSortArrow('uid')}</Button>
            </TableHead>
            <TableHead style={{width: '300px'}}>
                <Button variant="ghost" onClick={() => handleSort('createdAt')}>Creato il {renderSortArrow('createdAt')}</Button>
            </TableHead>
            <TableHead style={{width: '300px'}} className="text-center">Azioni</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {paginatedUsers.length === 0 ? (
            <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <span>Nessun utente registrato nel sistema.</span>
                </div>
                </TableCell>
            </TableRow>
            ) : (
            paginatedUsers.map((user) => (
                <TableRow key={user.uid}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                    <Badge variant={
                        user.role === 'super-admin' ? 'destructive' :
                        user.role === 'admin' ? 'default' : 'secondary'
                    }>
                    {user.role}
                    </Badge>
                </TableCell>
                <TableCell>
                    <Badge variant="outline">{user.uid}</Badge>
                </TableCell>
                <TableCell>
                    {user.createdAt instanceof Timestamp ? user.createdAt.toDate().toLocaleDateString('it-IT') : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                    <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(user)}
                    disabled={isDeleting || user.role === 'super-admin'}
                    aria-label="Elimina utente"
                    >
                    {isDeleting && userToDelete?.uid === user.uid ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                    </Button>
                </TableCell>
                </TableRow>
            ))
            )}
        </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Precedente
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage} di {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Successivo
          </Button>
        </div>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        {renderDialogContent()}
      </AlertDialog>
    </div>
  );
}
