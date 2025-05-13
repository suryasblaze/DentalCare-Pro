import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getUrgentPurchaseById } from '../services/urgentPurchaseService';
import { UrgentPurchase, UrgentPurchaseItem } from '../types';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';

const UrgentPurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [purchase, setPurchase] = useState<(UrgentPurchase & { items: UrgentPurchaseItem[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const fetchPurchaseDetails = async () => {
      if (!id || !UUID_REGEX.test(id)) {
        setError("Invalid or no purchase ID provided.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await getUrgentPurchaseById(id);
        if (data) {
          setPurchase(data);
        } else {
          setError("Urgent purchase entry not found.");
          toast({ variant: "destructive", title: "Not Found", description: `Urgent purchase with ID ${id} not found.` });
        }
      } catch (err: any) {
        setError("Failed to load purchase details.");
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || "Could not load urgent purchase details.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPurchaseDetails();
  }, [id, toast]);

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Auto-Confirmed':
      case 'Manually Confirmed':
        return "default";
      case 'Pending Review':
        return "secondary";
      case 'Rejected':
      case 'ProcessingError':
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center text-destructive">
        <p>{error}</p>
        <Button variant="link" asChild className="mt-4">
          <Link to="/purchases/urgent"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Log</Link>
        </Button>
      </div>
    );
  }

  if (!purchase) {
    // Should be covered by error state, but as a fallback
    return <div className="container mx-auto p-4 text-center">Urgent purchase not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        heading={`Urgent Purchase Details`}
        text={purchase.requested_at ? `Details for entry created on ${format(new Date(purchase.requested_at), 'PPp')}` : 'Details for entry'}
      >
         <Button variant="outline" asChild>
           <Link to="/purchases/urgent"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Log</Link>
         </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><strong>ID:</strong> {purchase.id}</div>
          <div><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(purchase.status)}>{purchase.status}</Badge></div>
          <div><strong>Invoice/Delivery Date:</strong> {purchase.invoice_delivery_date ? format(new Date(purchase.invoice_delivery_date), 'PP') : 'N/A'}</div>
          <div><strong>Slip Filename:</strong> {purchase.slip_filename || 'N/A'}</div>
          <div>
            <strong>OCR Confidence:</strong> 
            {purchase.confidence_score !== null && purchase.confidence_score !== undefined 
              ? ` ${ (purchase.confidence_score * 100).toFixed(0)}%` 
              : ' N/A'}
          </div>
           <div><strong>Requested By:</strong> {purchase.requested_by_user_id || 'Unknown'}</div>
           <div className="md:col-span-3"><strong>Notes:</strong> {purchase.notes || 'N/A'}</div>
           {/* TODO: Add link to download slip if purchase.slip_image_path exists */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items Received</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matched Item</TableHead>
                <TableHead>Slip Text</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Batch No.</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No items found for this entry.
                  </TableCell>
                </TableRow>
              ) : (
                purchase.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.matched_item_name}</TableCell>
                    <TableCell>{item.slip_text || 'N/A'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.batch_number || 'N/A'}</TableCell>
                    <TableCell>{item.expiry_date ? format(new Date(item.expiry_date), 'PP') : 'N/A'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UrgentPurchaseDetailPage;
