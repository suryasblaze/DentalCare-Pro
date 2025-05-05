import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Import the updated service function and the new type
import { getInvoices, getInvoiceDownloadUrl, InvoiceWithItemName } from '../services/invoiceService';
// No longer need Database type directly here
// import { Database } from '../../../../supabase_types';

// No longer need InvoiceRow type directly here
// type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

const InvoicesList: React.FC = () => {
  // Update state to use the new type that includes item name
  const [invoices, setInvoices] = useState<InvoiceWithItemName[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingUrlItemId, setLoadingUrlItemId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInvoices();
        if (Array.isArray(data)) {
             // Set state with the fetched data (now matching InvoiceRow[])
             setInvoices(data);
        } else {
             console.warn("Fetched invoices data is not an array:", data);
             setInvoices([]); // Set empty array if data is unexpected
        }
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        toast({
          title: 'Error Fetching Invoices',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [toast]);

  // Update parameter type to InvoiceWithItemName
  const handleDownloadClick = async (invoice: InvoiceWithItemName) => {
    setLoadingUrlItemId(invoice.id);
    try {
      const url = await getInvoiceDownloadUrl(invoice.storage_path);
      // Open the URL in a new tab to trigger download/viewing
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to get download URL:", err);
      toast({
        title: 'Error Getting Download Link',
        description: err instanceof Error ? err.message : 'Could not generate link.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUrlItemId(null); // Clear loading state
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (invoices.length === 0) {
    return <p className="text-center text-gray-500 mt-4">No invoices found.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            {/* Add new column header */}
            <TableHead>Related Item</TableHead>
            <TableHead>Uploaded At</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-medium">{invoice.file_name}</TableCell>
              {/* Display related item name or 'N/A' */}
              <TableCell>{invoice.inventory_items?.item_name ?? <span className="text-xs text-muted-foreground">N/A</span>}</TableCell>
              <TableCell>{new Date(invoice.uploaded_at).toLocaleString()}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{invoice.uploaded_by_user_id ? 'User ID: ...' + invoice.uploaded_by_user_id.slice(-6) : 'Unknown'}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownloadClick(invoice)} // Same handler as download
                  disabled={loadingUrlItemId === invoice.id}
                  title="View Invoice"
                >
                  {loadingUrlItemId === invoice.id ? (
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                     <Eye className="h-4 w-4" /> // Use Eye icon
                  )}
                </Button>
                {/* Download Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownloadClick(invoice)}
                  disabled={loadingUrlItemId === invoice.id} // Disable button while its URL is loading
                  title="Download/View Invoice"
                >
                  {loadingUrlItemId === invoice.id ? (
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                     <Download className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default InvoicesList;
