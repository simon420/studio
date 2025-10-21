
'use client';

import * as React from 'react';
import { useAdminStore } from '@/store/admin-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, UserX, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';

export default function AdminRequests() {
  const {
    requests,
    isLoading,
    fetchRequests,
    approveAdminRequest,
    declineAdminRequest,
  } = useAdminStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string, email: string, password?: string) => {
    if (!password) {
        toast({
            title: 'Approvazione Fallita',
            description: 'Impossibile creare l\'utente senza una password.',
            variant: 'destructive',
        });
        return;
    }
    setProcessingId(requestId);
    try {
      await approveAdminRequest(requestId, email, password);
      toast({
        title: 'Richiesta Approvata',
        description: `L'utente ${email} è ora un amministratore.`,
      });
    } catch (error: any) {
      console.error('Errore approvazione richiesta:', error);
      toast({
        title: 'Approvazione Fallita',
        description: error.message || 'Impossibile approvare la richiesta.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string, email: string) => {
    setProcessingId(requestId);
    try {
      await declineAdminRequest(requestId);
      toast({
        title: 'Richiesta Rifiutata',
        description: `La richiesta di ${email} è stata rifiutata.`,
        variant: 'destructive',
      });
    } catch (error: any) {
      console.error('Errore rifiuto richiesta:', error);
      toast({
        title: 'Rifiuto Fallito',
        description: error.message || 'Impossibile rifiutare la richiesta.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-[150px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Caricamento richieste...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[260px] rounded-md border">
        <Table>
            <TableCaption>
                {requests.length > 0 ? `${requests.length} richiesta(e) in attesa.` : 'Nessuna richiesta di amministrazione in attesa.'}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Data Richiesta</TableHead>
                <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {requests.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Users className="h-8 w-8" />
                            <span>Nessuna nuova richiesta di registrazione.</span>
                        </div>
                    </TableCell>
                </TableRow>
                ) : (
                requests.map((request) => (
                    <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.email}</TableCell>
                    <TableCell>
                        {request.requestedAt?.toDate ? formatDistanceToNow(request.requestedAt.toDate(), { addSuffix: true, locale: it }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id, request.email, request.password)}
                            disabled={!!processingId}
                            aria-label="Approva Richiesta"
                        >
                            {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Approva</span>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDecline(request.id, request.email)}
                            disabled={!!processingId}
                            aria-label="Rifiuta Richiesta"
                        >
                            {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                             <span className="ml-2 hidden sm:inline">Rifiuta</span>
                        </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
        </Table>
    </ScrollArea>
  );
}
