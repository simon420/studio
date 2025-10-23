
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
import { Loader2, UserCheck, UserX, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { ScrollArea } from './ui/scroll-area';
import type { AdminRequest } from '@/lib/types';

const ITEMS_PER_PAGE = 10;

export default function AdminRequests() {
  const {
    pendingRequests,
    isLoading,
    approveAdminRequest,
    declineAdminRequest,
    sortKey,
    sortDirection,
    setSortKey,
  } = useAdminStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  // The listener is now handled in the store, so this component just displays the data.

  const handleApprove = async (requestId: string, email: string | null) => {
    setProcessingId(requestId);
    try {
      await approveAdminRequest(requestId);
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

  const handleDecline = async (requestId: string, email: string | null) => {
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

  const handleSort = (key: keyof AdminRequest) => {
    setSortKey(key);
    setCurrentPage(1);
  };

  const renderSortArrow = (key: keyof AdminRequest) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const totalPages = Math.ceil(pendingRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = pendingRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  if (isLoading && pendingRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-[150px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">In attesa di richieste...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
    <ScrollArea className="h-[260px] rounded-md border">
        <div className="overflow-x-auto">
            <Table>
                <TableCaption>
                    {pendingRequests.length > 0 ? `Mostrando ${paginatedRequests.length} di ${pendingRequests.length} richiesta(e).` : 'Nessuna richiesta di amministrazione in attesa.'}
                </TableCaption>
                <TableHeader className="sticky top-0 bg-secondary z-10">
                    <TableRow>
                    <TableHead style={{width: '300px'}}>
                        <Button variant="ghost" onClick={() => handleSort('email')}>
                            Email {renderSortArrow('email')}
                        </Button>
                    </TableHead>
                    <TableHead style={{width: '300px'}}>
                        <Button variant="ghost" onClick={() => handleSort('requestedAt')}>
                            Data Richiesta {renderSortArrow('requestedAt')}
                        </Button>
                    </TableHead>
                    <TableHead style={{width: '300px'}} className="text-center">Azioni</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedRequests.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <Users className="h-8 w-8" />
                                <span>Nessuna nuova richiesta di registrazione.</span>
                            </div>
                        </TableCell>
                    </TableRow>
                    ) : (
                    paginatedRequests.map((request) => (
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
                                onClick={() => handleApprove(request.id, request.email)}
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
        </div>
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
    </div>
  );
}

    