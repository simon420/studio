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
import { Loader2, Trash2, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { useAuthStore } from '@/store/auth-store';

export default function UserManagement() {
  // The store now handles listening for users in real-time.
  // The component just displays the data from the store.
  const { users, isLoading, error, deleteUser } = useUserManagementStore();
  const { uid: currentSuperAdminUid } = useAuthStore(); // Get current super-admin's UID
  const { toast } = useToast();
  
  const [userToDelete, setUserToDelete] = React.useState<ClientUser | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // No more useEffect to fetch users here. The store manages the real-time listener.

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

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.uid);
      toast({
        title: 'Utente Eliminato',
        description: `L'utente ${userToDelete.email} è stato eliminato con successo.`,
      });
      setUserToDelete(null);
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
            {users.length > 0 ? `Mostrando ${users.length} utenti nel sistema.` : 'Nessun utente trovato.'}
          </TableCaption>
          <TableHeader className="sticky top-0 bg-secondary z-10">
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>UID</TableHead>
              <TableHead>Creato il</TableHead>
              <TableHead className="text-center">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <span>Nessun utente registrato nel sistema.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                     <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                       {user.role}
                     </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline">{user.uid}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('it-IT') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(user)}
                      disabled={isDeleting || user.uid === currentSuperAdminUid}
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
      </ScrollArea>

      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione è irreversibile. Eliminerà permanentemente l'utente <span className="font-bold">{userToDelete.email}</span> e tutti i suoi dati associati da Firebase Authentication e Firestore.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Elimina Definitivamente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
